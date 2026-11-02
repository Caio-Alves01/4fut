namespace Backend.Services
{
    // Nomes e limites das políticas de rate limit (registradas no Program.cs).
    public static class RateLimitPolicies
    {
        // Cadastro: no máximo 5 tentativas por IP a cada 15 minutos.
        public const string Cadastro = "cadastro";
        public const int CadastroLimite = 5;
        public static readonly TimeSpan CadastroJanela = TimeSpan.FromMinutes(15);

        // Link público do dashboard financeiro (sem login): no máximo 60 acessos por IP por minuto,
        // o que também atrapalha quem tentar adivinhar tokens.
        public const string Publico = "publico";
        public const int PublicoLimite = 60;
        public static readonly TimeSpan PublicoJanela = TimeSpan.FromMinutes(1);
    }
}
