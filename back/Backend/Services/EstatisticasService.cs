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

    // O que define a prioridade de um jogador na escalação (ver front: components/prioridadeEscalacao.ts).
    // PresencaPercentual: null enquanto não houver partida finalizada para medir.
    // MensalidadeEmDia: null quando não se aplica (avulso, inativo/licença ou pelada sem mensalidade).
    public record PrioridadeJogador(int? PresencaPercentual, bool? MensalidadeEmDia, int MensalidadesEmAberto, int OutrasPendencias);

    public class EstatisticasService
    {
        private readonly AppDbContext _db;
        private readonly FinanceiroService _financeiro;

        public EstatisticasService(AppDbContext db, FinanceiroService financeiro)
        {
            _db = db;
            _financeiro = financeiro;
        }

        // Presença e situação financeira de cada jogador, para a prioridade na escalação.
        //
        // Presença: das partidas finalizadas que tiveram presença marcada, quantas o jogador compareceu.
        // Só contam as partidas desde que ele entrou na pelada (ou as que ele foi, mesmo antes disso),
        // para quem acabou de chegar não ficar com presença baixa por jogos de quando nem era da pelada.
        public async Task<Dictionary<int, PrioridadeJogador>> CalcularPrioridadeAsync(Pelada pelada, IEnumerable<Jogador> jogadores)
        {
            var finalizadas = await _db.Partidas
                .Where(p => p.PeladaId == pelada.Id && p.Status == "finalizada")
                .Select(p => new { p.Id, p.Date })
                .ToListAsync();
            var idsFinalizadas = finalizadas.Select(p => p.Id).ToList();

            var presentes = await _db.PartidaPresencas
                .Where(pp => pp.Presente && idsFinalizadas.Contains(pp.PartidaId))
                .Select(pp => new { pp.PartidaId, pp.JogadorId })
                .ToListAsync();

            // Partidas finalizadas sem nenhum presente marcado ficam de fora (mesma regra da presença média).
            var partidasComPresenca = presentes.Select(p => p.PartidaId).ToHashSet();
            var partidasMedidas = finalizadas.Where(p => partidasComPresenca.Contains(p.Id)).ToList();
            var foiEm = presentes.GroupBy(p => p.JogadorId).ToDictionary(g => g.Key, g => g.Select(p => p.PartidaId).ToHashSet());

            var aReceber = await _financeiro.CalcularAReceberAsync(pelada);
            var cobraMensalidade = pelada.ValorMensalidade > 0;

            var resultado = new Dictionary<int, PrioridadeJogador>();
            foreach (var jogador in jogadores)
            {
                var entrouEm = jogador.CreatedAt.Date;
                var foi = foiEm.GetValueOrDefault(jogador.Id) ?? new HashSet<int>();
                var consideradas = partidasMedidas.Count(p => p.Date.Date >= entrouEm || foi.Contains(p.Id));
                int? presenca = consideradas > 0
                    ? (int)Math.Round(Math.Min(100, foi.Count * 100.0 / consideradas))
                    : null;

                var doJogador = aReceber.Where(i => i.JogadorId == jogador.Id).ToList();
                var mensalidades = doJogador.Count(i => i.Tipo == "mensalidade");
                var outras = doJogador.Count - mensalidades;

                bool? emDia = cobraMensalidade && jogador.Tipo == TiposJogador.Mensalista && jogador.Status == StatusJogador.Ativo
                    ? mensalidades == 0
                    : null;

                resultado[jogador.Id] = new PrioridadeJogador(presenca, emDia, mensalidades, outras);
            }

            return resultado;
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
