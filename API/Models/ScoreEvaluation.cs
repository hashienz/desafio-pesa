using System;
using System.Text.Json.Serialization;

namespace API.Models
{
    public class ScoreEvaluation
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SupplierId { get; set; }
        
        [JsonIgnore]
        public Supplier? Supplier { get; set; }

        // Critérios de Avaliação
        public bool HasIncompleteFiscalDocs { get; set; }
        public bool HasEsgCertification { get; set; }
        public bool HasJudicialOrLaborProcess { get; set; }
        public bool HasPositiveInternalHistory { get; set; }
        
        // Fator Dinâmico
        public int TotalScore { get; set; }
        
        // Avaliação Pós-Entrega (Ciclo Pós-Aquisição)
        public decimal? PostDeliveryDeadlineScore { get; set; }
        public decimal? PostDeliveryPriceScore { get; set; }
        public decimal? PostDeliveryQualityScore { get; set; }

        public DateTime EvaluatedAt { get; set; } = DateTime.UtcNow;
    }
}
