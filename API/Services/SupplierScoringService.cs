using System;
using API.Models;

namespace API.Services
{
    public interface ISupplierScoringService
    {
        void CalculateScore(ScoreEvaluation evaluation, Supplier supplier);
    }

    public class SupplierScoringService : ISupplierScoringService
    {
        // Regras de pontuação baseadas nos critérios ESG, fiscais e jurídicos
        public const int ScoreIncompleteFiscalDocs = -20;
        public const int ScoreHasEsgCertification = 15;
        public const int ScoreHasJudicialProcess = -25;
        public const int ScorePositiveInternalHistory = 20;

        public const int BaseScore = 50; // Pontuação inicial padrão
        public const int HighRiskThreshold = 40; // Pontuação abaixo ou igual a esta indica Alto Risco

        public void CalculateScore(ScoreEvaluation evaluation, Supplier supplier)
        {
            int score = BaseScore;

            if (evaluation.HasIncompleteFiscalDocs)
                score += ScoreIncompleteFiscalDocs;

            if (evaluation.HasEsgCertification)
                score += ScoreHasEsgCertification;

            if (evaluation.HasJudicialOrLaborProcess)
                score += ScoreHasJudicialProcess;

            if (evaluation.HasPositiveInternalHistory)
                score += ScorePositiveInternalHistory;

            // Recálculo histórico do fornecedor: Ciclo Pós-Aquisição
            // Atualiza o score baseado na entrega, prazo, preço e qualidade
            if (evaluation.PostDeliveryDeadlineScore.HasValue && 
                evaluation.PostDeliveryPriceScore.HasValue && 
                evaluation.PostDeliveryQualityScore.HasValue)
            {
                var postAvg = (evaluation.PostDeliveryDeadlineScore.Value + 
                               evaluation.PostDeliveryPriceScore.Value + 
                               evaluation.PostDeliveryQualityScore.Value) / 3.0m;
                               
                // Ponderação baseada no desempenho pós-entrega (escala 0 a 10)
                if (postAvg >= 8) score += 15; // Bônus por bom desempenho
                else if (postAvg < 5) score -= 15; // Penalização por mau desempenho
            }

            evaluation.TotalScore = score;

            DetermineSupplierStatus(score, supplier);
        }

        private void DetermineSupplierStatus(int score, Supplier supplier)
        {
            // Tratamento de Exceções (Off-line): Risco Alto ou Serviço de Alta Complexidade
            if (score <= HighRiskThreshold || IsHighComplexityService(supplier.SupplierType))
            {
                supplier.Status = "Aguardando Auditoria In Loco";
            }
            // Aprovações Específicas (Workflow): Terceiro Recorrente
            else if (supplier.SupplierType.Equals("Terceiro Recorrente", StringComparison.OrdinalIgnoreCase))
            {
                supplier.Status = "Aguardando Aprovação"; // Requer aprovação manual de RH e Jurídico
            }
            else
            {
                supplier.Status = "Homologado"; // Aprovação automática
            }
        }

        private bool IsHighComplexityService(string supplierType)
        {
            // Exemplo de serviço de alta complexidade conforme o case (Hospedagem para viagens ou grandes Opex/Capex)
            return supplierType.Equals("Serviços de Hospedagem", StringComparison.OrdinalIgnoreCase);
        }
    }
}
