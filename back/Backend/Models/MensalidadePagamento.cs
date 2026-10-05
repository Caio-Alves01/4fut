namespace Backend.Models
{
    // Pagamento da mensalidade de um jogador num mês (um registro por jogador por mês).
    public class MensalidadePagamento
    {
        public int Id { get; set; }
        public int PeladaId { get; set; }
        public int JogadorId { get; set; }

        // Mês de referência da mensalidade (não o dia em que foi paga).
        public int Ano { get; set; }
        public int Mes { get; set; }

        public decimal Valor { get; set; }
        public DateOnly PagoEm { get; set; }

        // Entrada criada no caixa por este pagamento. Apagar o pagamento apaga a entrada junto.
        public int? TransacaoId { get; set; }
    }
}
