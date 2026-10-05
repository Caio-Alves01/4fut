namespace Backend.DTOs
{
    public record PartidaResponse(int Id, DateTime Date, string Time, string Location, string Status, int? ScoreTeam1, int? ScoreTeam2);
    public record CreatePartidaRequest(DateTime Date, string Time, string Location);
    public record UpdatePartidaRequest(DateTime Date, string Time, string Location, string Status, int? ScoreTeam1, int? ScoreTeam2);

    // Presença de cada jogador na partida. TipoJogador (mensalista/avulso) ajuda a tela a mostrar quem gera cobrança.
    public record PresencaResponse(int JogadorId, string Nome, string TipoJogador, string Confirmacao, bool Presente);
    public record UpdatePresencaRequest(string Confirmacao, bool Presente);

    public record EventoResponse(int Id, string Tipo, int JogadorId, string JogadorNome, int? AssistJogadorId, string? AssistJogadorNome, int Minuto, int Time);
    public record CreateEventoRequest(string Tipo, int JogadorId, int? AssistJogadorId, int Minuto, int Time);

    public record PartidaDetalhesResponse(PartidaResponse Partida, List<PresencaResponse> Presencas, List<EventoResponse> Eventos);
}
