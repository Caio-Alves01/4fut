using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;

namespace Backend.Services
{
    // Regras do financeiro que são usadas por mais de um controller:
    // geração automática de cobranças a partir das partidas, pagamentos e o cálculo do "a receber".
    // Nenhum método aqui chama SaveChanges: quem chama decide quando salvar (tudo numa vez só).
    public class FinanceiroService
    {
        private static readonly TimeZoneInfo FusoBrasil = CarregarFusoBrasil();

        private readonly AppDbContext _db;

        public FinanceiroService(AppDbContext db)
        {
            _db = db;
        }

        // ---------- Datas ----------

        public static DateOnly HojeBrasil() =>
            DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, FusoBrasil));

        // Mês (no horário de Brasília) de uma data gravada em UTC, ex: cadastro às 22h do dia 31 em Brasília
        // já é dia 1 em UTC, mas a mensalidade é do mês 31.
        public static (int Ano, int Mes) MesBrasil(DateTime utc)
        {
            var local = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), FusoBrasil);
            return (local.Year, local.Month);
        }

        private static TimeZoneInfo CarregarFusoBrasil()
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo"); }
            catch (TimeZoneNotFoundException) { return TimeZoneInfo.FindSystemTimeZoneById("E. South America Standard Time"); }
        }

        // ---------- Cobranças automáticas ----------

        // Garante que exista (ou não) a cobrança de avulso deste jogador nesta partida.
        // Cobra quando: partida finalizada + jogador presente + jogador avulso + pelada com valor de avulso.
        // Se deixou de valer (ex: desmarcou presente), apaga a cobrança só se ainda não foi paga.
        public async Task SincronizarAvulsoAsync(Pelada pelada, Partida partida, Jogador jogador, PartidaPresenca? presenca)
        {
            var deveCobrar =
                partida.Status == "finalizada" &&
                presenca is not null && presenca.Presente &&
                jogador.Tipo == TiposJogador.Avulso &&
                pelada.ValorAvulso > 0;

            var existente = await _db.Cobrancas.SingleOrDefaultAsync(c =>
                c.PartidaId == partida.Id && c.JogadorId == jogador.Id && c.Tipo == TiposCobranca.Avulso);

            if (deveCobrar && existente is null)
            {
                _db.Cobrancas.Add(new Cobranca
                {
                    PeladaId = pelada.Id,
                    JogadorId = jogador.Id,
                    PartidaId = partida.Id,
                    Tipo = TiposCobranca.Avulso,
                    Descricao = $"Avulso - partida de {partida.Date:dd/MM/yyyy}",
                    Valor = pelada.ValorAvulso,
                    Data = partida.Date,
                });
            }
            else if (!deveCobrar && existente is not null && existente.PagoEm is null)
            {
                _db.Cobrancas.Remove(existente);
            }
        }

        // Ressincroniza os avulsos de uma partida inteira (usado quando o status dela muda).
        public async Task SincronizarAvulsosDaPartidaAsync(Pelada pelada, Partida partida)
        {
            var presencas = await _db.PartidaPresencas.Where(p => p.PartidaId == partida.Id).ToListAsync();
            var jogadorIds = presencas.Select(p => p.JogadorId).ToList();
            var jogadores = await _db.Jogadores.Where(j => jogadorIds.Contains(j.Id)).ToListAsync();

            foreach (var jogador in jogadores)
                await SincronizarAvulsoAsync(pelada, partida, jogador, presencas.Single(p => p.JogadorId == jogador.Id));
        }

        // Cartão registrado vira multa, se a pelada tiver valor configurado para aquele cartão.
        public void CriarCobrancaDeCartao(Pelada pelada, Partida partida, PartidaEvento evento)
        {
            var (tipo, valor, nome) = evento.Tipo switch
            {
                "amarelo" => (TiposCobranca.CartaoAmarelo, pelada.ValorCartaoAmarelo, "Cartão amarelo"),
                "vermelho" => (TiposCobranca.CartaoVermelho, pelada.ValorCartaoVermelho, "Cartão vermelho"),
                _ => (null, 0m, null),
            };

            if (tipo is null || valor <= 0)
                return;

            _db.Cobrancas.Add(new Cobranca
            {
                PeladaId = pelada.Id,
                JogadorId = evento.JogadorId,
                PartidaId = partida.Id,
                EventoId = evento.Id,
                Tipo = tipo,
                Descricao = $"{nome} - partida de {partida.Date:dd/MM/yyyy}",
                Valor = valor,
                Data = partida.Date,
            });
        }

        // Evento/partida apagados: o que ainda não foi pago some; o que já foi pago fica (o dinheiro entrou),
        // só perde a ligação com a origem.
        public async Task RemoverCobrancasAsync(IQueryable<Cobranca> cobrancas, bool desligarPartida)
        {
            foreach (var cobranca in await cobrancas.ToListAsync())
            {
                if (cobranca.PagoEm is null)
                {
                    _db.Cobrancas.Remove(cobranca);
                    continue;
                }

                cobranca.EventoId = null;
                if (desligarPartida)
                    cobranca.PartidaId = null;
            }
        }

        // ---------- Pagamentos ----------

        // Todo pagamento recebido entra no caixa como uma entrada em Lançamentos.
        public Transacao CriarEntrada(int peladaId, string descricao, decimal valor, DateOnly pagoEm, string categoria, string jogadorNome)
        {
            var transacao = new Transacao
            {
                PeladaId = peladaId,
                Type = "entrada",
                Description = descricao,
                Amount = valor,
                // Meio-dia para a data não "voltar um dia" ao ser convertida de fuso no front.
                Date = pagoEm.ToDateTime(new TimeOnly(12, 0)),
                Category = categoria,
                PaidBy = jogadorNome,
            };

            _db.Transacoes.Add(transacao);
            return transacao;
        }

        // ---------- A receber ----------

        public async Task<List<ItemAReceberResponse>> CalcularAReceberAsync(Pelada pelada)
        {
            var itens = new List<ItemAReceberResponse>();
            var jogadores = await _db.Jogadores.Where(j => j.PeladaId == pelada.Id).ToListAsync();

            // Mensalidades em aberto: de cada mensalista ativo, todo mês desde o cadastro até o mês atual
            // que não tem pagamento. Sem valor de mensalidade configurado, não há o que cobrar.
            if (pelada.ValorMensalidade > 0)
            {
                var pagos = await _db.MensalidadePagamentos
                    .Where(m => m.PeladaId == pelada.Id)
                    .Select(m => new { m.JogadorId, m.Ano, m.Mes })
                    .ToListAsync();
                var mesesPagos = pagos.Select(m => (m.JogadorId, m.Ano, m.Mes)).ToHashSet();

                var hoje = HojeBrasil();
                var mensalistas = jogadores.Where(j => j.Tipo == TiposJogador.Mensalista && j.Status == StatusJogador.Ativo);

                foreach (var jogador in mensalistas)
                {
                    var (ano, mes) = MesBrasil(jogador.CreatedAt);
                    while (ano < hoje.Year || (ano == hoje.Year && mes <= hoje.Month))
                    {
                        if (!mesesPagos.Contains((jogador.Id, ano, mes)))
                        {
                            itens.Add(new ItemAReceberResponse(
                                "mensalidade", jogador.Id, jogador.Name,
                                $"Mensalidade {mes:D2}/{ano}", pelada.ValorMensalidade,
                                new DateTime(ano, mes, 1), null, ano, mes));
                        }

                        mes++;
                        if (mes > 12) { mes = 1; ano++; }
                    }
                }
            }

            var nomes = jogadores.ToDictionary(j => j.Id, j => j.Name);
            var cobrancas = await _db.Cobrancas
                .Where(c => c.PeladaId == pelada.Id && c.PagoEm == null)
                .ToListAsync();

            foreach (var cobranca in cobrancas)
            {
                itens.Add(new ItemAReceberResponse(
                    cobranca.Tipo, cobranca.JogadorId, nomes.GetValueOrDefault(cobranca.JogadorId, "Jogador removido"),
                    cobranca.Descricao, cobranca.Valor, cobranca.Data, cobranca.Id, null, null));
            }

            return itens.OrderBy(i => i.Data).ThenBy(i => i.JogadorNome).ToList();
        }
    }
}
