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
    // Valores da pelada, mensalidades e contas a receber (abas Mensalidades e A receber das finanças).
    // Os lançamentos do caixa continuam no TransacoesController.
    [ApiController]
    [Authorize]
    [Route("api/peladas/{peladaId}/financeiro")]
    public class FinanceiroController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly FinanceiroService _financeiro;

        public FinanceiroController(AppDbContext db, FinanceiroService financeiro)
        {
            _db = db;
            _financeiro = financeiro;
        }

        private async Task<Pelada?> BuscarPeladaDoUsuario(int peladaId)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var pelada = await _db.Peladas.FindAsync(peladaId);

            if (pelada is null || pelada.OwnerUserId != userId)
                return null;

            return pelada;
        }

        // ---------- Configuração de valores ----------

        [HttpGet("config")]
        public async Task<ActionResult<ConfigFinanceiraResponse>> GetConfig(int peladaId)
        {
            var pelada = await BuscarPeladaDoUsuario(peladaId);
            if (pelada is null)
                return NotFound();

            return Ok(ParaConfig(pelada));
        }

        // Mudar um valor só afeta cobranças novas; as que já foram geradas mantêm o valor da época.
        [HttpPut("config")]
        public async Task<ActionResult<ConfigFinanceiraResponse>> UpdateConfig(int peladaId, UpdateConfigFinanceiraRequest request)
        {
            var pelada = await BuscarPeladaDoUsuario(peladaId);
            if (pelada is null)
                return NotFound();

            if (request.ValorMensalidade < 0 || request.ValorAvulso < 0 ||
                request.ValorCartaoAmarelo < 0 || request.ValorCartaoVermelho < 0)
                return BadRequest("Os valores não podem ser negativos.");

            pelada.ValorMensalidade = request.ValorMensalidade;
            pelada.ValorAvulso = request.ValorAvulso;
            pelada.ValorCartaoAmarelo = request.ValorCartaoAmarelo;
            pelada.ValorCartaoVermelho = request.ValorCartaoVermelho;
            await _db.SaveChangesAsync();

            return Ok(ParaConfig(pelada));
        }

        // ---------- Mensalidades ----------

        // Todos os mensalistas (de qualquer status) com os meses pagos. O front monta a grade por ano.
        [HttpGet("mensalidades")]
        public async Task<ActionResult<MensalidadesResponse>> GetMensalidades(int peladaId)
        {
            var pelada = await BuscarPeladaDoUsuario(peladaId);
            if (pelada is null)
                return NotFound();

            var mensalistas = await _db.Jogadores
                .Where(j => j.PeladaId == peladaId && j.Tipo == TiposJogador.Mensalista)
                .OrderBy(j => j.Name)
                .ToListAsync();

            var pagamentos = await _db.MensalidadePagamentos
                .Where(m => m.PeladaId == peladaId)
                .ToListAsync();

            var resposta = mensalistas.Select(j =>
            {
                var (inicioAno, inicioMes) = FinanceiroService.MesBrasil(j.CreatedAt);
                var pagos = pagamentos
                    .Where(m => m.JogadorId == j.Id)
                    .OrderBy(m => m.Ano).ThenBy(m => m.Mes)
                    .Select(ParaPagamento)
                    .ToList();
                return new MensalistaResponse(j.Id, j.Name, j.Status, inicioAno, inicioMes, pagos);
            }).ToList();

            var hoje = FinanceiroService.HojeBrasil();
            return Ok(new MensalidadesResponse(pelada.ValorMensalidade, hoje.Year, hoje.Month, resposta));
        }

        [HttpPost("mensalidades")]
        public async Task<ActionResult<MensalidadePagamentoResponse>> RegistrarMensalidade(int peladaId, RegistrarMensalidadeRequest request)
        {
            var pelada = await BuscarPeladaDoUsuario(peladaId);
            if (pelada is null)
                return NotFound();

            var jogador = await _db.Jogadores.SingleOrDefaultAsync(j => j.Id == request.JogadorId && j.PeladaId == peladaId);
            if (jogador is null)
                return NotFound();

            if (jogador.Tipo != TiposJogador.Mensalista)
                return BadRequest("Só mensalistas pagam mensalidade.");

            if (request.Mes < 1 || request.Mes > 12 || request.Ano < 2000 || request.Ano > 2100)
                return BadRequest("Mês de referência inválido.");

            var valor = request.Valor ?? pelada.ValorMensalidade;
            if (valor <= 0)
                return BadRequest("Informe o valor da mensalidade (ou configure o valor padrão da pelada).");

            var pagoEm = request.PagoEm ?? FinanceiroService.HojeBrasil();
            if (pagoEm > FinanceiroService.HojeBrasil())
                return BadRequest("A data do pagamento não pode estar no futuro.");

            if (await _db.MensalidadePagamentos.AnyAsync(m => m.JogadorId == jogador.Id && m.Ano == request.Ano && m.Mes == request.Mes))
                return Conflict($"A mensalidade de {request.Mes:D2}/{request.Ano} desse jogador já está paga.");

            // Entrada e pagamento juntos: se um falhar, nenhum dos dois fica salvo.
            await using var dbTransaction = await _db.Database.BeginTransactionAsync();

            var transacao = _financeiro.CriarEntrada(
                peladaId, $"Mensalidade {request.Mes:D2}/{request.Ano} - {jogador.Name}",
                valor, pagoEm, CategoriasLancamento.Mensalidade, jogador.Name);
            await _db.SaveChangesAsync();

            var pagamento = new MensalidadePagamento
            {
                PeladaId = peladaId,
                JogadorId = jogador.Id,
                Ano = request.Ano,
                Mes = request.Mes,
                Valor = valor,
                PagoEm = pagoEm,
                TransacaoId = transacao.Id,
            };
            _db.MensalidadePagamentos.Add(pagamento);
            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // Mesmo mês registrado duas vezes ao mesmo tempo: o índice único barra o segundo.
                return Conflict($"A mensalidade de {request.Mes:D2}/{request.Ano} desse jogador já está paga.");
            }
            await dbTransaction.CommitAsync();

            return Ok(ParaPagamento(pagamento));
        }

        // Desfaz o pagamento: o mês volta a ficar em aberto e a entrada some do caixa.
        [HttpDelete("mensalidades/{id}")]
        public async Task<IActionResult> DesfazerMensalidade(int peladaId, int id)
        {
            var pelada = await BuscarPeladaDoUsuario(peladaId);
            if (pelada is null)
                return NotFound();

            var pagamento = await _db.MensalidadePagamentos.SingleOrDefaultAsync(m => m.Id == id && m.PeladaId == peladaId);
            if (pagamento is null)
                return NotFound();

            if (pagamento.TransacaoId is not null)
            {
                var transacao = await _db.Transacoes.FindAsync(pagamento.TransacaoId.Value);
                if (transacao is not null)
                    _db.Transacoes.Remove(transacao);
            }

            _db.MensalidadePagamentos.Remove(pagamento);
            await _db.SaveChangesAsync();

            return Ok();
        }

        // ---------- A receber ----------

        [HttpGet("a-receber")]
        public async Task<ActionResult<List<ItemAReceberResponse>>> GetAReceber(int peladaId)
        {
            var pelada = await BuscarPeladaDoUsuario(peladaId);
            if (pelada is null)
                return NotFound();

            return Ok(await _financeiro.CalcularAReceberAsync(pelada));
        }

        // Recebe uma cobrança de avulso ou cartão. (Mensalidade em aberto é paga pelo POST mensalidades.)
        [HttpPost("cobrancas/{id}/pagar")]
        public async Task<IActionResult> PagarCobranca(int peladaId, int id, PagarCobrancaRequest request)
        {
            var pelada = await BuscarPeladaDoUsuario(peladaId);
            if (pelada is null)
                return NotFound();

            var cobranca = await _db.Cobrancas.SingleOrDefaultAsync(c => c.Id == id && c.PeladaId == peladaId);
            if (cobranca is null)
                return NotFound();

            if (cobranca.PagoEm is not null)
                return Conflict("Essa cobrança já foi paga.");

            var pagoEm = request.PagoEm ?? FinanceiroService.HojeBrasil();
            if (pagoEm > FinanceiroService.HojeBrasil())
                return BadRequest("A data do pagamento não pode estar no futuro.");

            var jogador = await _db.Jogadores.FindAsync(cobranca.JogadorId);
            var nome = jogador?.Name ?? "Jogador removido";
            var categoria = cobranca.Tipo == TiposCobranca.Avulso ? CategoriasLancamento.Avulso : CategoriasLancamento.MultaCartao;

            await using var dbTransaction = await _db.Database.BeginTransactionAsync();

            var transacao = _financeiro.CriarEntrada(peladaId, $"{cobranca.Descricao} - {nome}", cobranca.Valor, pagoEm, categoria, nome);
            await _db.SaveChangesAsync();

            cobranca.PagoEm = pagoEm;
            cobranca.TransacaoId = transacao.Id;
            await _db.SaveChangesAsync();
            await dbTransaction.CommitAsync();

            return Ok();
        }

        private static ConfigFinanceiraResponse ParaConfig(Pelada pelada) =>
            new(pelada.ValorMensalidade, pelada.ValorAvulso, pelada.ValorCartaoAmarelo, pelada.ValorCartaoVermelho);

        private static MensalidadePagamentoResponse ParaPagamento(MensalidadePagamento m) =>
            new(m.Id, m.Ano, m.Mes, m.Valor, m.PagoEm);
    }
}
