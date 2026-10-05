namespace Backend.Services
{
    // Cálculo de idade a partir da data de nascimento (usado no cadastro de usuário e de jogador).
    public static class Idade
    {
        public const int Minima = 18;

        public static int Calcular(DateOnly dataNascimento)
        {
            var hoje = DateOnly.FromDateTime(DateTime.UtcNow);
            var idade = hoje.Year - dataNascimento.Year;
            if (dataNascimento > hoje.AddYears(-idade))
                idade--;
            return idade;
        }
    }
}
