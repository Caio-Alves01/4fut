using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;

namespace Backend.Controllers
{
    // Páginas abertas por link, sem login. O token do link é a única credencial,
    // então aqui só sai o que o dono aceitou mostrar para terceiros.
    [AllowAnonymous]
    [ApiController]
    [EnableRateLimiting(RateLimitPolicies.Publico)]
    [Route("api/publico")]
    public class PublicoController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly FinanceiroService _financeiro;

        public PublicoController(AppDbContext db, FinanceiroService financeiro)
        {
            _db = db;
            _financeiro = financeiro;
        }

        // Dashboard financeiro compartilhado: lançamentos sem descrição/pagador, mensalistas sem nome
        // e só o total a receber. Link desativado ou trocado = 404.
        [HttpGet("financeiro/{token}")]
        public async Task<ActionResult<DashboardPublicoResponse>> Financeiro(string token)
        {
            if (!TokenCompartilhamento.FormatoValido(token))
                return NotFound();

            var pelada = await _db.Peladas.SingleOrDefaultAsync(p => p.FinanceiroShareToken == token);
            if (pelada is null)
                return NotFound();

            var transacoes = await _db.Transacoes
                .Where(t => t.PeladaId == pelada.Id)
                .OrderBy(t => t.Date)
                .Select(t => new TransacaoPublicaResponse(t.Type, t.Amount, t.Date, t.Category))
                .ToListAsync();

            var mensalistas = await _db.Jogadores
                .Where(j => j.PeladaId == pelada.Id && j.Tipo == TiposJogador.Mensalista)
                .Select(j => new { j.Id, j.Status })
                .ToListAsync();
            var pagamentos = await _db.MensalidadePagamentos
                .Where(m => m.PeladaId == pelada.Id)
                .Select(m => new { m.JogadorId, m.Ano, m.Mes })
                .ToListAsync();
            var mensalistasPublicos = mensalistas
                .Select(j => new MensalistaPublicoResponse(
                    j.Status,
                    pagamentos.Where(p => p.JogadorId == j.Id).Select(p => new MesPagoResponse(p.Ano, p.Mes)).ToList()))
                .ToList();

            var aReceber = await _financeiro.CalcularAReceberAsync(pelada);
            var hoje = FinanceiroService.HojeBrasil();

            return Ok(new DashboardPublicoResponse(
                pelada.Name, hoje.Year, hoje.Month, transacoes, mensalistasPublicos, aReceber.Sum(i => i.Valor)));
        }

        // Partida compartilhada: placar, lances (para os indicadores e as marcações no campo), escalação e juízes.
        // Sem presença, confirmações, tipo de jogador ou nota. Link desativado ou trocado = 404.
        [HttpGet("partida/{token}")]
        public async Task<ActionResult<PartidaPublicaResponse>> Partida(string token)
        {
            if (!TokenCompartilhamento.FormatoValido(token))
                return NotFound();

            var partida = await _db.Partidas.SingleOrDefaultAsync(p => p.ShareToken == token);
            if (partida is null)
                return NotFound();

            // Pelada excluída (exclusão lógica): o link das partidas dela também para de funcionar.
            var pelada = await _db.Peladas.SingleOrDefaultAsync(pel => pel.Id == partida.PeladaId);
            if (pelada is null)
                return NotFound();
            var escalados = await _db.PartidaEscalados.Where(e => e.PartidaId == partida.Id).ToListAsync();
            var eventos = await _db.PartidaEventos.Where(e => e.PartidaId == partida.Id).OrderBy(e => e.Id).ToListAsync();

            // Só os jogadores que aparecem no campo ou em algum lance.
            var ids = escalados.Select(e => e.JogadorId)
                .Concat(eventos.Select(e => e.JogadorId))
                .Concat(eventos.Where(e => e.AssistJogadorId is not null).Select(e => e.AssistJogadorId!.Value))
                .Concat(eventos.Where(e => e.EntraJogadorId is not null).Select(e => e.EntraJogadorId!.Value))
                .Distinct()
                .ToList();
            var jogadores = await _db.Jogadores
                .Where(j => j.PeladaId == partida.PeladaId && ids.Contains(j.Id))
                .Select(j => new JogadorPublicoResponse(j.Id, j.Name, j.Apelido, j.Position, j.Number))
                .ToListAsync();

            return Ok(new PartidaPublicaResponse(
                pelada.Name,
                PartidasController.ParaResponse(partida),
                PartidasController.ParaEscalacao(partida, escalados),
                eventos.Select(e => new EventoPublicoResponse(e.Id, e.Tipo, e.JogadorId, e.AssistJogadorId, e.EntraJogadorId, e.Time)).ToList(),
                jogadores,
                await PartidasController.ListarArbitros(_db, partida.Id)));
        }
    }
}
