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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<Jogador>()
                .HasIndex(j => j.PeladaId);

            modelBuilder.Entity<Partida>()
                .HasIndex(p => p.PeladaId);

            modelBuilder.Entity<Transacao>()
                .HasIndex(t => t.PeladaId);

            modelBuilder.Entity<Transacao>()
                .Property(t => t.Amount)
                .HasColumnType("decimal(18,2)");
        }
    }
}
