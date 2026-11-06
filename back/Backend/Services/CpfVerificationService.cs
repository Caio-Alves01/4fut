using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json;

namespace Backend.Services
{
    public enum ResultadoVerificacaoIdade
    {
        Aprovado,

        // CPF não encontrado, data de nascimento diferente da cadastrada no fornecedor ou menor de 18 anos.
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
                consulta.DataNascimento == dataNascimentoInformada &&
                Idade.Calcular(consulta.DataNascimento) >= Idade.Minima;

            return aprovado ? ResultadoVerificacaoIdade.Aprovado : ResultadoVerificacaoIdade.Reprovado;
        }

        // CPFHub.io - Consulta Simples (https://www.cpfhub.io/openapi.json):
        //   GET {BaseUrl}/cpf/{cpf}   (header x-api-key: {ApiKey})
        //   200 -> { "success": true, "data": { "birthDate": "15/06/1990", ... } }   (1 crédito)
        //   404 -> CPF não encontrado (não consome crédito)
        //   400/422 -> CPF malformado / dígito verificador errado
        //   401/403/429/5xx -> problema de chave, saldo, limite ou do fornecedor
        // A Consulta Simples não traz situação cadastral; para isso existe POST /cpf/realtime.
        private async Task<ConsultaCpf?> ConsultarFornecedorAsync(string baseUrl, string apiKey, string cpf)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl.TrimEnd('/')}/cpf/{cpf}");
            request.Headers.Add("x-api-key", apiKey);
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            using var response = await _http.SendAsync(request);

            // Não encontrado ou CPF recusado pelo fornecedor: problema do dado informado, não do serviço.
            if (response.StatusCode is System.Net.HttpStatusCode.NotFound
                                    or System.Net.HttpStatusCode.BadRequest
                                    or System.Net.HttpStatusCode.UnprocessableEntity)
                return null;

            response.EnsureSuccessStatusCode();

            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var root = json.RootElement;

            if (!root.GetProperty("success").GetBoolean())
                throw new InvalidOperationException("CPFHub respondeu 200 com success=false.");

            var data = root.GetProperty("data");
            var dataNascimento = DateOnly.ParseExact(data.GetProperty("birthDate").GetString()!, "dd/MM/yyyy", CultureInfo.InvariantCulture);

            return new ConsultaCpf(dataNascimento);
        }

        private record ConsultaCpf(DateOnly DataNascimento);
    }
}
