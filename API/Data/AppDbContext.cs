using API.Models;
using Microsoft.EntityFrameworkCore;

namespace API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Supplier> Suppliers { get; set; }
        public DbSet<ScoreEvaluation> ScoreEvaluations { get; set; }
        public DbSet<ApprovalWorkflow> ApprovalWorkflows { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configurando relacionamento 1 para 1: Supplier <-> ScoreEvaluation
            modelBuilder.Entity<Supplier>()
                .HasOne(s => s.ScoreEvaluation)
                .WithOne(e => e.Supplier)
                .HasForeignKey<ScoreEvaluation>(e => e.SupplierId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configurando relacionamento 1 para 1: Supplier <-> ApprovalWorkflow
            modelBuilder.Entity<Supplier>()
                .HasOne(s => s.ApprovalWorkflow)
                .WithOne(w => w.Supplier)
                .HasForeignKey<ApprovalWorkflow>(w => w.SupplierId)
                .OnDelete(DeleteBehavior.Cascade);
                
            modelBuilder.Entity<Supplier>().HasKey(s => s.Id);
            modelBuilder.Entity<ScoreEvaluation>().HasKey(e => e.Id);
            modelBuilder.Entity<ApprovalWorkflow>().HasKey(w => w.Id);
            
            // Opcional: configurar tamanhos de string para o MySQL (para evitar problemas de indexação em varchar)
            modelBuilder.Entity<Supplier>().Property(s => s.Cnpj).HasMaxLength(20);
            modelBuilder.Entity<Supplier>().Property(s => s.CorporateName).HasMaxLength(255);
            modelBuilder.Entity<Supplier>().Property(s => s.SupplierType).HasMaxLength(100);
            modelBuilder.Entity<Supplier>().Property(s => s.Status).HasMaxLength(100);
        }
    }
}
