namespace Backend.DTOs
{
    public record ConfigFinanceiraResponse(decimal ValorMensalidade, decimal ValorAvulso, decimal ValorCartaoAmarelo, decimal ValorCartaoVermelho);
    public record UpdateConfigFinanceiraRequest(decimal ValorMensalidade, decimal ValorAvulso, decimal ValorCartaoAmarelo, decimal ValorCartaoVermelho);

    public record MensalidadePagamentoResponse(int Id, int Ano, int Mes, decimal Valor, DateOnly PagoEm);

    // Um mensalista com todos os meses já pagos. "Inicio" é o mês do cadastro (primeiro mês devido).
    public record MensalistaResponse(
        int JogadorId,
        string Nome,
        string Status,
        int InicioAno,
        int InicioMes,
        List<MensalidadePagamentoResponse> Pagamentos);

    public record MensalidadesResponse(decimal ValorMensalidade, int AnoAtual, int MesAtual, List<MensalistaResponse> Mensalistas);

    public record RegistrarMensalidadeRequest(int JogadorId, int Ano, int Mes, decimal? Valor, DateOnly? PagoEm);

    // Tipo: mensalidade | avulso | cartao_amarelo | cartao_vermelho.
    // Mensalidade em aberto não tem registro próprio: vem com Ano/Mes e CobrancaId null.
    public record ItemAReceberResponse(
        string Tipo,
        int JogadorId,
        string JogadorNome,
        string Descricao,
        decimal Valor,
        DateTime Data,
        int? CobrancaId,
        int? Ano,
        int? Mes);

    public record PagarCobrancaRequest(DateOnly? PagoEm);

    // ---------- Compartilhamento do dashboard ----------

    // Token = null quando o dashboard não está compartilhado. O front monta o link com ele.
    public record CompartilhamentoResponse(string? Token);

    // O que o link público mostra. Só números: sem nome de jogador nem descrição de lançamento
    // (as descrições levam nomes, ex: "Mensalidade 10/2026 - João") e sem quem deve quanto.
    public record TransacaoPublicaResponse(string Type, decimal Amount, DateTime Date, string Category);
    public record MesPagoResponse(int Ano, int Mes);
    public record MensalistaPublicoResponse(string Status, List<MesPagoResponse> Pagamentos);

    public record DashboardPublicoResponse(
        string PeladaNome,
        int AnoAtual,
        int MesAtual,
        List<TransacaoPublicaResponse> Transacoes,
        List<MensalistaPublicoResponse> Mensalistas,
        decimal TotalAReceber);
}
