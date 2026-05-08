using System;
using System.Text.Json.Serialization;

namespace API.Models
{
    public class Supplier
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Cnpj { get; set; } = string.Empty;
        public string CorporateName { get; set; } = string.Empty;
        public string TradeName { get; set; } = string.Empty;
        
        // Ex: "Terceiro Recorrente", "Serviços de Hospedagem", "Opex/Capex"
        public string SupplierType { get; set; } = string.Empty; 
        
        // Ex: Pendente, Aguardando Auditoria In Loco, Homologado, Reprovado, Aguardando Aprovação
        public string Status { get; set; } = "Pendente"; 
        
        // Navigation properties
        [JsonIgnore]
        public ScoreEvaluation? ScoreEvaluation { get; set; }
        [JsonIgnore]
        public ApprovalWorkflow? ApprovalWorkflow { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
