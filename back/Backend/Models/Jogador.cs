namespace Backend.Models
{
    public class Jogador
    {
        public int Id { get; set; }
        public int PeladaId { get; set; }

        public string Name { get; set; } = string.Empty;

        // Como o jogador é chamado na pelada (ex: "Caio Almeida Alves" -> "Caiozinho").
        // Opcional; quando existe, é o que aparece no campo da escalação.
        public string? Apelido { get; set; }
        public const int ApelidoMaximo = 30;
        public int Age { get; set; }

        // A idade passa a vir daqui (ver Idade.Calcular). Age continua só para jogadores cadastrados
        // antes da data de nascimento existir, que ficam com BirthDate null.
        public DateOnly? BirthDate { get; set; }

        // Sigla da posição: GOL/ZAG/LAT/VOL/MEI/ATA/PON (ver front: components/positions.ts)
        public string Position { get; set; } = string.Empty;
        public int Number { get; set; }

        public string Papel { get; set; } = "membro"; // organizador | membro
        public string Tipo { get; set; } = TiposJogador.Mensalista; // ver TiposJogador (whitelist)
        public string Status { get; set; } = StatusJogador.Ativo; // ver StatusJogador (whitelist)

        public int Gols { get; set; }
        public int Assistencias { get; set; }
        public int CartoesAmarelos { get; set; }
        public int CartoesVermelhos { get; set; }
        public int Jogos { get; set; }

        // Mensalista passa a dever mensalidade a partir do mês do cadastro.
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
