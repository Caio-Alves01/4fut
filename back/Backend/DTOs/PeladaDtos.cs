namespace Backend.DTOs
{
    public record CreatePeladaRequest(string Name, string Description, List<string> DaysOfWeek);
    public record UpdatePeladaRequest(string Name, string Description, string Local, string Horario);

    public record PeladaResponse(
        int Id,
        string Name,
        string Description,
        List<string> DaysOfWeek,
        string Local,
        string Horario,
        bool Active,
        DateTime CreatedAt,
        int TotalPlayers,
        int TotalMatches,
        decimal Balance
    );

    public record NextMatchInfo(DateTime Date, string Time, string Location);

    public record ArtilheiroInfo(string Name, int Gols);
    public record MelhorJogadorInfo(string Name, double Nota);
    public record MaisIndisciplinadoInfo(string Name, int Amarelos, int Vermelhos, int Total);

    public record DestaquesInfo(
        ArtilheiroInfo? Artilheiro,
        MelhorJogadorInfo? MelhorJogador,
        MaisIndisciplinadoInfo? MaisIndisciplinado,
        int Inadimplentes
    );

    public record PeladaDetailResponse(
        int Id,
        string Name,
        string Description,
        List<string> DaysOfWeek,
        string Local,
        string Horario,
        bool Active,
        DateTime CreatedAt,
        int TotalPlayers,
        int TotalMatches,
        decimal Balance,
        NextMatchInfo? NextMatch,
        DestaquesInfo Destaques
    );
}
