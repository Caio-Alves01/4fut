using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;

namespace Backend.Services
{
    // Números de um jogador na pelada: os lances registrados nas partidas somados aos valores
    // guardados no próprio Jogador (Gols, Jogos...), que ficam como histórico anterior ao app.
    public record EstatisticasJogador(int Gols, int Assistencias, int CartoesAmarelos, int CartoesVermelhos, int Jogos)
    {
        public int TotalCartoes => CartoesAmarelos + CartoesVermelhos;

        // Nota de 0 a 10: começa em 5, gols e assistências por jogo sobem, cartões por jogo descem.
        // Sem nenhum jogo ainda não há nota (0).
        public double Nota
        {
            get
            {
                if (Jogos == 0)
                    return 0;

                var nota = 5.0;
                nota += Math.Min(Gols / (double)Jogos * 3, 2.0);
                nota += Math.Min(Assistencias / (double)Jogos * 2, 1.5);
                nota -= Math.Min(TotalCartoes / (double)Jogos * 1.5, 3.0);

                return Math.Round(Math.Clamp(nota, 0, 10), 1);
            }
        }
    }

    public class EstatisticasService
    {
        private readonly AppDbContext _db;

        public EstatisticasService(AppDbContext db)
        {
            _db = db;
        }

        // Estatísticas de cada jogador da lista (todos da mesma pelada), indexadas pelo Id.
        // Jogo conta quando a partida foi finalizada e o jogador estava presente, escalado ou teve lance.
        public async Task<Dictionary<int, EstatisticasJogador>> CalcularAsync(int peladaId, IEnumerable<Jogador> jogadores)
        {
            var partidaIds = _db.Partidas.Where(p => p.PeladaId == peladaId).Select(p => p.Id);
            var finalizadas = (await _db.Partidas
                .Where(p => p.PeladaId == peladaId && p.Status == "finalizada")
                .Select(p => p.Id)
                .ToListAsync()).ToHashSet();

            var eventos = await _db.PartidaEventos.Where(e => partidaIds.Contains(e.PartidaId)).ToListAsync();
            var presentes = await _db.PartidaPresencas
                .Where(p => partidaIds.Contains(p.PartidaId) && p.Presente)
                .Select(p => new { p.PartidaId, p.JogadorId })
                .ToListAsync();
            var escalados = await _db.PartidaEscalados
                .Where(e => partidaIds.Contains(e.PartidaId))
                .Select(e => new { e.PartidaId, e.JogadorId })
                .ToListAsync();

            var jogosPorJogador = new Dictionary<int, HashSet<int>>();
            void ContarJogo(int jogadorId, int partidaId)
            {
                if (!finalizadas.Contains(partidaId))
                    return;
                if (!jogosPorJogador.TryGetValue(jogadorId, out var jogos))
                    jogosPorJogador[jogadorId] = jogos = new HashSet<int>();
                jogos.Add(partidaId);
            }

            foreach (var p in presentes) ContarJogo(p.JogadorId, p.PartidaId);
            foreach (var e in escalados) ContarJogo(e.JogadorId, e.PartidaId);
            foreach (var e in eventos)
            {
                ContarJogo(e.JogadorId, e.PartidaId);
                if (e.AssistJogadorId is not null) ContarJogo(e.AssistJogadorId.Value, e.PartidaId);
                if (e.EntraJogadorId is not null) ContarJogo(e.EntraJogadorId.Value, e.PartidaId);
            }

            var resultado = new Dictionary<int, EstatisticasJogador>();
            foreach (var jogador in jogadores)
            {
                resultado[jogador.Id] = new EstatisticasJogador(
                    jogador.Gols + eventos.Count(e => e.Tipo == "gol" && e.JogadorId == jogador.Id),
                    jogador.Assistencias + eventos.Count(e => e.Tipo == "gol" && e.AssistJogadorId == jogador.Id),
                    jogador.CartoesAmarelos + eventos.Count(e => e.Tipo == "amarelo" && e.JogadorId == jogador.Id),
                    jogador.CartoesVermelhos + eventos.Count(e => e.Tipo == "vermelho" && e.JogadorId == jogador.Id),
                    jogador.Jogos + (jogosPorJogador.TryGetValue(jogador.Id, out var jogos) ? jogos.Count : 0));
            }

            return resultado;
        }
    }
}
