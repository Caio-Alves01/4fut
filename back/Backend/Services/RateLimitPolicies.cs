namespace Backend.Services
{
    // Nomes e limites das políticas de rate limit (registradas no Program.cs).
    public static class RateLimitPolicies
    {
        // Cadastro: no máximo 5 tentativas por IP a cada 15 minutos.
        public const string Cadastro = "cadastro";
        public const int CadastroLimite = 5;
        public static readonly TimeSpan CadastroJanela = TimeSpan.FromMinutes(15);
    }
}
