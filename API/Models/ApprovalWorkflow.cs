using System;
using System.Text.Json.Serialization;

namespace API.Models
{
    public class ApprovalWorkflow
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SupplierId { get; set; }
        
        [JsonIgnore]
        public Supplier? Supplier { get; set; }

        // null = Pendente, true = Aprovado, false = Reprovado
        public bool? HrApproval { get; set; } 
        public bool? LegalApproval { get; set; }
        
        public string? HrNotes { get; set; }
        public string? LegalNotes { get; set; }

        public bool IsCompleted => HrApproval.HasValue && LegalApproval.HasValue;
        public bool IsApproved => HrApproval == true && LegalApproval == true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }
    }
}
