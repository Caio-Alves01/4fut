using System.Security.Cryptography;

namespace Backend.Services
{
    // Token dos links públicos (dashboard financeiro e partida). O token é a única credencial do link.
    public static class TokenCompartilhamento
    {
        public const int Tamanho = 64;

        // 32 bytes aleatórios em hexadecimal minúsculo (64 caracteres): impossível de adivinhar. Hex e não
        // base64 porque o MySQL compara texto sem diferenciar maiúsculas de minúsculas.
        public static string Gerar() =>
            Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();

        // Descarta na hora o que nem tem o formato de um token (evita ir ao banco à toa).
        public static bool FormatoValido(string token) =>
            token.Length == Tamanho && token.All(c => c is >= '0' and <= '9' or >= 'a' and <= 'f');
    }
}
