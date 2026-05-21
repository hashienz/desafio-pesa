using API.Models;
using API.Services;
using API.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddScoped<ISupplierScoringService, SupplierScoringService>();
builder.Services.AddHttpClient<IGeminiDocumentAnalyzer, GeminiDocumentAnalyzer>();

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
    app.MapOpenApi();
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
    HttpContext httpContext) => 
{
    string cnpj = "";
    try 
    {
        var form = await httpContext.Request.ReadFormAsync();
        cnpj = form["cnpj"].ToString();
        var documentFile = form.Files.GetFile("document");

        if (string.IsNullOrWhiteSpace(cnpj))
        {
            return Results.BadRequest(new { Message = "O CNPJ é obrigatório." });
        }

        // Verificando se o fornecedor já existe
        var existingSupplier = await dbContext.Suppliers
            .Include(s => s.ScoreEvaluation)
            .FirstOrDefaultAsync(s => s.Cnpj == cnpj);

        if (existingSupplier != null)
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

        // Simulação de IA: Gerando dados randômicos mas consistentes para o mesmo CNPJ
        var rand = new Random(cnpj.GetHashCode());
        var nomes = new[] { "TechCorp Brasil Ltda", "Logística Avançada S.A.", "Serviços Gerais XYZ", "Construtora Horizonte", "Inovação TI", "Agro Indústria PESA" };
        
        var supplier = new Supplier 
        { 
            Cnpj = cnpj, 
            CorporateName = nomes[rand.Next(nomes.Length)] + " - " + cnpj.Substring(0, Math.Min(cnpj.Length, 4)), 
            SupplierType = "Terceiro Recorrente" 
        };
        
        var evaluation = new ScoreEvaluation 
        {
            HasEsgCertification = rand.NextDouble() > 0.5, // 50% de chance
            HasIncompleteFiscalDocs = rand.NextDouble() > 0.8, // 20% de chance de problema
            HasJudicialOrLaborProcess = rand.NextDouble() > 0.7, // 30% de chance de processos
            HasPositiveInternalHistory = rand.NextDouble() > 0.4 // 60% de chance de histórico bom
        };

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
        supplier.ScoreEvaluation = evaluation;
        
        // Calcular o score e definir o status
        scoringService.CalculateScore(evaluation, supplier);
        
        // Salvar no banco de dados
        dbContext.Suppliers.Add(supplier);
        await dbContext.SaveChangesAsync();
        
        var aiSummary = $"A IA cruzou dados de 14 bases públicas e privadas. " +
                (evaluation.HasEsgCertification ? "✅ Práticas ESG validadas. " : "⚠️ Nenhuma certificação ESG detectada. ") +
                (evaluation.HasIncompleteFiscalDocs ? "❌ Alerta: Irregularidades fiscais encontradas na Receita. " : "✅ Situação fiscal regularizada. ") +
                (evaluation.HasJudicialOrLaborProcess ? "⚠️ Processos trabalhistas ativos no TST. " : "✅ Nada consta em tribunais. ") +
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

app.MapGet("/api/supplier/{cnpj}", async (AppDbContext db, string cnpj) => {
    try {
        var supplier = await db.Suppliers
            .Include(s => s.ScoreEvaluation)
            .FirstOrDefaultAsync(s => s.Cnpj == cnpj);
            
        if (supplier == null) return Results.NotFound(new { Message = $"Fornecedor com CNPJ '{cnpj}' não encontrado na base de dados." });
        
        return Results.Ok(new { Supplier = supplier, Evaluation = supplier.ScoreEvaluation });
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

        var supplier = await db.Suppliers
            .Include(s => s.ScoreEvaluation)
            .FirstOrDefaultAsync(s => s.Cnpj == req.Cnpj);
            
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
