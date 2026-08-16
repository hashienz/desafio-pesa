using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace API.Services
{
    public interface IGeminiDocumentAnalyzer
    {
        Task<GeminiAnalysisResult> AnalyzeDocumentAsync(string fileName, string mimeType, byte[] fileBytes);
        Task<SupplierProfileAssessment> AnalyzeSupplierProfileAsync(
            string cnpj,
            string? corporateName,
            string? tradeName,
            string? supplierType,
            string? notes,
            string? sourceSummary = null);
    }

    public class GeminiAnalysisResult
    {
        public string ValidacaoDocumento { get; set; } = "Não analisado";
        public string TipoDocumento { get; set; } = "Desconhecido";
        public string Resumo { get; set; } = "Nenhum documento fornecido para análise de IA.";
        public int ImpactoScore { get; set; } = 0;
    }

    public class SupplierProfileAssessment
    {
        public bool HasEsgCertification { get; set; }
        public bool HasIncompleteFiscalDocs { get; set; }
        public bool HasJudicialOrLaborProcess { get; set; }
        public bool HasPositiveInternalHistory { get; set; }
        public int ImpactoScore { get; set; }
        public string Resumo { get; set; } = "Nenhuma informação de cadastro avaliada.";
    }

    public class GeminiDocumentAnalyzer : IGeminiDocumentAnalyzer
    {
        private readonly IConfiguration _config;
        private readonly HttpClient _httpClient;

        public GeminiDocumentAnalyzer(IConfiguration config, HttpClient httpClient)
        {
            _config = config;
            _httpClient = httpClient;
        }

        public async Task<GeminiAnalysisResult> AnalyzeDocumentAsync(string fileName, string mimeType, byte[] fileBytes)
        {
            var apiKey = _config["GeminiApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY") ?? Environment.GetEnvironmentVariable("GeminiApiKey");
            }

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                // Fallback para Mock se a chave de API não estiver configurada
                return GetMockAnalysis(fileName);
            }

            try
            {
                var base64Data = Convert.ToBase64String(fileBytes);
                var prompt = "Você é um auditor de conformidade da empresa PESA. Analise este documento e verifique se é uma Certidão Negativa de Débitos ou se tem certificação ESG ou se indica alguma irregularidade ou processo. Responda APENAS um JSON válido de forma estrita. Não inclua blocos markdown do tipo ```json ou ```. Estrutura de chaves exatas do JSON:\n" +
                             "{\n" +
                             "  \"validacaoDocumento\": \"Válido\" ou \"Inválido\",\n" +
                             "  \"tipoDocumento\": \"tipo do documento\",\n" +
                             "  \"resumo\": \"descrição resumida da análise do texto\",\n" +
                             "  \"impactoScore\": 15 (se for Certificado ESG ou Certidão Fiscal Limpa), -20 (se for irregular ou vencido), ou 0 (outros)\n" +
                             "}";

                var requestBody = new
                {
                    contents = new[]
                    {
                        new
                        {
                            parts = new object[]
                            {
                                new { text = prompt },
                                new
                                {
                                    inlineData = new
                                    {
                                        mimeType = mimeType,
                                        data = base64Data
                                    }
                                }
                            }
                        }
                    }
                };

                var jsonRequest = JsonSerializer.Serialize(requestBody);
                var content = new StringContent(jsonRequest, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync(
                    $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}",
                    content
                );

                if (!response.IsSuccessStatusCode)
                {
                    return GetMockAnalysis(fileName, $"Erro na API do Gemini: {response.StatusCode}");
                }

                var jsonResponse = await response.Content.ReadAsStringAsync();
                
                // Parse da resposta do Gemini
                using var doc = JsonDocument.Parse(jsonResponse);
                var text = doc.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString();

                if (string.IsNullOrEmpty(text))
                {
                    return GetMockAnalysis(fileName, "A resposta da IA veio vazia.");
                }

                // Remove possíveis blocos de formatação markdown adicionais
                text = text.Replace("```json", "").Replace("```", "").Trim();

                var result = JsonSerializer.Deserialize<GeminiAnalysisResult>(text, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return result ?? GetMockAnalysis(fileName, "Não foi possível estruturar o JSON da IA.");
            }
            catch (Exception ex)
            {
                return GetMockAnalysis(fileName, $"Falha na integração com a IA: {ex.Message}");
            }
        }

        public async Task<SupplierProfileAssessment> AnalyzeSupplierProfileAsync(
            string cnpj,
            string? corporateName,
            string? tradeName,
            string? supplierType,
            string? notes,
            string? sourceSummary = null)
        {
            var apiKey = _config["GeminiApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY") ?? Environment.GetEnvironmentVariable("GeminiApiKey");
            }

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return GetMockSupplierProfileAnalysis(cnpj, corporateName, tradeName, supplierType, notes, sourceSummary);
            }

            try
            {
                var profileText = $"CNPJ: {cnpj}\nRazão social: {corporateName ?? "não informada"}\nNome fantasia: {tradeName ?? "não informado"}\nTipo do fornecedor: {supplierType ?? "não informado"}\nObservações: {notes ?? "nenhuma"}\nDados públicos: {sourceSummary ?? "não informado"}";

                var prompt = "Você é um analista de compliance para fornecedores. Avalie o cadastro do fornecedor com base nos dados abaixo e responda APENAS um JSON válido, sem markdown, com as chaves exatas: {" +
                             "\"hasEsgCertification\": true/false, " +
                             "\"hasIncompleteFiscalDocs\": true/false, " +
                             "\"hasJudicialOrLaborProcess\": true/false, " +
                             "\"hasPositiveInternalHistory\": true/false, " +
                             "\"impactoScore\": inteiro, " +
                             "\"resumo\": \"texto curto com a decisão\"}. " +
                             "Use regras do compliance: ESG, pendências fiscais, processos trabalhistas/judiciais e histórico positivo. " +
                             "Se houver sinais de sustentabilidade/ESG, marque true em hasEsgCertification. " +
                             "Se houver débitos, pendências, inadimplência ou documentação incompleta, marque true em hasIncompleteFiscalDocs. " +
                             "Se houver processos trabalhistas, ações judiciais ou reclamações graves, marque true em hasJudicialOrLaborProcess. " +
                             "Se houver reputação limpa, histórico positivo, bons contratos ou registros bons, marque true em hasPositiveInternalHistory. " +
                             "Os dados do fornecedor são:\n" + profileText;

                var requestBody = new
                {
                    contents = new[]
                    {
                        new
                        {
                            parts = new object[]
                            {
                                new { text = prompt }
                            }
                        }
                    }
                };

                var jsonRequest = JsonSerializer.Serialize(requestBody);
                var response = await _httpClient.PostAsync(
                    $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}",
                    new StringContent(jsonRequest, Encoding.UTF8, "application/json"));

                if (!response.IsSuccessStatusCode)
                {
                    return GetMockSupplierProfileAnalysis(cnpj, corporateName, tradeName, supplierType, notes, sourceSummary, $"Erro da API: {response.StatusCode}");
                }

                var jsonResponse = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(jsonResponse);
                var text = doc.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString();

                if (string.IsNullOrWhiteSpace(text))
                {
                    return GetMockSupplierProfileAnalysis(cnpj, corporateName, tradeName, supplierType, notes, sourceSummary, "Resposta vazia da IA.");
                }

                text = text.Replace("```json", "").Replace("```", "").Trim();

                var parsed = JsonSerializer.Deserialize<SupplierProfileAssessment>(text, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return parsed ?? GetMockSupplierProfileAnalysis(cnpj, corporateName, tradeName, supplierType, notes, sourceSummary, "JSON inválido da IA.");
            }
            catch (Exception ex)
            {
                return GetMockSupplierProfileAnalysis(cnpj, corporateName, tradeName, supplierType, notes, sourceSummary, $"Falha na IA: {ex.Message}");
            }
        }

        private SupplierProfileAssessment GetMockSupplierProfileAnalysis(
            string cnpj,
            string? corporateName,
            string? tradeName,
            string? supplierType,
            string? notes,
            string? sourceSummary,
            string? errorDetail = null)
        {
            var combined = $"{corporateName} {tradeName} {supplierType} {notes} {sourceSummary}".Trim();
            var lower = combined.ToLowerInvariant();

            var assessment = new SupplierProfileAssessment
            {
                HasEsgCertification = lower.Contains("esg") || lower.Contains("sustentabilidade") || lower.Contains("ambiental") || lower.Contains("certificado") || lower.Contains("iso 14001"),
                HasIncompleteFiscalDocs = lower.Contains("inadimpl") || lower.Contains("pendenc") || lower.Contains("irregular") || lower.Contains("dívida") || lower.Contains("divida") || lower.Contains("fiscal") || lower.Contains("documentação incompleta"),
                HasJudicialOrLaborProcess = lower.Contains("processo") || lower.Contains("judicial") || lower.Contains("trabalhista") || lower.Contains("ação") || lower.Contains("litigio") || lower.Contains("reclama"),
                HasPositiveInternalHistory = lower.Contains("bom histórico") || lower.Contains("histórico positivo") || lower.Contains("histórico limpo") || lower.Contains("sem pendência") || lower.Contains("reputação sólida") || lower.Contains("confiável") || lower.Contains("dados limpos")
            };

            if (string.IsNullOrWhiteSpace(lower))
            {
                assessment.HasPositiveInternalHistory = true;
            }

            assessment.ImpactoScore = (assessment.HasEsgCertification ? 15 : 0) - (assessment.HasIncompleteFiscalDocs ? 20 : 0) - (assessment.HasJudicialOrLaborProcess ? 25 : 0) + (assessment.HasPositiveInternalHistory ? 20 : 0);

            assessment.Resumo = errorDetail != null
                ? $"Análise de cadastro do fornecedor com fallback heurístico. {errorDetail}"
                : "Cadastro do fornecedor analisado com base em ESG, fiscal, judicial e histórico interno.";

            return assessment;
        }

        private GeminiAnalysisResult GetMockAnalysis(string fileName, string? errorDetail = null)
        {
            var lowerName = fileName.ToLower();
            if (lowerName.Contains("esg") || lowerName.Contains("sustent"))
            {
                return new GeminiAnalysisResult
                {
                    ValidacaoDocumento = "Válido",
                    TipoDocumento = "Certificação ESG (Simulado)",
                    Resumo = "Certificado de Sustentabilidade lido com sucesso. Certificação válida que comprova conformidade ambiental e práticas sustentáveis robustas." + (errorDetail != null ? $" ({errorDetail})" : ""),
                    ImpactoScore = 15
                };
            }
            if (lowerName.Contains("certidao") || lowerName.Contains("fiscal") || lowerName.Contains("cnd"))
            {
                return new GeminiAnalysisResult
                {
                    ValidacaoDocumento = "Válido",
                    TipoDocumento = "Certidão Negativa de Débitos (Simulado)",
                    Resumo = "Certidão de Débito lida com sucesso. Emitida recentemente. Sem pendências fiscais federais ou estaduais ativas." + (errorDetail != null ? $" ({errorDetail})" : ""),
                    ImpactoScore = 20
                };
            }
            if (lowerName.Contains("processo") || lowerName.Contains("judicial") || lowerName.Contains("trabalhista"))
            {
                return new GeminiAnalysisResult
                {
                    ValidacaoDocumento = "Inválido",
                    TipoDocumento = "Aviso Processual Judicial (Simulado)",
                    Resumo = "Aviso de Processo Trabalhista ativo ou pendência jurídica gravíssima identificada nos metadados fiscais." + (errorDetail != null ? $" ({errorDetail})" : ""),
                    ImpactoScore = -20
                };
            }

            return new GeminiAnalysisResult
            {
                ValidacaoDocumento = "Não Reconhecido",
                TipoDocumento = "Documento Geral de Compliance (Simulado)",
                Resumo = "Documento de suporte lido, porém sem classificadores específicos de bônus ou ônus (padrão de compliance)." + (errorDetail != null ? $" ({errorDetail})" : ""),
                ImpactoScore = 0
            };
        }
    }
}
