namespace Backend.DTOs
{
    // Apelido: opcional, aparece no lugar do nome na escalação.
    // PresencaPercentual: % das partidas finalizadas (desde que o jogador entrou) em que ele compareceu;
    //   null enquanto não houver partida para medir.
    // MensalidadeEmDia: só para mensalista ativo (null para avulso, ou quando a pelada não cobra mensalidade).
    // MensalidadesEmAberto / OutrasPendencias: meses sem pagamento / avulsos e cartões não pagos.
    // PresencaPercentual, MensalidadeEmDia e as pendências servem para a prioridade na escalação.
    public record JogadorResponse(
        int Id,
        string Name,
        string? Apelido,
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
        int Jogos,
        double Nota,
        int? PresencaPercentual,
        bool? MensalidadeEmDia,
        int MensalidadesEmAberto,
        int OutrasPendencias);

    // BirthDate é nullable só para o back conseguir responder "obrigatório" quando ela não vem
    // (com DateOnly puro, a falta viraria 01/01/0001 e passaria como maior de idade).
    // Tipo: "mensalista" ou "avulso" (whitelist em Models/TiposJogador).
    // Status: "ativo", "licenca" ou "inativo" (whitelist em Models/StatusJogador); sem ele, entra como ativo.
    public record CreateJogadorRequest(string Name, DateOnly? BirthDate, string Position, int Number, string? Tipo, string? Status = null, string? Apelido = null);

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
        int? Jogos = null,
        string? Apelido = null);
}
