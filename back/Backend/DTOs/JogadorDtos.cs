namespace Backend.DTOs
{
    public record JogadorResponse(
        int Id,
        string Name,
        int Age,
        string Position,
        int Number,
        string Papel,
        string Status,
        int Gols,
        int Assistencias,
        int CartoesAmarelos,
        int CartoesVermelhos,
        int Jogos);

    public record CreateJogadorRequest(string Name, int Age, string Position, int Number);

    public record UpdateJogadorRequest(
        string Name,
        int Age,
        string Position,
        int Number,
        string Papel,
        string Status,
        int Gols,
        int Assistencias,
        int CartoesAmarelos,
        int CartoesVermelhos,
        int Jogos);
}
