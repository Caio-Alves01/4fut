using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

        public AuthController(AppDbContext db, TokenService tokenService)
        {
            _db = db;
            _tokenService = tokenService;
        }

        [HttpPost("register")]
        public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest("E-mail e senha são obrigatórios.");

            var emailNormalized = request.Email.Trim().ToLowerInvariant();

            if (await _db.Users.AnyAsync(u => u.Email == emailNormalized))
                return Conflict("Já existe uma conta com esse e-mail.");

            var user = new User
            {
                Name = request.Name.Trim(),
                Email = emailNormalized,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

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
    }
}
