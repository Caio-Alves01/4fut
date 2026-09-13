namespace Backend.Models
{
    public class Jogador
    {
        public int Id { get; set; }
        public int PeladaId { get; set; }

        public string Name { get; set; } = string.Empty;
        public int Age { get; set; }

        // Sigla da posição: GOL/ZAG/LAT/VOL/MEI/ATA/PON (ver front: components/positions.ts)
        public string Position { get; set; } = string.Empty;
        public int Number { get; set; }

        public string Papel { get; set; } = "membro"; // organizador | membro
        public string Status { get; set; } = "ativo"; // ativo | pendente | inadimplente | inativo

        public int Gols { get; set; }
        public int Assistencias { get; set; }
        public int CartoesAmarelos { get; set; }
        public int CartoesVermelhos { get; set; }
        public int Jogos { get; set; }
    }
}
