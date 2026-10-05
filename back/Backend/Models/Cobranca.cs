namespace Backend.Models
{
    // Valor que um jogador deve por causa de uma partida: avulso presente ou cartão recebido.
    // Criada automaticamente pelo FinanceiroService; mensalidades não usam esta tabela.
    public class Cobranca
    {
        public int Id { get; set; }
        public int PeladaId { get; set; }
        public int JogadorId { get; set; }

        // Partida/evento que originou. Se a partida ou o evento forem apagados depois de pago,
        // a cobrança paga fica (o dinheiro entrou) e esses campos são zerados.
        public int? PartidaId { get; set; }
        public int? EventoId { get; set; }

        public string Tipo { get; set; } = TiposCobranca.Avulso; // ver TiposCobranca
        public string Descricao { get; set; } = string.Empty;
        public decimal Valor { get; set; }
        public DateTime Data { get; set; } // data da partida

        public DateOnly? PagoEm { get; set; } // null = pendente
        public int? TransacaoId { get; set; }
    }

    public static class TiposCobranca
    {
        public const string Avulso = "avulso";
        public const string CartaoAmarelo = "cartao_amarelo";
        public const string CartaoVermelho = "cartao_vermelho";
    }
}
