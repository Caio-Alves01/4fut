namespace Backend.DTOs
{
    public record PartidaResponse(int Id, DateTime Date, string Time, string Location, string Status, int? ScoreTeam1, int? ScoreTeam2);
    public record CreatePartidaRequest(DateTime Date, string Time, string Location);
    public record UpdatePartidaRequest(DateTime Date, string Time, string Location, string Status, int? ScoreTeam1, int? ScoreTeam2);
}
