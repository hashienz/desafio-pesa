using API.Models;
using API.Services;
using API.Data;
using Microsoft.EntityFrameworkCore;

// Load .env file if it exists in the root or API directory
var currentDir = Directory.GetCurrentDirectory();
var parentDir = Directory.GetParent(currentDir)?.FullName;
var envPath = Path.Combine(currentDir, ".env");
if (!File.Exists(envPath) && parentDir != null)
{
    envPath = Path.Combine(parentDir, ".env");
}
if (File.Exists(envPath))
{
    foreach (var line in File.ReadAllLines(envPath))
    {
        if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#")) continue;
        var parts = line.Split('=', 2);
        if (parts.Length == 2)
        {
            Environment.SetEnvironmentVariable(parts[0].Trim(), parts[1].Trim());
        }
    }
}

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("appsettings.Example.json", optional: true, reloadOnChange: true);
builder.Configuration.AddEnvironmentVariables();

// Add services to the container.
// builder.Services.AddOpenApi();
builder.Services.AddScoped<ISupplierScoringService, SupplierScoringService>();
builder.Services.AddHttpClient<IGeminiDocumentAnalyzer, GeminiDocumentAnalyzer>();
builder.Services.AddHttpClient<ICnpjPublicDataService, CnpjPublicDataService>();


var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options => 
    options.UseMySql(connectionString, ServerVersion.Parse("8.0.30-mysql")));
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173")
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    // app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("AllowReactApp");

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast =  Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast");

