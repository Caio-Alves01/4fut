namespace Backend.Services
{
    // Validação local do CPF (só formato + dígitos verificadores), feita antes de chamar a API
    // do fornecedor para não gastar consulta com CPF digitado errado.
    public static class CpfValidator
    {
        // Remove pontos, traço e espaços: "123.456.789-09" -> "12345678909".
        public static string Normalizar(string? cpf)
        {
            return new string((cpf ?? string.Empty).Where(char.IsDigit).ToArray());
        }

        public static bool EhValido(string cpfSomenteDigitos)
        {
            if (cpfSomenteDigitos.Length != 11)
                return false;

            // 000.000.000-00, 111.111.111-11 etc. passam na conta dos dígitos, mas não são CPFs reais.
            if (cpfSomenteDigitos.All(c => c == cpfSomenteDigitos[0]))
                return false;

            var digitos = cpfSomenteDigitos.Select(c => c - '0').ToArray();

            return digitos[9] == CalcularDigito(digitos, 9) && digitos[10] == CalcularDigito(digitos, 10);
        }

        // Primeiro dígito: pesos 10..2 sobre os 9 primeiros números.
        // Segundo dígito: pesos 11..2 sobre os 10 primeiros números.
        private static int CalcularDigito(int[] digitos, int quantidade)
        {
            var soma = 0;
            for (var i = 0; i < quantidade; i++)
                soma += digitos[i] * (quantidade + 1 - i);

            var resto = soma % 11;
            return resto < 2 ? 0 : 11 - resto;
        }
    }
}
