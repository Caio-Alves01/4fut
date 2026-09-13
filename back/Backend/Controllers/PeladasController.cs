using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;

namespace Backend.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class PeladasController : ControllerBase
    {
        private readonly AppDbContext _db;

        public PeladasController(AppDbContext db)
        {
            _db = db;
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

        // Nota do jogador, mesma fórmula do front (JogadoresPage.tsx: calculatePlayerRating).
        private static double CalcularNotaJogador(Jogador jogador)
        {
            if (jogador.Jogos == 0)
                return 0;

            var nota = 5.0;

            var golsBonus = Math.Min((jogador.Gols / (double)jogador.Jogos) * 3, 2.0);
            nota += golsBonus;

            var totalCartoes = jogador.CartoesAmarelos + (jogador.CartoesVermelhos * 2);
            var cartoesPenalty = Math.Min((totalCartoes / (double)jogador.Jogos) * 1.5, 3.0);
            nota -= cartoesPenalty;

            return Math.Max(0, Math.Min(10, nota));
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
                Local = "",
                Horario = "",
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

            ArtilheiroInfo? artilheiro = null;
            var jogadoresComJogos = jogadores.Where(j => j.Jogos > 0).ToList();
            if (jogadoresComJogos.Count > 0)
            {
                var melhorArtilheiro = jogadoresComJogos.OrderByDescending(j => j.Gols).First();
                if (melhorArtilheiro.Gols > 0)
                    artilheiro = new ArtilheiroInfo(melhorArtilheiro.Name, melhorArtilheiro.Gols);
            }

            MelhorJogadorInfo? melhorJogador = null;
            if (jogadoresComJogos.Count > 0)
            {
                var melhor = jogadoresComJogos.OrderByDescending(CalcularNotaJogador).First();
                melhorJogador = new MelhorJogadorInfo(melhor.Name, Math.Round(CalcularNotaJogador(melhor), 1));
            }

            MaisIndisciplinadoInfo? maisIndisciplinado = null;
            if (jogadores.Count > 0)
            {
                var maisCartoes = jogadores
                    .OrderByDescending(j => j.CartoesAmarelos + j.CartoesVermelhos)
                    .First();
                var total = maisCartoes.CartoesAmarelos + maisCartoes.CartoesVermelhos;
                if (total > 0)
                    maisIndisciplinado = new MaisIndisciplinadoInfo(maisCartoes.Name, maisCartoes.CartoesAmarelos, maisCartoes.CartoesVermelhos, total);
            }

            var inadimplentes = jogadores.Count(j => j.Status == "inadimplente");

            var destaques = new DestaquesInfo(artilheiro, melhorJogador, maisIndisciplinado, inadimplentes);

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
                destaques
            ));
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<PeladaResponse>> UpdatePelada(int id, UpdatePeladaRequest request)
        {
            var userId = GetUserId();
            var pelada = await _db.Peladas.SingleOrDefaultAsync(p => p.Id == id && p.OwnerUserId == userId);

            if (pelada is null)
                return NotFound();

            pelada.Name = request.Name.Trim();
            pelada.Description = request.Description?.Trim() ?? "";
            pelada.Local = request.Local?.Trim() ?? "";
            pelada.Horario = request.Horario?.Trim() ?? "";

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