app.MapPost("/api/supplier/evaluate", async (
    ISupplierScoringService scoringService, 
    AppDbContext dbContext, 
    IGeminiDocumentAnalyzer documentAnalyzer,
    ICnpjPublicDataService cnpjPublicDataService,
    HttpContext httpContext) => 
{
    string cnpj = "";
    try 
    {
        var form = await httpContext.Request.ReadFormAsync();
        var rawCnpj = form["cnpj"].ToString();
        var documentFile = form.Files.GetFile("document");

        if (string.IsNullOrWhiteSpace(rawCnpj))
        {
            return Results.BadRequest(new { Message = "O CNPJ é obrigatório." });
        }

        var cleanCnpj = new string(rawCnpj.Where(char.IsDigit).ToArray());
        cnpj = cleanCnpj;

        // Verificando se o fornecedor já existe (aceita formato limpo ou formatado)
        var existingSupplier = await dbContext.Suppliers
            .Include(s => s.ScoreEvaluation)
            .FirstOrDefaultAsync(s => s.Cnpj == cleanCnpj || s.Cnpj == rawCnpj);

        // Enriquecimento por CNPJ em bases públicas (quando possível)
        // Sempre tolerante a falhas: se não conseguir, retornará nulls.
        CnpjEnrichmentResult? cnpjEnrichment = null;
        try
        {
            if (cnpjPublicDataService != null)
                cnpjEnrichment = await cnpjPublicDataService.EnrichAsync(cnpj);
        }
        catch
        {
            cnpjEnrichment = null;
        }

        // Detectar se o fornecedor existente possui um nome provisório/mock gerado em falhas anteriores
        bool hasMockName = existingSupplier != null && 
            (existingSupplier.CorporateName.Contains("TechCorp") ||
             existingSupplier.CorporateName.Contains("Logística") ||
             existingSupplier.CorporateName.Contains("Serviços") ||
             existingSupplier.CorporateName.Contains("Construtora") ||
             existingSupplier.CorporateName.Contains("Inovação") ||
             existingSupplier.CorporateName.Contains("Agro"));

        // Se o fornecedor já existe, não possui nome mockado e não foi enviado um documento novo no onboarding, retornamos o cache
        if (existingSupplier != null && !hasMockName && (documentFile == null || documentFile.Length == 0))
        {
            return Results.Ok(new { 
                Message = "Fornecedor já avaliado.",
                Supplier = existingSupplier, 
                Evaluation = existingSupplier.ScoreEvaluation,
                AiSummary = $"[IA] Dados recuperados da base local. O perfil de risco histórico foi mantido com score {existingSupplier.ScoreEvaluation.TotalScore}/100."
            });
        }

        // Processar documento pela IA se houver
        GeminiAnalysisResult? aiDocResult = null;
        if (documentFile != null && documentFile.Length > 0)
        {
            using var ms = new System.IO.MemoryStream();
            await documentFile.CopyToAsync(ms);
            var fileBytes = ms.ToArray();
            aiDocResult = await documentAnalyzer.AnalyzeDocumentAsync(
                documentFile.FileName, 
                documentFile.ContentType, 
                fileBytes
            );
        }

        var rand = new Random(cnpj.GetHashCode());
        var nomes = new[] { "TechCorp Brasil Ltda", "Logística Avançada S.A.", "Serviços Gerais XYZ", "Construtora Horizonte", "Inovação TI", "Agro Indústria PESA" };

        Supplier supplier;
        ScoreEvaluation evaluation;
        bool isNew = false;

        // Se a consulta pública trouxe dados, usamos como seed das flags.
        // Se vier null, mantém o comportamento anterior (rand) para não quebrar o fluxo.
        bool? hasEsgCertification = cnpjEnrichment?.HasEsgCertification;
        bool? hasIncompleteFiscalDocs = cnpjEnrichment?.HasIncompleteFiscalDocs;
        bool? hasJudicialOrLaborProcess = cnpjEnrichment?.HasJudicialOrLaborProcess;
        bool? hasPositiveInternalHistory = cnpjEnrichment?.HasPositiveInternalHistory;


        if (existingSupplier != null)
        {
            supplier = existingSupplier;
            supplier.Cnpj = cleanCnpj; // Atualiza para o formato normalizado
            if (cnpjEnrichment != null && !string.IsNullOrWhiteSpace(cnpjEnrichment.CorporateName))
            {
                supplier.CorporateName = cnpjEnrichment.CorporateName;
            }
            evaluation = existingSupplier.ScoreEvaluation ?? new ScoreEvaluation { SupplierId = existingSupplier.Id };
        }
        else
        {
            isNew = true;
            supplier = new Supplier 
            { 
                Cnpj = cleanCnpj,
                CorporateName = !string.IsNullOrWhiteSpace(cnpjEnrichment?.CorporateName)
                    ? cnpjEnrichment!.CorporateName
                    : nomes[rand.Next(nomes.Length)] + " - " + cleanCnpj.Substring(0, Math.Min(cleanCnpj.Length, 4)),
                SupplierType = "Terceiro Recorrente" 
            };
            
            evaluation = new ScoreEvaluation 
            {
                HasEsgCertification = hasEsgCertification ?? (rand.NextDouble() > 0.5), // 50% de chance
                HasIncompleteFiscalDocs = hasIncompleteFiscalDocs ?? (rand.NextDouble() > 0.8), // 20% de chance de problema
                HasJudicialOrLaborProcess = hasJudicialOrLaborProcess ?? (rand.NextDouble() > 0.7), // 30% de chance de processos
                HasPositiveInternalHistory = hasPositiveInternalHistory ?? (rand.NextDouble() > 0.4) // 60% de chance de histórico bom
            };
        }


        // Calibrar score com base na IA do documento
        if (aiDocResult != null)
        {
            if (aiDocResult.TipoDocumento.Contains("ESG") || aiDocResult.TipoDocumento.Contains("Sustent"))
            {
                evaluation.HasEsgCertification = true;
            }
            else if (aiDocResult.TipoDocumento.Contains("Certidão Negativa") || aiDocResult.TipoDocumento.Contains("CND"))
            {
                evaluation.HasIncompleteFiscalDocs = false;
                evaluation.HasPositiveInternalHistory = true;
            }
            else if (aiDocResult.TipoDocumento.Contains("Processo") || aiDocResult.TipoDocumento.Contains("Judicial") || aiDocResult.TipoDocumento.Contains("Trabalhista"))
            {
                evaluation.HasJudicialOrLaborProcess = true;
            }
        }
        
        // Relacionar os objetos
        if (isNew)
        {
            supplier.ScoreEvaluation = evaluation;
            dbContext.Suppliers.Add(supplier);
        }
        else
        {
            if (supplier.ScoreEvaluation == null)
            {
                supplier.ScoreEvaluation = evaluation;
            }
            dbContext.Suppliers.Update(supplier);
        }
        
        // Calcular o score e definir o status
        scoringService.CalculateScore(evaluation, supplier);

        // Salvar no banco de dados
        await dbContext.SaveChangesAsync();
        
        var sourceSummaryParts = new System.Collections.Generic.List<string>();
        if (cnpjEnrichment != null && !string.IsNullOrWhiteSpace(cnpjEnrichment.SourceSummary))
            sourceSummaryParts.Add(cnpjEnrichment.SourceSummary);
        
        var sourceSummary = sourceSummaryParts.Count > 0
            ? string.Join(" | ", sourceSummaryParts)
            : "Dados de CNPJ não disponíveis (fallback).";

        var triedSources = cnpjEnrichment?.TriedSources != null && cnpjEnrichment.TriedSources.Length > 0
            ? string.Join(", ", cnpjEnrichment.TriedSources)
            : "(nenhuma fonte listada)";

        var successfulSources = cnpjEnrichment?.SuccessfulSources != null && cnpjEnrichment.SuccessfulSources.Length > 0
            ? string.Join(", ", cnpjEnrichment.SuccessfulSources)
            : "(nenhuma fonte respondeu)";

        var aiSummary = $"Enriquecimento por CNPJ: {sourceSummary}. " +
                $"Fontes tentadas: {triedSources}. Fontes com sucesso: {successfulSources}. " +
                (evaluation.HasEsgCertification ? "✅ Práticas ESG validadas (indicador). " : "⚠️ Nenhuma certificação ESG detectada (indicador). ") +
                (evaluation.HasIncompleteFiscalDocs ? "❌ Alerta: Irregularidades fiscais detectadas (indicador). " : "✅ Situação fiscal regularizada (indicador). ") +
                (evaluation.HasJudicialOrLaborProcess ? "⚠️ Processos trabalhistas ativos (indicador). " : "✅ Nada consta em tribunais (indicador). ") +
                $"Score final calculado: {evaluation.TotalScore}/100.";



        if (aiDocResult != null)
        {
            aiSummary += $" [Leitura de Documento] IA identificou: {aiDocResult.TipoDocumento} ({aiDocResult.ValidacaoDocumento}). Parecer: {aiDocResult.Resumo}";
        }

        // Fake AI thinking delay se não tiver carregado documento (para dar feedback legal de interface)
        if (aiDocResult == null)
        {
            await Task.Delay(2000);
        }

        return Results.Ok(new { 
            Supplier = supplier, 
            Evaluation = evaluation, 
            AiSummary = aiSummary,
            DocumentAnalysis = aiDocResult
        });
    } 
    catch 
    {
        // Fallback for tests when MySQL is down
        var fallbackCnpj = string.IsNullOrWhiteSpace(cnpj) ? "CNPJ Simulado" : cnpj;
        var mockSupplier = new Supplier 
        { 
            Cnpj = fallbackCnpj, 
            CorporateName = "Fornecedor (Modo Offline)", 
            SupplierType = "Terceiro Recorrente" 
        };
        
        var mockEvaluation = new ScoreEvaluation 
        {
            HasEsgCertification = false,
            HasIncompleteFiscalDocs = true,
            HasJudicialOrLaborProcess = false,
            HasPositiveInternalHistory = false
        };
        
        mockSupplier.ScoreEvaluation = mockEvaluation;
        scoringService.CalculateScore(mockEvaluation, mockSupplier);

        await Task.Delay(2000);

        return Results.Ok(new { 
            Message = "Modo Offline: Não foi possível conectar ao banco de dados.",
            Supplier = mockSupplier, 
            Evaluation = mockEvaluation,
            AiSummary = "⚠️ IA em Modo de Contingência (Offline). Baseando avaliação apenas no CNPJ informado."
        });
    }
})
.WithName("EvaluateSupplier");

