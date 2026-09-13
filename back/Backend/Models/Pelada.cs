namespace Backend.Models
{
    public class Pelada
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;

        // Dias da semana separados por vírgula, ex: "sabado,domingo"
        public string DaysOfWeek { get; set; } = string.Empty;

        public string Local { get; set; } = string.Empty;
        public string Horario { get; set; } = string.Empty;
        public bool Active { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Dono da pelada (quem criou) — só ele pode gerenciar por enquanto.
        public int OwnerUserId { get; set; }
    }
}
