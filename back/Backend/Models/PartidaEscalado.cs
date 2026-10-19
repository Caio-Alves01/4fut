namespace Backend.Models
{
    // Jogador escalado numa das 11 posições de um time da partida. O esquema tático
    // (4-4-2, 4-3-3...) fica na própria Partida (EsquemaTime1/EsquemaTime2).
    public class PartidaEscalado
    {
        public int Id { get; set; }
        public int PartidaId { get; set; }
        public int Time { get; set; }    // 1 | 2
        public int Posicao { get; set; } // 0..10, índice da posição no esquema (ver front: EscalacaoCartolaPage)
        public int JogadorId { get; set; }
    }
}
