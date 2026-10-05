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

            if (!CategoriasLancamento.Manuais.Contains(request.Category))
                return BadRequest("Categoria inválida. Mensalidades, avulsos e multas são lançados pelas abas Mensalidades e A receber.");

            if (request.Amount <= 0)
                return BadRequest("O valor precisa ser maior que zero.");

            var data = request.Date ?? FinanceiroService.HojeBrasil();
            if (data > FinanceiroService.HojeBrasil())
                return BadRequest("A data do lançamento não pode estar no futuro.");

            var transacao = new Transacao
            {
                PeladaId = peladaId,
                Type = request.Type,
                Description = request.Description.Trim(),
                Amount = request.Amount,
                // Meio-dia para a data não "voltar um dia" ao ser convertida de fuso no front.
                Date = data.ToDateTime(new TimeOnly(12, 0)),
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

            // Entrada gerada por um pagamento: apagar o lançamento desfaz o pagamento junto,
            // senão o jogador apareceria como pago sem o dinheiro no caixa.
            var mensalidade = await _db.MensalidadePagamentos.SingleOrDefaultAsync(m => m.TransacaoId == transacao.Id);
            if (mensalidade is not null)
                _db.MensalidadePagamentos.Remove(mensalidade);

            var cobranca = await _db.Cobrancas.SingleOrDefaultAsync(c => c.TransacaoId == transacao.Id);
            if (cobranca is not null)
            {
                cobranca.PagoEm = null;
                cobranca.TransacaoId = null;
            }

            _db.Transacoes.Remove(transacao);
            await _db.SaveChangesAsync();

            return Ok();
        }
    }
}
