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

        // Valores usados pelo financeiro para gerar cobranças (configurados na aba de finanças).
        // Valor 0 = não cobra (ex: pelada sem multa por cartão).
        public decimal ValorMensalidade { get; set; }
        public decimal ValorAvulso { get; set; }          // por partida em que o avulso esteve presente
        public decimal ValorCartaoAmarelo { get; set; }
        public decimal ValorCartaoVermelho { get; set; }
    }
}
