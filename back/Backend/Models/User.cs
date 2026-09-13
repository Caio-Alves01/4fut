namespace Backend.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Código de 6 dígitos enviado por e-mail para redefinir a senha (fluxo "esqueci minha senha").
        public string? ResetCode { get; set; }
        public DateTime? ResetCodeExpiresAt { get; set; }
    }
}
