namespace Backend.Models
{
    // Presença de um jogador numa partida. Só existe linha para quem já teve a presença mexida;
    // os demais aparecem como "pendente" (ver PartidasController.Detalhes).
    public class PartidaPresenca
    {
        public int Id { get; set; }
        public int PartidaId { get; set; }
        public int JogadorId { get; set; }

        public string Confirmacao { get; set; } = "pendente"; // pendente | confirmado | recusado

        // Compareceu de fato? Só pode ser marcado com a partida finalizada.
        // Avulso presente gera cobrança automática (ver FinanceiroService).
        public bool Presente { get; set; }
    }
}
