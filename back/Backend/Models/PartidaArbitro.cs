namespace Backend.Models
{
    // Juiz que apitou (ou vai apitar) a partida. Só o nome, porque o juiz da pelada
    // nem sempre é um jogador cadastrado.
    public class PartidaArbitro
    {
        public int Id { get; set; }
        public int PartidaId { get; set; }
        public string Nome { get; set; } = string.Empty;
        public string Funcao { get; set; } = FuncoesArbitro.Principal; // ver FuncoesArbitro
    }

    public static class FuncoesArbitro
    {
        public const string Principal = "principal";
        public const string Assistente = "assistente";
        public const string Quarto = "quarto";

        public static readonly string[] Todas = { Principal, Assistente, Quarto };
    }
}
