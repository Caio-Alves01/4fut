using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json;

namespace Backend.Services
{
    public enum ResultadoVerificacaoIdade
    {
        Aprovado,

        // CPF irregular, data de nascimento diferente da cadastrada na Receita ou menor de 18 anos.
        // O motivo exato não é exposto ao usuário (mensagem neutra).
        Reprovado,

        // A API do fornecedor falhou (timeout, fora do ar, erro de credencial...). Não é culpa do usuário.
        Indisponivel,
    }

    // Verifica maioridade consultando o CPF numa API de fornecedor (bureau de dados).
    // Configuração vem da seção "CpfVerification" do appsettings.
    public class CpfVerificationService
    {
        private readonly HttpClient _http;
        private readonly IConfiguration _configuration;
        private readonly ILogger<CpfVerificationService> _logger;

        public CpfVerificationService(HttpClient http, IConfiguration configuration, ILogger<CpfVerificationService> logger)
        {
            _http = http;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<ResultadoVerificacaoIdade> VerificarAsync(string cpf, DateOnly dataNascimentoInformada)
        {
            if (Idade.Calcular(dataNascimentoInformada) < Idade.Minima)
                return ResultadoVerificacaoIdade.Reprovado;

            var section = _configuration.GetSection("CpfVerification");
            var baseUrl = section["BaseUrl"];
            var apiKey = section["ApiKey"];

            if (string.IsNullOrWhiteSpace(baseUrl) || string.IsNullOrWhiteSpace(apiKey))
            {
                // Sem fornecedor configurado (ex: ambiente de dev): confia na data informada,
                // igual ao EmailService que só grava o e-mail em arquivo.
                Console.WriteLine("[CpfVerificationService] Fornecedor não configurado. Aprovando só pela data informada.");
                return ResultadoVerificacaoIdade.Aprovado;
            }

            ConsultaCpf? consulta;
            try
            {
                consulta = await ConsultarFornecedorAsync(baseUrl, apiKey, cpf);
            }
            // Resposta fora do formato esperado (campo faltando, data inválida) também conta como indisponível.
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException
                                          or KeyNotFoundException or InvalidOperationException or FormatException)
            {
                _logger.LogError(ex, "Falha ao consultar a API de verificação de CPF.");
                return ResultadoVerificacaoIdade.Indisponivel;
            }

            // CPF não encontrado na base do fornecedor.
            if (consulta is null)
                return ResultadoVerificacaoIdade.Reprovado;

            var aprovado =
                consulta.Regular &&
                consulta.DataNascimento == dataNascimentoInformada &&
                Idade.Calcular(consulta.DataNascimento) >= Idade.Minima;

            return aprovado ? ResultadoVerificacaoIdade.Aprovado : ResultadoVerificacaoIdade.Reprovado;
        }

        // Cada fornecedor tem seu próprio contrato. Este método assume:
        //   GET {BaseUrl}/cpf/{cpf}   (Authorization: Bearer {ApiKey})
        //   200 -> { "situacao": "REGULAR", "dataNascimento": "1990-05-20" }
        //   404 -> CPF não encontrado
        // Ao contratar o fornecedor, ajuste a URL, o header e os nomes dos campos aqui.
        private async Task<ConsultaCpf?> ConsultarFornecedorAsync(string baseUrl, string apiKey, string cpf)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl.TrimEnd('/')}/cpf/{cpf}");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            using var response = await _http.SendAsync(request);

            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                return null;

            response.EnsureSuccessStatusCode();

            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var root = json.RootElement;

            var situacao = root.GetProperty("situacao").GetString();
            var dataNascimento = DateOnly.ParseExact(root.GetProperty("dataNascimento").GetString()!, "yyyy-MM-dd", CultureInfo.InvariantCulture);

            return new ConsultaCpf(string.Equals(situacao, "REGULAR", StringComparison.OrdinalIgnoreCase), dataNascimento);
        }

        private record ConsultaCpf(bool Regular, DateOnly DataNascimento);
    }
}
