namespace Backend.Models
{
    // Categorias de Transacao (lançamentos do caixa).
    public static class CategoriasLancamento
    {
        // Lançadas à mão na aba Lançamentos.
        public static readonly string[] Manuais = { "aluguel", "equipamento", "festa", "arbitragem", "uniforme", "outros" };

        // Criadas sozinhas ao registrar um pagamento (mensalidade, avulso, multa de cartão).
        // Não podem ser lançadas à mão, para não ficarem soltas de quem pagou.
        public const string Mensalidade = "mensalidade";
        public const string Avulso = "avulso";
        public const string MultaCartao = "multa_cartao";
    }
}
