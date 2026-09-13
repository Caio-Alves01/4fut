using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;

namespace Backend.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/peladas/{peladaId}/transacoes")]
    public class TransacoesController : ControllerBase
    {
        private readonly AppDbContext _db;

        public TransacoesController(AppDbContext db)
        {
            _db = db;
        }

        // Confere que a pelada existe e pertence ao usuário logado. Se não, retorna o motivo pra recusar a requisição.
        private async Task<Pelada?> BuscarPeladaDoUsuario(int peladaId)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var pelada = await _db.Peladas.FindAsync(peladaId);

            if (pelada is null || pelada.OwnerUserId != userId)
                return null;

            return pelada;
        }

        [HttpGet]
        public async Task<ActionResult<List<TransacaoResponse>>> Listar(int peladaId)
        {
            var pelada = await BuscarPeladaDoUsuario(peladaId);
            if (pelada is null)
                return NotFound();

            var transacoes = await _db.Transacoes
                .Where(t => t.PeladaId == peladaId)
                .OrderByDescending(t => t.Date)
                .ToListAsync();

            var resposta = new List<TransacaoResponse>();
            foreach (var transacao in transacoes)
            {
                resposta.Add(new TransacaoResponse(
                    transacao.Id,
                    transacao.Type,
                    transacao.Description,
                    transacao.Amount,
                    transacao.Date,
                    transacao.Category,
                    transacao.PaidBy));
            }

            return Ok(resposta);
        }

        [HttpPost]
        public async Task<ActionResult<TransacaoResponse>> Criar(int peladaId, CreateTransacaoRequest request)
        {
            var pelada = await BuscarPeladaDoUsuario(peladaId);
            if (pelada is null)
                return NotFound();

            if (string.IsNullOrWhiteSpace(request.Description) || string.IsNullOrWhiteSpace(request.Category))
                return BadRequest("Descrição e categoria são obrigatórias.");

            if (request.Type != "entrada" && request.Type != "saida")
                return BadRequest("Tipo deve ser 'entrada' ou 'saida'.");

            var transacao = new Transacao
            {
                PeladaId = peladaId,
                Type = request.Type,
                Description = request.Description.Trim(),
                Amount = request.Amount,
                Date = DateTime.UtcNow,
                Category = request.Category,
                PaidBy = request.PaidBy,
            };

            _db.Transacoes.Add(transacao);
            await _db.SaveChangesAsync();

            return Ok(new TransacaoResponse(
                transacao.Id,
                transacao.Type,
                transacao.Description,
                transacao.Amount,
                transacao.Date,
                transacao.Category,
                transacao.PaidBy));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Remover(int peladaId, int id)
        {
            var pelada = await BuscarPeladaDoUsuario(peladaId);
            if (pelada is null)
                return NotFound();

            var transacao = await _db.Transacoes.SingleOrDefaultAsync(t => t.Id == id && t.PeladaId == peladaId);
            if (transacao is null)
                return NotFound();

            _db.Transacoes.Remove(transacao);
            await _db.SaveChangesAsync();

            return Ok();
        }
    }
}
