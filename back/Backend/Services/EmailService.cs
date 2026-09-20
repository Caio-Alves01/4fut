using System.Net;
using System.Net.Mail;

namespace Backend.Services
{
    // Envia e-mails simples via SMTP. Configuração vem da seção "Smtp" do appsettings.
    public class EmailService
    {
        private readonly IConfiguration _configuration;

        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task SendAsync(string to, string subject, string body)
        {
            var smtpSection = _configuration.GetSection("Smtp");
            var host = smtpSection["Host"];
            var port = int.Parse(smtpSection["Port"] ?? "587");
            var user = smtpSection["User"];
            var password = smtpSection["Password"];
            var from = smtpSection["From"] ?? user;

            if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(user))
            {
                // Sem SMTP configurado (ex: ambiente de dev sem credencial ainda): grava o e-mail
                // em um arquivo .txt na pasta "emails-dev" e mostra no console.
                var pasta = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "emails-dev");
                Directory.CreateDirectory(pasta);
                var arquivo = Path.GetFullPath(Path.Combine(pasta, $"{DateTime.Now:yyyyMMdd-HHmmss-fff}.txt"));
                await File.WriteAllTextAsync(arquivo, $"Para: {to}\nAssunto: {subject}\n\n{body}\n");

                Console.WriteLine($"[EmailService] SMTP não configurado. E-mail para {to} salvo em {arquivo}\n{body}");
                return;
            }

            using var client = new SmtpClient(host, port)
            {
                Credentials = new NetworkCredential(user, password),
                EnableSsl = true,
            };

            using var message = new MailMessage(from!, to, subject, body);

            await client.SendMailAsync(message);
        }
    }
}
