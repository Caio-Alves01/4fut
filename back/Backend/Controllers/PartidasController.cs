using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;

namespace Backend.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/peladas/{peladaId}/partidas")]
    public class PartidasController : ControllerBase
    {
        private readonly AppDbContext _db;

        public PartidasController(AppDbContext db)
        {
            _db = db;
        }

        // Confere se a pelada existe e se pertence ao usuário logado.
        private async Task<Pelada?> GetPeladaDoUsuario(int peladaId)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var pelada = await _db.Peladas.FindAsync(peladaId);

            if (pelada is null || pelada.OwnerUserId != userId)
                return null;

            return pelada;
        }

        [HttpGet]
        public async Task<ActionResult<List<PartidaResponse>>> Listar(int peladaId)
        {
            var pelada = await GetPeladaDoUsuario(peladaId);
            if (pelada is null)
                return NotFound();

            var partidas = await _db.Partidas
                .Where(p => p.PeladaId == peladaId)
                .OrderBy(p => p.Date)
                .ToListAsync();

            var resposta = new List<PartidaResponse>();
            foreach (var partida in partidas)
            {
                resposta.Add(new PartidaResponse(partida.Id, partida.Date, partida.Time, partida.Location, partida.Status, partida.ScoreTeam1, partida.ScoreTeam2));
            }

            return Ok(resposta);
        }

        [HttpPost]
        public async Task<ActionResult<PartidaResponse>> Criar(int peladaId, CreatePartidaRequest request)
        {
            var pelada = await GetPeladaDoUsuario(peladaId);
            if (pelada is null)
                return NotFound();

            var partida = new Partida
            {
                PeladaId = peladaId,
                Date = request.Date,
                Time = request.Time,
                Location = request.Location,
                Status = "agendada",
            };

            _db.Partidas.Add(partida);
            await _db.SaveChangesAsync();

            return Ok(new PartidaResponse(partida.Id, partida.Date, partida.Time, partida.Location, partida.Status, partida.ScoreTeam1, partida.ScoreTeam2));
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<PartidaResponse>> Atualizar(int peladaId, int id, UpdatePartidaRequest request)
        {
            var pelada = await GetPeladaDoUsuario(peladaId);
            if (pelada is null)
                return NotFound();

            var partida = await _db.Partidas.SingleOrDefaultAsync(p => p.Id == id && p.PeladaId == peladaId);
            if (partida is null)
                return NotFound();

            partida.Date = request.Date;
            partida.Time = request.Time;
            partida.Location = request.Location;
            partida.Status = request.Status;
            partida.ScoreTeam1 = request.ScoreTeam1;
            partida.ScoreTeam2 = request.ScoreTeam2;

            await _db.SaveChangesAsync();

            return Ok(new PartidaResponse(partida.Id, partida.Date, partida.Time, partida.Location, partida.Status, partida.ScoreTeam1, partida.ScoreTeam2));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Remover(int peladaId, int id)
        {
            var pelada = await GetPeladaDoUsuario(peladaId);
            if (pelada is null)
                return NotFound();

            var partida = await _db.Partidas.SingleOrDefaultAsync(p => p.Id == id && p.PeladaId == peladaId);
            if (partida is null)
                return NotFound();

            _db.Partidas.Remove(partida);
            await _db.SaveChangesAsync();

            return Ok();
        }
    }
}
