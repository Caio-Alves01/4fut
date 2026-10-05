namespace Backend.Models
{
    // Gol ou cartão registrado numa partida. Cartões geram multa automática (ver FinanceiroService).
    public class PartidaEvento
    {
        public int Id { get; set; }
        public int PartidaId { get; set; }
        public int JogadorId { get; set; }
        public int? AssistJogadorId { get; set; } // só para gol

        public string Tipo { get; set; } = "gol"; // gol | amarelo | vermelho
        public int Minuto { get; set; }
        public int Time { get; set; } = 1;        // 1 | 2
    }
}
