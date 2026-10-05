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
    [Route("api/peladas/{peladaId}/partidas")]
    public class PartidasController : ControllerBase
    {
        private static readonly string[] StatusPartida = { "agendada", "em_andamento", "finalizada" };
        private static readonly string[] Confirmacoes = { "pendente", "confirmado", "recusado" };
        private static readonly string[] TiposEvento = { "gol", "amarelo", "vermelho" };

        private readonly AppDbContext _db;
        private readonly FinanceiroService _financeiro;

        public PartidasController(AppDbContext db, FinanceiroService financeiro)
        {
            _db = db;
            _financeiro = financeiro;
        }

        // Confere se a pelada existe e se pertence ao usuário logado.
        private async Task<Pelada?> GetPeladaDoUsuario(int peladaId)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var pelada = await _db.Peladas.FindAsync(peladaId);

            if (pelada is null || pelada.OwnerUserId != userId)
                return null;

            return pelada;
        }

        // Não deixa marcar partida em data passada. Compara só o dia e aceita 1 dia de folga,
        // porque o servidor pode estar em outro fuso que o usuário (ex: UTC vs Brasília).
        private static bool DataNoPassado(DateTime data)
        {
            return data.Date < DateTime.UtcNow.Date.AddDays(-1);
        }

        [HttpGet]
        public async Task<ActionResult<List<PartidaResponse>>> Listar(int peladaId)
        {
            var pelada = await GetPeladaDoUsuario(peladaId);
            if (pelada is null)
                return NotFound();

            var partidas = await _db.Partidas
                .Where(p => p.PeladaId == peladaId)
                .OrderBy(p => p.Date)
                .ToListAsync();

            var resposta = new List<PartidaResponse>();
            foreach (var partida in partidas)
            {
                resposta.Add(new PartidaResponse(partida.Id, partida.Date, partida.Time, partida.Location, partida.Status, partida.ScoreTeam1, partida.ScoreTeam2));
            }

            return Ok(resposta);
        }

        [HttpPost]
        public async Task<ActionResult<PartidaResponse>> Criar(int peladaId, CreatePartidaRequest request)
        {
            var pelada = await GetPeladaDoUsuario(peladaId);
            if (pelada is null)
                return NotFound();

            if (DataNoPassado(request.Date))
                return BadRequest("Não é possível agendar uma partida em data passada.");

            var partida = new Partida
            {
                PeladaId = peladaId,
                Date = request.Date,
                Time = request.Time,
                Location = request.Location,
                Status = "agendada",
            };

            _db.Partidas.Add(partida);
            await _db.SaveChangesAsync();

            return Ok(new PartidaResponse(partida.Id, partida.Date, partida.Time, partida.Location, partida.Status, partida.ScoreTeam1, partida.ScoreTeam2));
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<PartidaResponse>> Atualizar(int peladaId, int id, UpdatePartidaRequest request)
        {
            var pelada = await GetPeladaDoUsuario(peladaId);
            if (pelada is null)
                return NotFound();

            var partida = await _db.Partidas.SingleOrDefaultAsync(p => p.Id == id && p.PeladaId == peladaId);
            if (partida is null)
                return NotFound();

            // Reagendar para uma data passada não vale. Partidas já realizadas (finalizada/em andamento)
            // e edições que não mudam a data (ex: salvar placar) continuam livres.
            if (!StatusPartida.Contains(request.Status))
                return BadRequest("Status de partida inválido.");

            var mudouData = partida.Date.Date != request.Date.Date;
            if (mudouData && request.Status == "agendada" && DataNoPassado(request.Date))
                return BadRequest("Não é possível reagendar uma partida para data passada.");

            var mudouStatus = partida.Status != request.Status;

            partida.Date = request.Date;
            partida.Time = request.Time;
            partida.Location = request.Location;
            partida.Status = request.Status;
            partida.ScoreTeam1 = request.ScoreTeam1;
            partida.ScoreTeam2 = request.ScoreTeam2;

            // Avulso só é cobrado em partida finalizada: finalizar (ou reabrir) muda as cobranças.
            if (mudouStatus)
                await _financeiro.SincronizarAvulsosDaPartidaAsync(pelada, partida);

            await _db.SaveChangesAsync();

            return Ok(new PartidaResponse(partida.Id, partida.Date, partida.Time, partida.Location, partida.Status, partida.ScoreTeam1, partida.ScoreTeam2));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Remover(int peladaId, int id)
        {
            var pelada = await GetPeladaDoUsuario(peladaId);
            if (pelada is null)
                return NotFound();

            var partida = await _db.Partidas.SingleOrDefaultAsync(p => p.Id == id && p.PeladaId == peladaId);
            if (partida is null)
                return NotFound();

            _db.PartidaPresencas.RemoveRange(_db.PartidaPresencas.Where(p => p.PartidaId == id));
            _db.PartidaEventos.RemoveRange(_db.PartidaEventos.Where(e => e.PartidaId == id));
            await _financeiro.RemoverCobrancasAsync(_db.Cobrancas.Where(c => c.PartidaId == id), desligarPartida: true);
            _db.Partidas.Remove(partida);
            await _db.SaveChangesAsync();

            return Ok();
        }

        // ---------- Presença e eventos ----------

        // Partida com a lista de presença e os eventos. A lista traz todos os jogadores ativos
        // da pelada, mais quem já tem presença/evento nela (ex: jogador que ficou inativo depois).
        [HttpGet("{id}/detalhes")]
        public async Task<ActionResult<PartidaDetalhesResponse>> Detalhes(int peladaId, int id)
        {
            var pelada = await GetPeladaDoUsuario(peladaId);
            if (pelada is null)
                return NotFound();

            var partida = await _db.Partidas.SingleOrDefaultAsync(p => p.Id == id && p.PeladaId == peladaId);
            if (partida is null)
                return NotFound();

            var presencas = await _db.PartidaPresencas.Where(p => p.PartidaId == id).ToListAsync();
            var eventos = await _db.PartidaEventos.Where(e => e.PartidaId == id).OrderBy(e => e.Minuto).ToListAsync();
            var jogadores = await _db.Jogadores.Where(j => j.PeladaId == peladaId).ToListAsync();

            var idsComRegistro = presencas.Select(p => p.JogadorId)
                .Concat(eventos.Select(e => e.JogadorId))
                .ToHashSet();

            var listaPresenca = jogadores
                .Where(j => j.Status == StatusJogador.Ativo || idsComRegistro.Contains(j.Id))
                .OrderBy(j => j.Name)
                .Select(j =>
                {
                    var presenca = presencas.SingleOrDefault(p => p.JogadorId == j.Id);
                    return new PresencaResponse(j.Id, j.Name, j.Tipo, presenca?.Confirmacao ?? "pendente", presenca?.Presente ?? false);
                })
                .ToList();

            var nomes = jogadores.ToDictionary(j => j.Id, j => j.Name);
            var listaEventos = eventos.Select(e => ParaEvento(e, nomes)).ToList();

            return Ok(new PartidaDetalhesResponse(ParaResponse(partida), listaPresenca, listaEventos));
        }

        [HttpPut("{id}/presencas/{jogadorId}")]
        public async Task<ActionResult<PresencaResponse>> AtualizarPresenca(int peladaId, int id, int jogadorId, UpdatePresencaRequest request)
        {
            var pelada = await GetPeladaDoUsuario(peladaId);
            if (pelada is null)
                return NotFound();

            var partida = await _db.Partidas.SingleOrDefaultAsync(p => p.Id == id && p.PeladaId == peladaId);
            var jogador = await _db.Jogadores.SingleOrDefaultAsync(j => j.Id == jogadorId && j.PeladaId == peladaId);
            if (partida is null || jogador is null)
                return NotFound();

            if (!Confirmacoes.Contains(request.Confirmacao))
                return BadRequest("Confirmação inválida.");

            if (request.Presente && partida.Status != "finalizada")
                return BadRequest("Só dá para marcar quem compareceu depois que a partida for finalizada.");

            var presenca = await _db.PartidaPresencas.SingleOrDefaultAsync(p => p.PartidaId == id && p.JogadorId == jogadorId);
            if (presenca is null)
            {
                presenca = new PartidaPresenca { PartidaId = id, JogadorId = jogadorId };
                _db.PartidaPresencas.Add(presenca);
            }

            presenca.Confirmacao = request.Confirmacao;
            presenca.Presente = request.Presente;

            await _financeiro.SincronizarAvulsoAsync(pelada, partida, jogador, presenca);
            await _db.SaveChangesAsync();

            return Ok(new PresencaResponse(jogador.Id, jogador.Name, jogador.Tipo, presenca.Confirmacao, presenca.Presente));
        }

        [HttpPost("{id}/eventos")]
        public async Task<ActionResult<EventoResponse>> CriarEvento(int peladaId, int id, CreateEventoRequest request)
        {
            var pelada = await GetPeladaDoUsuario(peladaId);
            if (pelada is null)
                return NotFound();

            var partida = await _db.Partidas.SingleOrDefaultAsync(p => p.Id == id && p.PeladaId == peladaId);
            if (partida is null)
                return NotFound();

            if (!TiposEvento.Contains(request.Tipo))
                return BadRequest("Tipo de evento inválido.");

            if (request.Time != 1 && request.Time != 2)
                return BadRequest("O time deve ser 1 ou 2.");

            if (request.Minuto < 0 || request.Minuto > 200)
                return BadRequest("Minuto inválido.");

            var jogador = await _db.Jogadores.SingleOrDefaultAsync(j => j.Id == request.JogadorId && j.PeladaId == peladaId);
            if (jogador is null)
                return BadRequest("Jogador não encontrado nesta pelada.");

            Jogador? assistente = null;
            if (request.AssistJogadorId is not null)
            {
                if (request.Tipo != "gol" || request.AssistJogadorId == request.JogadorId)
                    return BadRequest("Assistência inválida.");

                assistente = await _db.Jogadores.SingleOrDefaultAsync(j => j.Id == request.AssistJogadorId && j.PeladaId == peladaId);
                if (assistente is null)
                    return BadRequest("Jogador da assistência não encontrado nesta pelada.");
            }

            await using var dbTransaction = await _db.Database.BeginTransactionAsync();

            var evento = new PartidaEvento
            {
                PartidaId = id,
                JogadorId = jogador.Id,
                AssistJogadorId = assistente?.Id,
                Tipo = request.Tipo,
                Minuto = request.Minuto,
                Time = request.Time,
            };
            _db.PartidaEventos.Add(evento);
            await _db.SaveChangesAsync(); // gera o Id do evento, usado na cobrança do cartão

            _financeiro.CriarCobrancaDeCartao(pelada, partida, evento);
            await RecalcularPlacar(partida);
            await _db.SaveChangesAsync();
            await dbTransaction.CommitAsync();

            var nomes = new Dictionary<int, string> { [jogador.Id] = jogador.Name };
            if (assistente is not null)
                nomes[assistente.Id] = assistente.Name;

            return Ok(ParaEvento(evento, nomes));
        }

        [HttpDelete("{id}/eventos/{eventoId}")]
        public async Task<IActionResult> RemoverEvento(int peladaId, int id, int eventoId)
        {
            var pelada = await GetPeladaDoUsuario(peladaId);
            if (pelada is null)
                return NotFound();

            var partida = await _db.Partidas.SingleOrDefaultAsync(p => p.Id == id && p.PeladaId == peladaId);
            var evento = await _db.PartidaEventos.SingleOrDefaultAsync(e => e.Id == eventoId && e.PartidaId == id);
            if (partida is null || evento is null)
                return NotFound();

            _db.PartidaEventos.Remove(evento);
            await _financeiro.RemoverCobrancasAsync(_db.Cobrancas.Where(c => c.EventoId == eventoId), desligarPartida: false);
            await _db.SaveChangesAsync();

            await RecalcularPlacar(partida);
            await _db.SaveChangesAsync();

            return Ok();
        }

        // O placar passa a ser a contagem dos gols registrados.
        private async Task RecalcularPlacar(Partida partida)
        {
            var gols = await _db.PartidaEventos
                .Where(e => e.PartidaId == partida.Id && e.Tipo == "gol")
                .Select(e => e.Time)
                .ToListAsync();

            partida.ScoreTeam1 = gols.Count(t => t == 1);
            partida.ScoreTeam2 = gols.Count(t => t == 2);
        }

        private static PartidaResponse ParaResponse(Partida partida) =>
            new(partida.Id, partida.Date, partida.Time, partida.Location, partida.Status, partida.ScoreTeam1, partida.ScoreTeam2);

        private static EventoResponse ParaEvento(PartidaEvento e, IReadOnlyDictionary<int, string> nomes) =>
            new(e.Id, e.Tipo, e.JogadorId, nomes.GetValueOrDefault(e.JogadorId, "Jogador removido"),
                e.AssistJogadorId,
                e.AssistJogadorId is null ? null : nomes.GetValueOrDefault(e.AssistJogadorId.Value, "Jogador removido"),
                e.Minuto, e.Time);
    }
}
