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

        // Token do link público (somente leitura) com o placar, indicadores e escalação.
        // null = não compartilhada. Gerar um novo invalida o link anterior.
        public string? ShareToken { get; set; }

        // Exclusão lógica: excluir só esconde do usuário. O registro (e tudo ligado a ele) continua
        // no banco para auditoria. O filtro global do AppDbContext tira os excluídos de todas as consultas;
        // para ver os excluídos, use IgnoreQueryFilters().
        public DateTime? DeletedAt { get; set; }
        public int? DeletedByUserId { get; set; }
    }
}
