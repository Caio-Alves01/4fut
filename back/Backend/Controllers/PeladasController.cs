using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;

namespace Backend.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class PeladasController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly FinanceiroService _financeiro;
        private readonly EstatisticasService _estatisticas;

        public PeladasController(AppDbContext db, FinanceiroService financeiro, EstatisticasService estatisticas)
        {
            _db = db;
            _financeiro = financeiro;
            _estatisticas = estatisticas;
        }

        private int GetUserId()
        {
            return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        }

        // Conta jogadores/partidas e soma o saldo (entradas - saídas) de uma pelada.
        private async Task<(int totalPlayers, int totalMatches, decimal balance)> ComputeTotais(int peladaId)
        {
            var totalPlayers = await _db.Jogadores.CountAsync(j => j.PeladaId == peladaId);
            var totalMatches = await _db.Partidas.CountAsync(p => p.PeladaId == peladaId);

            var entradas = await _db.Transacoes
                .Where(t => t.PeladaId == peladaId && t.Type == "entrada")
                .SumAsync(t => (decimal?)t.Amount) ?? 0;
            var saidas = await _db.Transacoes
                .Where(t => t.PeladaId == peladaId && t.Type == "saida")
                .SumAsync(t => (decimal?)t.Amount) ?? 0;

            return (totalPlayers, totalMatches, entradas - saidas);
        }

        private static List<string> ParseDaysOfWeek(string daysOfWeek)
        {
            if (string.IsNullOrWhiteSpace(daysOfWeek))
                return new List<string>();

            return daysOfWeek.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList();
        }

        [HttpGet]
        public async Task<ActionResult<List<PeladaResponse>>> GetPeladas()
        {
            var userId = GetUserId();
            var peladas = await _db.Peladas.Where(p => p.OwnerUserId == userId).ToListAsync();

            var resultado = new List<PeladaResponse>();
            foreach (var pelada in peladas)
            {
                var (totalPlayers, totalMatches, balance) = await ComputeTotais(pelada.Id);
                resultado.Add(new PeladaResponse(
                    pelada.Id,
                    pelada.Name,
                    pelada.Description,
                    ParseDaysOfWeek(pelada.DaysOfWeek),
                    pelada.Local,
                    pelada.Horario,
                    pelada.Active,
                    pelada.CreatedAt,
                    totalPlayers,
                    totalMatches,
                    balance
                ));
            }

            return Ok(resultado);
        }

        [HttpPost]
        public async Task<ActionResult<PeladaResponse>> CreatePelada(CreatePeladaRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name) || request.DaysOfWeek.Count == 0)
                return BadRequest("Nome e ao menos um dia da semana são obrigatórios.");

            var pelada = new Pelada
            {
                Name = request.Name.Trim(),
                Description = request.Description?.Trim() ?? "",
                DaysOfWeek = string.Join(",", request.DaysOfWeek),
                Local = request.Local?.Trim() ?? "",
                Horario = request.Horario?.Trim() ?? "",
                Active = true,
                CreatedAt = DateTime.UtcNow,
                OwnerUserId = GetUserId(),
            };

            _db.Peladas.Add(pelada);
            await _db.SaveChangesAsync();

            return Ok(new PeladaResponse(
                pelada.Id,
                pelada.Name,
                pelada.Description,
                ParseDaysOfWeek(pelada.DaysOfWeek),
                pelada.Local,
                pelada.Horario,
                pelada.Active,
                pelada.CreatedAt,
                0,
                0,
                0
            ));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<PeladaDetailResponse>> GetPelada(int id)
        {
            var userId = GetUserId();
            var pelada = await _db.Peladas.SingleOrDefaultAsync(p => p.Id == id && p.OwnerUserId == userId);

            if (pelada is null)
                return NotFound();

            var (totalPlayers, totalMatches, balance) = await ComputeTotais(id);

            var proximaPartida = await _db.Partidas
                .Where(p => p.PeladaId == id && p.Status != "finalizada" && p.Date >= DateTime.UtcNow.Date)
                .OrderBy(p => p.Date)
                .FirstOrDefaultAsync();

            NextMatchInfo? nextMatch = proximaPartida is null
                ? null
                : new NextMatchInfo(proximaPartida.Date, proximaPartida.Time, proximaPartida.Location);

            var jogadores = await _db.Jogadores.Where(j => j.PeladaId == id).ToListAsync();
            var estatisticas = await _estatisticas.CalcularAsync(id, jogadores);
            var comNumeros = jogadores.Select(j => (Jogador: j, Stats: estatisticas[j.Id])).ToList();

            // Em caso de empate, fica quem tem menos jogos (melhor aproveitamento) e depois o nome.
            ArtilheiroInfo? artilheiro = comNumeros
                .Where(x => x.Stats.Gols > 0)
                .OrderByDescending(x => x.Stats.Gols).ThenBy(x => x.Stats.Jogos).ThenBy(x => x.Jogador.Name)
                .Select(x => new ArtilheiroInfo(x.Jogador.Name, x.Stats.Gols))
                .FirstOrDefault();

            MelhorJogadorInfo? melhorJogador = comNumeros
                .Where(x => x.Stats.Jogos > 0)
                .OrderByDescending(x => x.Stats.Nota).ThenByDescending(x => x.Stats.Jogos).ThenBy(x => x.Jogador.Name)
                .Select(x => new MelhorJogadorInfo(x.Jogador.Name, x.Stats.Nota))
                .FirstOrDefault();

            MaisIndisciplinadoInfo? maisIndisciplinado = comNumeros
                .Where(x => x.Stats.TotalCartoes > 0)
                .OrderByDescending(x => x.Stats.TotalCartoes).ThenBy(x => x.Jogador.Name)
                .Select(x => new MaisIndisciplinadoInfo(x.Jogador.Name, x.Stats.CartoesAmarelos, x.Stats.CartoesVermelhos, x.Stats.TotalCartoes))
                .FirstOrDefault();

            var atividades = await AtividadesRecentes(id, jogadores);

            // Jogadores com alguma coisa a receber (mensalidade em aberto, avulso ou cartão não pago).
            var aReceber = await _financeiro.CalcularAReceberAsync(pelada);
            var inadimplentes = aReceber.Select(i => i.JogadorId).Distinct().Count();

            var destaques = new DestaquesInfo(artilheiro, melhorJogador, maisIndisciplinado, inadimplentes);
            var presencaMedia = await CalcularPresencaMedia(id, jogadores);

            return Ok(new PeladaDetailResponse(
                pelada.Id,
                pelada.Name,
                pelada.Description,
                ParseDaysOfWeek(pelada.DaysOfWeek),
                pelada.Local,
                pelada.Horario,
                pelada.Active,
                pelada.CreatedAt,
                totalPlayers,
                totalMatches,
                balance,
                nextMatch,
                destaques,
                atividades,
                presencaMedia
            ));
        }

        // Presentes = quem foi marcado como compareceu (ao finalizar, já entram quem confirmou, foi escalado
        // ou teve lance). Partidas finalizadas sem nenhum presente ficam de fora, para não puxar a média
        // para baixo só porque ninguém marcou a presença.
        private async Task<PresencaMediaInfo?> CalcularPresencaMedia(int peladaId, List<Jogador> jogadores)
        {
            var presentesPorPartida = await _db.PartidaPresencas
                .Where(pp => pp.Presente && _db.Partidas.Any(p => p.Id == pp.PartidaId && p.PeladaId == peladaId && p.Status == "finalizada"))
                .GroupBy(pp => pp.PartidaId)
                .Select(g => g.Count())
                .ToListAsync();

            if (presentesPorPartida.Count == 0)
                return null;

            var media = presentesPorPartida.Average();
            var ativos = jogadores.Count(j => j.Status == StatusJogador.Ativo);
            var percentual = ativos > 0 ? (int)Math.Round(Math.Min(100, media / ativos * 100)) : 0;

            return new PresencaMediaInfo(Math.Round(media, 1), percentual, presentesPorPartida.Count);
        }

        private const int MaxAtividades = 8;
        private static readonly CultureInfo PtBr = new("pt-BR");

        // Últimos acontecimentos da pelada: partidas agendadas e finalizadas, jogadores novos e movimentações do caixa.
        private async Task<List<AtividadeInfo>> AtividadesRecentes(int peladaId, List<Jogador> jogadores)
        {
            var atividades = new List<AtividadeInfo>();

            var agendadas = await _db.Partidas
                .Where(p => p.PeladaId == peladaId)
                .OrderByDescending(p => p.CreatedAt)
                .Take(MaxAtividades)
                .ToListAsync();
            foreach (var p in agendadas)
            {
                var quando = p.Date.ToString("dddd, dd/MM", PtBr);
                atividades.Add(new AtividadeInfo("agendada", "Partida agendada", $"{quando} às {p.Time} · {p.Location}", p.CreatedAt));
            }

            var partidas = await _db.Partidas
                .Where(p => p.PeladaId == peladaId && p.Status == "finalizada")
                .OrderByDescending(p => p.Date)
                .Take(MaxAtividades)
                .ToListAsync();
            foreach (var p in partidas)
            {
                var data = TimeOnly.TryParse(p.Time, out var hora) ? p.Date.Date.Add(hora.ToTimeSpan()) : p.Date;
                atividades.Add(new AtividadeInfo("partida", "Partida realizada",
                    $"Time 1 {p.ScoreTeam1 ?? 0} x {p.ScoreTeam2 ?? 0} Time 2 · {p.Location}", data));
            }

            foreach (var j in jogadores.OrderByDescending(j => j.CreatedAt).Take(MaxAtividades))
                atividades.Add(new AtividadeInfo("jogador", "Novo jogador adicionado", $"{j.Name} entrou na pelada", j.CreatedAt));

            var transacoes = await _db.Transacoes
                .Where(t => t.PeladaId == peladaId)
                .OrderByDescending(t => t.Date).ThenByDescending(t => t.Id)
                .Take(MaxAtividades)
                .ToListAsync();
            foreach (var t in transacoes)
            {
                var valor = t.Amount.ToString("C", PtBr);
                if (t.Type == "saida")
                    atividades.Add(new AtividadeInfo("despesa", "Despesa registrada", $"{valor} · {t.Description}", t.Date));
                else if (!string.IsNullOrWhiteSpace(t.PaidBy))
                    atividades.Add(new AtividadeInfo("pagamento", "Pagamento recebido", $"{valor} de {t.PaidBy} · {t.Description}", t.Date));
                else
                    atividades.Add(new AtividadeInfo("pagamento", "Entrada no caixa", $"{valor} · {t.Description}", t.Date));
            }

            return atividades.OrderByDescending(a => a.Data).Take(MaxAtividades).ToList();
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<PeladaResponse>> UpdatePelada(int id, UpdatePeladaRequest request)
        {
            var userId = GetUserId();
            var pelada = await _db.Peladas.SingleOrDefaultAsync(p => p.Id == id && p.OwnerUserId == userId);

            if (pelada is null)
                return NotFound();

            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest("O nome da pelada é obrigatório.");

            if (request.DaysOfWeek is not null && request.DaysOfWeek.Count == 0)
                return BadRequest("Selecione ao menos um dia da semana.");

            pelada.Name = request.Name.Trim();
            pelada.Description = request.Description?.Trim() ?? "";
            pelada.Local = request.Local?.Trim() ?? "";
            pelada.Horario = request.Horario?.Trim() ?? "";

            if (request.DaysOfWeek is not null)
                pelada.DaysOfWeek = string.Join(",", request.DaysOfWeek);

            if (request.Active is not null)
                pelada.Active = request.Active.Value;

            await _db.SaveChangesAsync();

            var (totalPlayers, totalMatches, balance) = await ComputeTotais(id);

            return Ok(new PeladaResponse(
                pelada.Id,
                pelada.Name,
                pelada.Description,
                ParseDaysOfWeek(pelada.DaysOfWeek),
                pelada.Local,
                pelada.Horario,
                pelada.Active,
                pelada.CreatedAt,
                totalPlayers,
                totalMatches,
                balance
            ));
        }
    }
}
