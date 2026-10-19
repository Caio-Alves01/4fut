namespace Backend.Models
{
    public class Partida
    {
        public int Id { get; set; }
        public int PeladaId { get; set; }

        public DateTime Date { get; set; }
        public string Time { get; set; } = string.Empty; // "HH:mm"
        public string Location { get; set; } = string.Empty;

        public string Status { get; set; } = "agendada"; // agendada | em_andamento | finalizada

        public int? ScoreTeam1 { get; set; }
        public int? ScoreTeam2 { get; set; }

        // Esquema tático de cada time na escalação (ver PartidasController.Esquemas).
        public string EsquemaTime1 { get; set; } = "4-4-2";
        public string EsquemaTime2 { get; set; } = "4-4-2";

        // Quando a partida foi agendada (aparece nas Atividades Recentes da pelada).
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
