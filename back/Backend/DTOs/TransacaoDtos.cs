namespace Backend.DTOs
{
    public record TransacaoResponse(int Id, string Type, string Description, decimal Amount, DateTime Date, string Category, string? PaidBy);
    public record CreateTransacaoRequest(string Type, string Description, decimal Amount, string Category, string? PaidBy);
}
