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

            var tipo = Normalizar(request.Tipo);
            // Status é opcional no cadastro: sem ele, o jogador entra como ativo.
            var status = Normalizar(request.Status) ?? StatusJogador.Ativo;
            var erro = ValidarDadosCadastrais(request.Name, request.BirthDate, request.Number, tipo, status);
            if (erro is not null)
                return BadRequest(erro);

            var jogador = new Jogador
            {
                PeladaId = peladaId,
                Name = request.Name.Trim(),
                BirthDate = request.BirthDate,
                Age = Idade.Calcular(request.BirthDate!.Value),
                Position = request.Position,
                Number = request.Number,
                Papel = "membro",
                Tipo = tipo!,
                Status = status,
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

            var tipo = Normalizar(request.Tipo);
            var status = Normalizar(request.Status) ?? jogador.Status;
            var erro = ValidarDadosCadastrais(request.Name, request.BirthDate, request.Number, tipo, status);
            if (erro is not null)
                return BadRequest(erro);

            jogador.Name = request.Name.Trim();
            jogador.BirthDate = request.BirthDate;
            jogador.Age = Idade.Calcular(request.BirthDate!.Value);
            jogador.Position = request.Position;
            jogador.Number = request.Number;
            jogador.Tipo = tipo!;
            jogador.Papel = request.Papel ?? jogador.Papel;
            jogador.Status = status;
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

            // Sai das listas de presença e das cobranças em aberto. O que ele já pagou continua
            // registrado (o dinheiro entrou no caixa), aparecendo como "Jogador removido".
            _db.PartidaPresencas.RemoveRange(_db.PartidaPresencas.Where(p => p.JogadorId == id));
            _db.Cobrancas.RemoveRange(_db.Cobrancas.Where(c => c.JogadorId == id && c.PagoEm == null));
            _db.Jogadores.Remove(jogador);
            await _db.SaveChangesAsync();

            return Ok();
        }

        // " Avulso " -> "avulso", para a comparação com as whitelists não depender de maiúsculas/espaços.
        private static string? Normalizar(string? valor) => valor?.Trim().ToLowerInvariant();

        // Regras do cadastro/edição de jogador. Devolve a mensagem de erro, ou null se estiver tudo certo.
        private static string? ValidarDadosCadastrais(string? nome, DateOnly? dataNascimento, int numero, string? tipo, string status)
        {
            if (string.IsNullOrWhiteSpace(nome))
                return "O nome do jogador é obrigatório.";

            if (dataNascimento is null)
                return "A data de nascimento é obrigatória.";

            if (dataNascimento.Value > DateOnly.FromDateTime(DateTime.UtcNow))
                return "A data de nascimento não pode estar no futuro.";

            if (Idade.Calcular(dataNascimento.Value) < Idade.Minima)
                return $"O jogador precisa ter {Idade.Minima} anos ou mais.";

            if (numero < 0)
                return "O número da camisa não pode ser negativo.";

            if (!TiposJogador.EhValido(tipo))
                return "Informe se o jogador é mensalista ou avulso.";

            if (!StatusJogador.EhValido(status))
                return "Status inválido. Use ativo, licença ou inativo.";

            return null;
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
                // Com data de nascimento a idade é sempre a atual; sem ela (jogador antigo), usa a que foi digitada.
                jogador.BirthDate is not null ? Idade.Calcular(jogador.BirthDate.Value) : jogador.Age,
                jogador.BirthDate,
                jogador.Position,
                jogador.Number,
                jogador.Papel,
                jogador.Tipo,
                jogador.Status,
                jogador.Gols,
                jogador.Assistencias,
                jogador.CartoesAmarelos,
                jogador.CartoesVermelhos,
                jogador.Jogos);
        }
    }
}
