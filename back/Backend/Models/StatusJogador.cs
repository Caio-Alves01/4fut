namespace Backend.Models
{
    // Whitelist do status do jogador: só esses valores são aceitos em Jogador.Status.
    // O front tem a mesma lista em components/JogadoresPage.tsx (STATUS_JOGADOR).
    public static class StatusJogador
    {
        public const string Ativo = "ativo";
        public const string Licenca = "licenca"; // afastado por um tempo (lesão, viagem...), mas volta
        public const string Inativo = "inativo";

        public static readonly string[] Todos = { Ativo, Licenca, Inativo };

        public static bool EhValido(string? status) => status is not null && Todos.Contains(status);
    }
}
