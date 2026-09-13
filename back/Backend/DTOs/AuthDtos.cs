namespace Backend.DTOs
{
    public record RegisterRequest(string Name, string Email, string Password);
    public record LoginRequest(string Email, string Password);
    public record AuthResponse(string Token);
    public record UserResponse(int Id, string Name, string Email, DateTime CreatedAt);
    public record UpdateMeRequest(string Name, string Email);
    public record ForgotPasswordRequest(string Email);
    public record ResetPasswordRequest(string Email, string Code, string NewPassword);
}
