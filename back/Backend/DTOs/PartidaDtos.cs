namespace Backend.DTOs
{
    public record PartidaResponse(int Id, DateTime Date, string Time, string Location, string Status, int? ScoreTeam1, int? ScoreTeam2);
    public record CreatePartidaRequest(DateTime Date, string Time, string Location);
    public record UpdatePartidaRequest(DateTime Date, string Time, string Location, string Status, int? ScoreTeam1, int? ScoreTeam2);

    // Presença de cada jogador na partida. TipoJogador (mensalista/avulso) ajuda a tela a mostrar quem gera cobrança.
    public record PresencaResponse(int JogadorId, string Nome, string TipoJogador, string Confirmacao, bool Presente);
    public record UpdatePresencaRequest(string Confirmacao, bool Presente);

    // Substituição: JogadorId/JogadorNome = quem saiu, EntraJogadorId/EntraJogadorNome = quem entrou.
    public record EventoResponse(int Id, string Tipo, int JogadorId, string JogadorNome, int? AssistJogadorId, string? AssistJogadorNome, int? Minuto, int Time, int? EntraJogadorId, string? EntraJogadorNome);
    public record CreateEventoRequest(string Tipo, int JogadorId, int? AssistJogadorId, int Time, int? Minuto = null, int? EntraJogadorId = null);

    // Escalação de um time: Jogadores tem sempre 11 itens, um por posição do esquema (null = posição vazia).
    public record EscalacaoTimeDto(int Time, string Esquema, List<int?> Jogadores);
    public record UpdateEscalacaoRequest(List<EscalacaoTimeDto> Times);

    public record PartidaDetalhesResponse(PartidaResponse Partida, List<PresencaResponse> Presencas, List<EventoResponse> Eventos, List<EscalacaoTimeDto> Escalacao);
}
