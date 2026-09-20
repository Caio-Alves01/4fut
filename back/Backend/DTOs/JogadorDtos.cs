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

    // Papel, Status e estatísticas são opcionais: quando não vêm, o valor atual do jogador é mantido.
    public record UpdateJogadorRequest(
        string Name,
        int Age,
        string Position,
        int Number,
        string? Papel = null,
        string? Status = null,
        int? Gols = null,
        int? Assistencias = null,
        int? CartoesAmarelos = null,
        int? CartoesVermelhos = null,
        int? Jogos = null);
}
