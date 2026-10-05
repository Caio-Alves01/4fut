namespace Backend.DTOs
{
    public record TransacaoResponse(int Id, string Type, string Description, decimal Amount, DateTime Date, string Category, string? PaidBy);
    // Date é opcional: sem ela, o lançamento fica com a data de hoje.
    public record CreateTransacaoRequest(string Type, string Description, decimal Amount, string Category, string? PaidBy, DateOnly? Date = null);
}
