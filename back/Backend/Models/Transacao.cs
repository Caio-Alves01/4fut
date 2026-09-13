namespace Backend.Models
{
    public class Transacao
    {
        public int Id { get; set; }
        public int PeladaId { get; set; }

        public string Type { get; set; } = "entrada"; // entrada | saida
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime Date { get; set; } = DateTime.UtcNow;
        public string Category { get; set; } = string.Empty;
        public string? PaidBy { get; set; }
    }
}
