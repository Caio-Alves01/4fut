using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users => Set<User>();
        public DbSet<Pelada> Peladas => Set<Pelada>();
        public DbSet<Jogador> Jogadores => Set<Jogador>();
        public DbSet<Partida> Partidas => Set<Partida>();
        public DbSet<Transacao> Transacoes => Set<Transacao>();
        public DbSet<PartidaPresenca> PartidaPresencas => Set<PartidaPresenca>();
        public DbSet<PartidaEvento> PartidaEventos => Set<PartidaEvento>();
        public DbSet<MensalidadePagamento> MensalidadePagamentos => Set<MensalidadePagamento>();
        public DbSet<Cobranca> Cobrancas => Set<Cobranca>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<User>()
                .Property(u => u.ResetCode)
                .HasMaxLength(6);

            // Índice único: além da checagem no controller, o banco também barra CPF repetido
            // (caso dois cadastros com o mesmo CPF cheguem ao mesmo tempo). Vários NULL são permitidos.
            modelBuilder.Entity<User>()
                .Property(u => u.CpfHash)
                .HasMaxLength(64);

            modelBuilder.Entity<User>()
                .HasIndex(u => u.CpfHash)
                .IsUnique();

            modelBuilder.Entity<Jogador>()
                .HasIndex(j => j.PeladaId);

            // Jogadores que já existiam antes do campo Tipo entram como mensalistas.
            modelBuilder.Entity<Jogador>()
                .Property(j => j.Tipo)
                .HasMaxLength(20)
                .HasDefaultValue(TiposJogador.Mensalista);

            modelBuilder.Entity<Partida>()
                .HasIndex(p => p.PeladaId);

            modelBuilder.Entity<Transacao>()
                .HasIndex(t => t.PeladaId);

            modelBuilder.Entity<Transacao>()
                .Property(t => t.Amount)
                .HasColumnType("decimal(18,2)");

            // Jogadores que já existiam antes do CreatedAt começam a dever mensalidade a partir de agora.
            modelBuilder.Entity<Jogador>()
                .Property(j => j.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP(6)");

            modelBuilder.Entity<Pelada>(pelada =>
            {
                pelada.Property(p => p.ValorMensalidade).HasColumnType("decimal(18,2)");
                pelada.Property(p => p.ValorAvulso).HasColumnType("decimal(18,2)");
                pelada.Property(p => p.ValorCartaoAmarelo).HasColumnType("decimal(18,2)");
                pelada.Property(p => p.ValorCartaoVermelho).HasColumnType("decimal(18,2)");
            });

            // Uma presença por jogador por partida.
            modelBuilder.Entity<PartidaPresenca>()
                .HasIndex(p => new { p.PartidaId, p.JogadorId })
                .IsUnique();

            modelBuilder.Entity<PartidaPresenca>()
                .Property(p => p.Confirmacao)
                .HasMaxLength(20);

            modelBuilder.Entity<PartidaEvento>()
                .HasIndex(e => e.PartidaId);

            modelBuilder.Entity<PartidaEvento>()
                .Property(e => e.Tipo)
                .HasMaxLength(20);

            // Um pagamento por jogador por mês: o banco barra pagar o mesmo mês duas vezes.
            modelBuilder.Entity<MensalidadePagamento>()
                .HasIndex(m => new { m.JogadorId, m.Ano, m.Mes })
                .IsUnique();

            modelBuilder.Entity<MensalidadePagamento>()
                .HasIndex(m => m.PeladaId);

            modelBuilder.Entity<MensalidadePagamento>()
                .Property(m => m.Valor)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<Cobranca>()
                .HasIndex(c => c.PeladaId);

            modelBuilder.Entity<Cobranca>()
                .Property(c => c.Valor)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<Cobranca>()
                .Property(c => c.Tipo)
                .HasMaxLength(20);

            modelBuilder.Entity<Cobranca>()
                .Property(c => c.Descricao)
                .HasMaxLength(200);
        }
    }
}
