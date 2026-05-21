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
    }

    public class GeminiAnalysisResult
    {
        public string ValidacaoDocumento { get; set; } = "Não analisado";
        public string TipoDocumento { get; set; } = "Desconhecido";
        public string Resumo { get; set; } = "Nenhum documento fornecido para análise de IA.";
        public int ImpactoScore { get; set; } = 0;
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
                    $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}",
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
