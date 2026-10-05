namespace Backend.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Quando a maioridade foi confirmada via CPF + data de nascimento no cadastro.
        // O CPF e a data em si não são guardados, só o resultado. Null = conta antiga, sem verificação.
        public DateTime? AgeVerifiedAt { get; set; }

        // HMAC do CPF (ver CpfHasher), só para impedir duas contas com o mesmo CPF. Null = conta antiga.
        public string? CpfHash { get; set; }

        // Código de 6 dígitos enviado por e-mail para redefinir a senha (fluxo "esqueci minha senha").
        public string? ResetCode { get; set; }
        public DateTime? ResetCodeExpiresAt { get; set; }
    }
}
