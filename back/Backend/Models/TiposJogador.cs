namespace Backend.Models
{
    // Whitelist do tipo de jogador: só esses valores são aceitos em Jogador.Tipo.
    // O front tem a mesma lista em components/JogadoresPage.tsx (TIPOS_JOGADOR).
    public static class TiposJogador
    {
        public const string Mensalista = "mensalista"; // paga mensalidade fixa
        public const string Avulso = "avulso";         // paga por jogo

        public static readonly string[] Todos = { Mensalista, Avulso };

        public static bool EhValido(string? tipo) => tipo is not null && Todos.Contains(tipo);
    }
}