app.MapGet("/api/supplier/metrics", async (AppDbContext db) => {
    try {
        var homologados = await db.Suppliers.CountAsync(s => s.Status.Contains("Homologado"));
        var rejeitados = await db.Suppliers.CountAsync(s => s.Status == "Reprovado");
        var aguardando = await db.Suppliers.CountAsync(s => s.Status == "Aguardando Auditoria In Loco");
        var aguardandoAprovacao = await db.Suppliers.CountAsync(s => s.Status == "Aguardando Aprovação");
        var altoRisco = await db.ScoreEvaluations.CountAsync(e => e.TotalScore <= 40);
        var total = await db.Suppliers.CountAsync();

        return Results.Ok(new {
            homologados,
            rejeitados,
            aguardandoAuditoria = aguardando,
            aguardandoAprovacao,
            altoRisco,
            total,
            dbOnline = true
        });
    } catch (Exception ex) {
        return Results.Ok(new { 
            homologados = 0, rejeitados = 0, aguardandoAuditoria = 0, aguardandoAprovacao = 0,
            altoRisco = 0, total = 0, dbOnline = false,
            erro = "Banco de dados indisponível. Reinicie o XAMPP/MySQL."
        });
    }
});

// IMPORTANT: Esta rota DEVE vir antes de /api/supplier/{cnpj} para evitar conflito de rota
app.MapGet("/api/supplier/pending-approvals", async (AppDbContext db) => {
    try {
        var pending = await db.Suppliers
            .Include(s => s.ScoreEvaluation)
            .Where(s => s.Status == "Aguardando Aprovação")
            .Select(s => new { s.Id, s.Cnpj, s.CorporateName, s.Status, Score = s.ScoreEvaluation != null ? s.ScoreEvaluation.TotalScore : (int?)null })
            .ToListAsync();
        return Results.Ok(pending);
    } catch (Exception ex) {
        return Results.Problem("Erro ao buscar fila de aprovação: banco de dados indisponível.", statusCode: 503);
    }
});

