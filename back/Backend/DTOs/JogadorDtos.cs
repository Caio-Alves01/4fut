namespace Backend.DTOs
{
    public record JogadorResponse(
        int Id,
        string Name,
        int Age,
        DateOnly? BirthDate,
        string Position,
        int Number,
        string Papel,
        string Tipo,
        string Status,
        int Gols,
        int Assistencias,
        int CartoesAmarelos,
        int CartoesVermelhos,
        int Jogos);

    // BirthDate é nullable só para o back conseguir responder "obrigatório" quando ela não vem
    // (com DateOnly puro, a falta viraria 01/01/0001 e passaria como maior de idade).
    // Tipo: "mensalista" ou "avulso" (whitelist em Models/TiposJogador).
    // Status: "ativo", "licenca" ou "inativo" (whitelist em Models/StatusJogador); sem ele, entra como ativo.
    public record CreateJogadorRequest(string Name, DateOnly? BirthDate, string Position, int Number, string? Tipo, string? Status = null);

    // Papel, Status e estatísticas são opcionais: quando não vêm, o valor atual do jogador é mantido.
    public record UpdateJogadorRequest(
        string Name,
        DateOnly? BirthDate,
        string Position,
        int Number,
        string? Tipo,
        string? Papel = null,
        string? Status = null,
        int? Gols = null,
        int? Assistencias = null,
        int? CartoesAmarelos = null,
        int? CartoesVermelhos = null,
        int? Jogos = null);
}
