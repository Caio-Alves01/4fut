using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly TokenService _tokenService;
        private readonly EmailService _emailService;
        private readonly CpfVerificationService _cpfVerificationService;
        private readonly CpfHasher _cpfHasher;

        public AuthController(AppDbContext db, TokenService tokenService, EmailService emailService,
            CpfVerificationService cpfVerificationService, CpfHasher cpfHasher)
        {
            _db = db;
            _tokenService = tokenService;
            _emailService = emailService;
            _cpfVerificationService = cpfVerificationService;
            _cpfHasher = cpfHasher;
        }

        // Limitado por IP (política "cadastro" no Program.cs): cada tentativa pode virar uma consulta paga.
        [EnableRateLimiting(RateLimitPolicies.Cadastro)]
        [HttpPost("register")]
        public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest("E-mail e senha são obrigatórios.");

            var emailNormalized = request.Email.Trim().ToLowerInvariant();

            if (await _db.Users.AnyAsync(u => u.Email == emailNormalized))
                return Conflict("Já existe uma conta com esse e-mail.");

            // Checagem local primeiro: CPF com dígito errado nem chega a gastar consulta no fornecedor.
            var cpf = CpfValidator.Normalizar(request.Cpf);
            if (!CpfValidator.EhValido(cpf))
                return BadRequest("CPF inválido.");

            // Também antes da API: CPF que já tem conta não precisa ser verificado de novo.
            var cpfHash = _cpfHasher.Hash(cpf);
            if (await _db.Users.AnyAsync(u => u.CpfHash == cpfHash))
                return Conflict("Já existe uma conta com esse CPF.");

            var resultado = await _cpfVerificationService.VerificarAsync(cpf, request.BirthDate);

            if (resultado == ResultadoVerificacaoIdade.Indisponivel)
                return StatusCode(StatusCodes.Status503ServiceUnavailable,
                    "Não foi possível verificar seus dados agora. Tente novamente em alguns minutos.");

            // Mensagem neutra: não diz se foi a idade, a data ou o CPF que não bateu.
            if (resultado == ResultadoVerificacaoIdade.Reprovado)
                return BadRequest("Não foi possível concluir o cadastro com os dados informados.");

            // O CPF e a data de nascimento não são salvos: só o hash do CPF e o momento da verificação.
            var user = new User
            {
                Name = request.Name.Trim(),
                Email = emailNormalized,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                AgeVerifiedAt = DateTime.UtcNow,
                CpfHash = cpfHash,
            };

            _db.Users.Add(user);
            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // Dois cadastros com o mesmo e-mail ou CPF ao mesmo tempo: os dois passaram pelas checagens
                // acima, mas o índice único do banco deixa só um entrar.
                return Conflict("Já existe uma conta com esse e-mail ou CPF.");
            }

            return Ok(new AuthResponse(_tokenService.GenerateToken(user)));
        }

        [HttpPost("login")]
        public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
        {
            var emailNormalized = request.Email.Trim().ToLowerInvariant();
            var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == emailNormalized);

            if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                return Unauthorized("E-mail ou senha inválidos.");

            return Ok(new AuthResponse(_tokenService.GenerateToken(user)));
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<ActionResult<UserResponse>> GetMe()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var user = await _db.Users.FindAsync(userId);

            if (user is null)
                return NotFound();

            return Ok(new UserResponse(user.Id, user.Name, user.Email, user.CreatedAt));
        }

        [Authorize]
        [HttpPut("me")]
        public async Task<ActionResult<UserResponse>> UpdateMe(UpdateMeRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Email))
                return BadRequest("Nome e e-mail são obrigatórios.");

            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var user = await _db.Users.FindAsync(userId);

            if (user is null)
                return NotFound();

            var emailNormalized = request.Email.Trim().ToLowerInvariant();

            if (emailNormalized != user.Email &&
                await _db.Users.AnyAsync(u => u.Email == emailNormalized && u.Id != userId))
                return Conflict("Já existe uma conta com esse e-mail.");

            user.Name = request.Name.Trim();
            user.Email = emailNormalized;

            await _db.SaveChangesAsync();

            return Ok(new UserResponse(user.Id, user.Name, user.Email, user.CreatedAt));
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
        {
            var emailNormalized = request.Email.Trim().ToLowerInvariant();
            var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == emailNormalized);

            // Não conta pro chamador se o e-mail existe ou não, só finge que enviou.
            if (user is null)
                return Ok();

            var codigo = GerarCodigoDeSeisDigitos();
            user.ResetCode = codigo;
            user.ResetCodeExpiresAt = DateTime.UtcNow.AddMinutes(10);
            await _db.SaveChangesAsync();

            var corpoDoEmail = $"Seu código para redefinir a senha do 4Fut é: {codigo}\n\nEle vale por 10 minutos.";
            await _emailService.SendAsync(user.Email, "Código de recuperação de senha - 4Fut", corpoDoEmail);

            return Ok();
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
        {
            var emailNormalized = request.Email.Trim().ToLowerInvariant();
            var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == emailNormalized);

            var codigoValido =
                user is not null &&
                user.ResetCode == request.Code &&
                user.ResetCodeExpiresAt is not null &&
                user.ResetCodeExpiresAt.Value > DateTime.UtcNow;

            if (!codigoValido)
                return BadRequest("Código inválido ou expirado.");

            user!.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.ResetCode = null;
            user.ResetCodeExpiresAt = null;
            await _db.SaveChangesAsync();

            return Ok();
        }

        // Gera um código de 6 dígitos (000000 a 999999) usando um gerador aleatório seguro.
        private static string GerarCodigoDeSeisDigitos()
        {
            var numero = RandomNumberGenerator.GetInt32(0, 1_000_000);
            return numero.ToString("D6");
        }
    }
}