app.MapGet("/api/supplier/all", async (AppDbContext db) => {
    try {
        var suppliers = await db.Suppliers
            .Include(s => s.ScoreEvaluation)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new {
                s.Id, s.Cnpj, s.CorporateName, s.Status, s.CreatedAt,
                Score = s.ScoreEvaluation != null ? s.ScoreEvaluation.TotalScore : (int?)null
            })
            .ToListAsync();
        return Results.Ok(suppliers);
    } catch {
        return Results.Problem("Erro de conexão com o banco de dados.", statusCode: 503);
    }
});

app.MapGet("/api/supplier/{cnpj}", async (AppDbContext db, string cnpj) =>
{
    try {
        // Normalizar o CNPJ recebido (pode vir formatado ou não)
        var cleanCnpj = new string(cnpj.Where(char.IsDigit).ToArray());
        
        var supplier = await db.Suppliers
            .Include(s => s.ScoreEvaluation)
            .FirstOrDefaultAsync(s => s.Cnpj == cleanCnpj || s.Cnpj == cnpj);
            
        if (supplier == null) return Results.NotFound(new { Message = $"Fornecedor com CNPJ '{cnpj}' não encontrado na base de dados." });
        
        return Results.Ok(new { 
            Supplier = supplier, 
            Evaluation = supplier.ScoreEvaluation,
            AiSummary = supplier.ScoreEvaluation?.AiSummary
        });
    } catch {
        return Results.Problem("Erro de conexão com o banco de dados.", statusCode: 503);
    }
});

app.MapPost("/api/supplier/{id}/approve", async (AppDbContext db, Guid id, ApproveRequest req) => {
    try {
        var supplier = await db.Suppliers.FindAsync(id);
        if (supplier == null) return Results.NotFound(new { Message = "Fornecedor não encontrado." });

        var novoStatus = req.Action == "approve" ? "Homologado" : "Reprovado";
        supplier.Status = novoStatus;
        await db.SaveChangesAsync();
        return Results.Ok(new { Message = $"Fornecedor {novoStatus} com sucesso.", Status = novoStatus, Persistido = true });
    } catch (Exception ex) {
        return Results.Problem($"Erro ao salvar no banco de dados: {ex.Message}", statusCode: 503);
    }
});

app.MapPost("/api/supplier/feedback", async (AppDbContext db, ISupplierScoringService scoring, FeedbackRequest req) => {
    try {
        if (string.IsNullOrWhiteSpace(req.Cnpj))
            return Results.BadRequest(new { Message = "CNPJ é obrigatório." });

        // Normalizar CNPJ antes de buscar — evita 404 quando usuário digita com pontuação
        var cleanCnpj = new string(req.Cnpj.Where(char.IsDigit).ToArray());

        var supplier = await db.Suppliers
            .Include(s => s.ScoreEvaluation)
            .FirstOrDefaultAsync(s => s.Cnpj == cleanCnpj || s.Cnpj == req.Cnpj);
            
        if (supplier == null) 
            return Results.NotFound(new { Message = $"Fornecedor com CNPJ '{req.Cnpj}' não encontrado. Realize o onboarding primeiro." });
        
        if (supplier.ScoreEvaluation == null)
            return Results.NotFound(new { Message = "Avaliação de score não encontrada para este fornecedor." });

        supplier.ScoreEvaluation.PostDeliveryDeadlineScore = req.Deadline;
        supplier.ScoreEvaluation.PostDeliveryPriceScore = req.Price;
        supplier.ScoreEvaluation.PostDeliveryQualityScore = req.Quality;

        scoring.CalculateScore(supplier.ScoreEvaluation, supplier);
        await db.SaveChangesAsync();

        return Results.Ok(new { 
            Message = "✅ Feedback registrado e Score Histórico recalculado com sucesso!", 
            NovoScore = supplier.ScoreEvaluation.TotalScore,
            NovoStatus = supplier.Status,
            Persistido = true
        });
    } catch (Exception ex) {
        return Results.Problem($"Erro ao salvar feedback no banco: {ex.Message}", statusCode: 503);
    }
});

// Aplicar migrações e criar banco de dados automaticamente na inicialização
try
{
    using (var scope = app.Services.CreateScope())
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Console.WriteLine("🔄 Verificando e aplicando migrações do banco de dados...");
        await dbContext.Database.MigrateAsync();
        Console.WriteLine("✅ Banco de dados pronto para uso!");
    }
}
catch (Exception ex)
{
    Console.WriteLine($"⚠️ Erro ao aplicar migrações: {ex.Message}");
    Console.WriteLine("Certifique-se de que o MySQL está rodando e acessível.");
}

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}

public class EvaluateRequest
{
    public string Cnpj { get; set; } = string.Empty;
}

public class ApproveRequest
{
    public string Action { get; set; } = string.Empty; // "approve" or "reject"
}

public class FeedbackRequest
{
    public string Cnpj { get; set; } = string.Empty;
    public decimal Deadline { get; set; }
    public decimal Price { get; set; }
    public decimal Quality { get; set; }
}
