using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;

namespace Backend.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/peladas/{peladaId}/jogadores")]
    public class JogadoresController : ControllerBase
    {
        private readonly AppDbContext _db;

        public JogadoresController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<ActionResult<List<JogadorResponse>>> GetJogadores(int peladaId)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            if (!await PeladaPertenceAoUsuario(peladaId, userId))
                return NotFound();

            var jogadores = await _db.Jogadores
                .Where(j => j.PeladaId == peladaId)
                .ToListAsync();

            var resposta = jogadores.Select(ParaResponse).ToList();
            return Ok(resposta);
        }

        [HttpPost]
        public async Task<ActionResult<JogadorResponse>> CreateJogador(int peladaId, CreateJogadorRequest request)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            if (!await PeladaPertenceAoUsuario(peladaId, userId))
                return NotFound();

            var jogador = new Jogador
            {
                PeladaId = peladaId,
                Name = request.Name.Trim(),
                Age = request.Age,
                Position = request.Position,
                Number = request.Number,
                Papel = "membro",
                Status = "ativo",
                Gols = 0,
                Assistencias = 0,
                CartoesAmarelos = 0,
                CartoesVermelhos = 0,
                Jogos = 0,
            };

            _db.Jogadores.Add(jogador);
            await _db.SaveChangesAsync();

            return Ok(ParaResponse(jogador));
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<JogadorResponse>> UpdateJogador(int peladaId, int id, UpdateJogadorRequest request)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            if (!await PeladaPertenceAoUsuario(peladaId, userId))
                return NotFound();

            var jogador = await _db.Jogadores.SingleOrDefaultAsync(j => j.Id == id && j.PeladaId == peladaId);
            if (jogador is null)
                return NotFound();

            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest("O nome do jogador é obrigatório.");

            jogador.Name = request.Name.Trim();
            jogador.Age = request.Age;
            jogador.Position = request.Position;
            jogador.Number = request.Number;
            jogador.Papel = request.Papel ?? jogador.Papel;
            jogador.Status = request.Status ?? jogador.Status;
            jogador.Gols = request.Gols ?? jogador.Gols;
            jogador.Assistencias = request.Assistencias ?? jogador.Assistencias;
            jogador.CartoesAmarelos = request.CartoesAmarelos ?? jogador.CartoesAmarelos;
            jogador.CartoesVermelhos = request.CartoesVermelhos ?? jogador.CartoesVermelhos;
            jogador.Jogos = request.Jogos ?? jogador.Jogos;

            await _db.SaveChangesAsync();

            return Ok(ParaResponse(jogador));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteJogador(int peladaId, int id)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            if (!await PeladaPertenceAoUsuario(peladaId, userId))
                return NotFound();

            var jogador = await _db.Jogadores.SingleOrDefaultAsync(j => j.Id == id && j.PeladaId == peladaId);
            if (jogador is null)
                return NotFound();

            _db.Jogadores.Remove(jogador);
            await _db.SaveChangesAsync();

            return Ok();
        }

        // Confere se a pelada existe e se é o usuário logado quem criou ela.
        private async Task<bool> PeladaPertenceAoUsuario(int peladaId, int userId)
        {
            var pelada = await _db.Peladas.FindAsync(peladaId);
            return pelada is not null && pelada.OwnerUserId == userId;
        }

        private static JogadorResponse ParaResponse(Jogador jogador)
        {
            return new JogadorResponse(
                jogador.Id,
                jogador.Name,
                jogador.Age,
                jogador.Position,
                jogador.Number,
                jogador.Papel,
                jogador.Status,
                jogador.Gols,
                jogador.Assistencias,
                jogador.CartoesAmarelos,
                jogador.CartoesVermelhos,
                jogador.Jogos);
        }
    }
}
