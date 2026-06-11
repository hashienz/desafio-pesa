using System;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace API.Services
{
    public interface ICnpjPublicDataService
    {
        Task<CnpjEnrichmentResult> EnrichAsync(string cnpj);
    }

    public class CnpjEnrichmentResult
    {
        public string? CorporateName { get; set; }
        public bool? HasEsgCertification { get; set; }
        public bool? HasIncompleteFiscalDocs { get; set; }
        public bool? HasJudicialOrLaborProcess { get; set; }
        public bool? HasPositiveInternalHistory { get; set; }

        // Onde encontramos/enfileiramos informações (para transparência no AiSummary)
        public string[] TriedSources { get; set; } = Array.Empty<string>();
        public string[] SuccessfulSources { get; set; } = Array.Empty<string>();

        public string SourceSummary { get; set; } = string.Empty;
    }


    /// <summary>
    /// Integração apenas via HTTP em bases públicas. Como nem todas as bases
    /// fornecem APIs abertas e estáveis, este serviço usa tentativa e mapeamento.
    /// Sempre retorna um resultado (com nulls quando não conseguir).
    /// </summary>
    public class CnpjPublicDataService : ICnpjPublicDataService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;

        public CnpjPublicDataService(HttpClient httpClient, IConfiguration config)
        {
            _httpClient = httpClient;
            _config = config;
        }

        public async Task<CnpjEnrichmentResult> EnrichAsync(string cnpj)
        {
            cnpj = NormalizeCnpj(cnpj);

            var result = new CnpjEnrichmentResult();

            // Estratégia: testar várias URLs (fontes) em sequência até encontrar uma que retorne algo parseável.
            // Ajustável por env var para facilitar tuning.
            var timeoutMs = GetIntEnv("CNPJ_PUBLIC_TIMEOUT_MS", 8000);
            var maxAttempts = GetIntEnv("CNPJ_PUBLIC_MAX_ATTEMPTS", 6);

            // Lista de URLs a testar. Env vars podem sobrescrever.
            // Obs.: {cnpj} é substituído pelo CNPJ normalizado.
            var candidates = new System.Collections.Generic.List<string>();

            // Fontes “governo” (quando disponíveis por endpoint público) — não há contrato único.
            // Mantemos como tentativa e, se falhar, segue.
            // Observação: alguns portais podem retornar HTML; o parser ignora se não for JSON.
            candidates.Add(GetStringEnv(
                "GOV_BASE_URL_1",
                "https://www.portaldatransparencia.gov.br/") + "?cnpj=" + cnpj);

            candidates.Add(GetStringEnv(
                "GOV_BASE_URL_2",
                "https://certidoes.cgu.gov.br/" ) + "?cnpj=" + cnpj);

            // Fontes abertas de terceiros (fallback) — aumentam chance de achar algum JSON.
            var baseUrl = GetStringEnv("CNPJ_PUBLIC_BASE_URL", "https://cnpj.info");
            candidates.Add($"{baseUrl.TrimEnd('/')}/{cnpj}");

            candidates.Add(GetStringEnv("CNPJ_PUBLIC_ALT_URL_1",
                "https://www.receitaws.com.br/api/cnpj/{cnpj}").Replace("{cnpj}", cnpj));

            candidates.Add(GetStringEnv("CNPJ_PUBLIC_ALT_URL_2",
                "https://api.allorigins.win/raw?url=https://www.receitaws.com.br/api/cnpj/{cnpj}")
                .Replace("{cnpj}", cnpj));

            // Tentativas extras (variantes) para aumentar chance de resposta.
            candidates.Add($"https://www.receitaws.com.br/api/cnpj/{cnpj}");
            candidates.Add($"https://www.receitaws.com.br/api/cnpj/{cnpj}?token=public");

            // Remover duplicadas preservando ordem.
            candidates = candidates.Distinct(System.StringComparer.OrdinalIgnoreCase).ToList();


            int attempt = 0;
            foreach (var urlToCall in candidates)
            {
                if (attempt >= maxAttempts) break;
                attempt++;

                try
                {
                    using var cts = new System.Threading.CancellationTokenSource(timeoutMs);
                    result.TriedSources = AddTriedSource(result.TriedSources, urlToCall);

                    var resp = await _httpClient.GetAsync(urlToCall, cts.Token);
                    if (!resp.IsSuccessStatusCode) continue;

                    result.SuccessfulSources = AddSuccessfulSource(result.SuccessfulSources, urlToCall);

                    var raw = await resp.Content.ReadAsStringAsync(cts.Token);

                    // Se conseguiu JSON, tenta extrair nome/indicadores. Se não, segue.
                    bool applied = TryParseAndApply(result, raw, urlToCall);
                    if (applied)
                    {
                        // Já achamos alguma coisa relevante; podemos parar cedo.
                        break;
                    }
                }
                catch
                {
                    // ignore e continua tentando outras fontes
                }
            }

            // Para HasJudicialOrLaborProcess e ESG: sem indicadores confiáveis “padronizados” sem API específica.
            // Mantemos como null quando não houver sinal.

            return result;
        }

        private static string NormalizeCnpj(string cnpj)
        {
            if (string.IsNullOrWhiteSpace(cnpj)) return string.Empty;
            var digits = new char[cnpj.Length];
            int j = 0;
            foreach (var ch in cnpj)
            {
                if (char.IsDigit(ch)) digits[j++] = ch;
            }
            return new string(digits, 0, j);
        }

        private bool TryGetString(JsonElement root, string propertyName, out string value)
        {
            value = string.Empty;
            if (root.ValueKind != JsonValueKind.Object) return false;
            if (!root.TryGetProperty(propertyName, out var prop)) return false;
            if (prop.ValueKind == JsonValueKind.String)
            {
                value = prop.GetString() ?? string.Empty;
                return !string.IsNullOrWhiteSpace(value);
            }
            return false;
        }

        private void TryApplyCadastralHeuristics(CnpjEnrichmentResult result, string raw)
        {
            try
            {
                using var doc = JsonDocument.Parse(raw);
                var root = doc.RootElement;

                if (TryGetString(root, "situacao", out var situacao) ||
                    TryGetString(root, "status", out situacao))
                {
                    var s = situacao.ToLowerInvariant();

                    // heurística conservadora
                    if (s.Contains("inapta") || s.Contains("baixada") || s.Contains("suspensa") || s.Contains("nula"))
                    {
                        result.HasIncompleteFiscalDocs = true;
                        result.HasPositiveInternalHistory = false;
                        AppendSource(result, "Situação cadastral indica irregularidade (heurística).", true);
                    }
                    else if (s.Contains("ativa"))
                    {
                        result.HasIncompleteFiscalDocs = false;
                        result.HasPositiveInternalHistory = true;
                        AppendSource(result, "Situação cadastral indica regularidade (heurística).", true);
                    }
                }
            }
            catch
            {
                // ignora: raw não era JSON esperado
            }
        }

        private bool TryParseAndApply(CnpjEnrichmentResult result, string raw, string urlToCall)
        {
            bool applied = false;

            try
            {
                using var doc = JsonDocument.Parse(raw);
                var root = doc.RootElement;

                // Tentar nome (varia por fonte)
                if (string.IsNullOrWhiteSpace(result.CorporateName))
                {
                    if (TryGetString(root, "razao_social", out var razaoSocial))
                    {
                        result.CorporateName = razaoSocial;
                        applied = true;
                    }
                    else if (TryGetString(root, "nome", out var nome))
                    {
                        result.CorporateName = nome;
                        applied = true;
                    }
                }

                // Tentar heurísticas cadastrais
                var beforeInc = result.HasIncompleteFiscalDocs;
                var beforeHist = result.HasPositiveInternalHistory;

                TryApplyCadastralHeuristics(result, raw);

                if (result.HasIncompleteFiscalDocs != beforeInc || result.HasPositiveInternalHistory != beforeHist)
                    applied = true;

                if (applied && string.IsNullOrWhiteSpace(result.SourceSummary))
                    result.SourceSummary = $"Dados aplicados a partir de fonte pública ({urlToCall}).";
            }
            catch
            {
                // não era JSON
            }

            return applied;
        }

        private void AppendSource(CnpjEnrichmentResult result, string message, bool preferAppend)

        {
            if (preferAppend)
            {
                if (!string.IsNullOrWhiteSpace(result.SourceSummary))
                    result.SourceSummary += " " + message;
                else
                    result.SourceSummary = message;
            }
        }

        private static string[] AddTriedSource(string[] current, string source)
        {
            if (string.IsNullOrWhiteSpace(source)) return current;
            if (current != null && Array.Exists(current, x => string.Equals(x, source, StringComparison.OrdinalIgnoreCase)))
                return current;
            var list = current?.ToList() ?? new System.Collections.Generic.List<string>();
            list.Add(source);
            return list.ToArray();
        }

        private static string[] AddSuccessfulSource(string[] current, string source)
        {
            if (string.IsNullOrWhiteSpace(source)) return current;
            if (current != null && Array.Exists(current, x => string.Equals(x, source, StringComparison.OrdinalIgnoreCase)))
                return current;
            var list = current?.ToList() ?? new System.Collections.Generic.List<string>();
            list.Add(source);
            return list.ToArray();
        }



        private int GetIntEnv(string key, int fallback)
        {
            var v = _config[key] ?? Environment.GetEnvironmentVariable(key);
            return int.TryParse(v, out var i) ? i : fallback;
        }

        private string GetStringEnv(string key, string fallback)
        {
            var v = _config[key] ?? Environment.GetEnvironmentVariable(key);
            return string.IsNullOrWhiteSpace(v) ? fallback : v;
        }
    }
}

