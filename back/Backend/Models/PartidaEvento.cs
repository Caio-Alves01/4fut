namespace Backend.Models
{
    // Gol ou cartão registrado numa partida. Cartões geram multa automática (ver FinanceiroService).
    public class PartidaEvento
    {
        public int Id { get; set; }
        public int PartidaId { get; set; }
        public int JogadorId { get; set; }
        public int? AssistJogadorId { get; set; } // só para gol

        // Só para substituição: quem entrou. JogadorId é quem saiu (e não pode voltar na partida).
        public int? EntraJogadorId { get; set; }

        public string Tipo { get; set; } = "gol"; // gol | amarelo | vermelho | substituicao
        public int? Minuto { get; set; } // opcional: a tela registra só o lance, sem minutagem
        public int Time { get; set; } = 1;        // 1 | 2
    }
}
