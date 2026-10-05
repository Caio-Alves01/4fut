using System.Security.Cryptography;
using System.Text;

namespace Backend.Services
{
    // Transforma o CPF num HMAC-SHA256 para poder barrar contas duplicadas sem guardar o número.
    // Sem a chave não dá para refazer o hash, então quem vê só o banco não consegue testar CPFs.
    // Chave vem de "CpfVerification:HashKey". Se ela mudar, os hashes antigos deixam de bater.
    public class CpfHasher
    {
        // Só usada em Development quando a chave não está configurada.
        private const string ChaveDev = "4fut-dev-cpf-hash-key-nao-usar-em-producao";

        private readonly byte[] _chave;

        public CpfHasher(IConfiguration configuration, IHostEnvironment environment)
        {
            var chave = configuration["CpfVerification:HashKey"];

            if (string.IsNullOrWhiteSpace(chave))
            {
                if (!environment.IsDevelopment())
                    throw new InvalidOperationException("Configure CpfVerification:HashKey para gerar o hash do CPF.");

                Console.WriteLine("[CpfHasher] CpfVerification:HashKey não configurada. Usando chave fixa de dev.");
                chave = ChaveDev;
            }

            _chave = Encoding.UTF8.GetBytes(chave);
        }

        // Recebe o CPF só com dígitos e devolve 64 caracteres hexadecimais.
        public string Hash(string cpfSomenteDigitos)
        {
            var hash = HMACSHA256.HashData(_chave, Encoding.UTF8.GetBytes(cpfSomenteDigitos));
            return Convert.ToHexString(hash);
        }
    }
}
