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
    }
}
