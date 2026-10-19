using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class SubstituicaoSemAvaliacao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Avaliacao",
                table: "Jogadores");

            migrationBuilder.AddColumn<int>(
                name: "EntraJogadorId",
                table: "PartidaEventos",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EntraJogadorId",
                table: "PartidaEventos");

            migrationBuilder.AddColumn<int>(
                name: "Avaliacao",
                table: "Jogadores",
                type: "int",
                nullable: false,
                defaultValue: 70);
        }
    }
}
