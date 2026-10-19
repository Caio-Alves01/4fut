using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddPartidaEscalacao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EsquemaTime1",
                table: "Partidas",
                type: "varchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "4-4-2")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "EsquemaTime2",
                table: "Partidas",
                type: "varchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "4-4-2")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "PartidaEscalados",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    PartidaId = table.Column<int>(type: "int", nullable: false),
                    Time = table.Column<int>(type: "int", nullable: false),
                    Posicao = table.Column<int>(type: "int", nullable: false),
                    JogadorId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PartidaEscalados", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_PartidaEscalados_PartidaId_JogadorId",
                table: "PartidaEscalados",
                columns: new[] { "PartidaId", "JogadorId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PartidaEscalados_PartidaId_Time_Posicao",
                table: "PartidaEscalados",
                columns: new[] { "PartidaId", "Time", "Posicao" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PartidaEscalados");

            migrationBuilder.DropColumn(
                name: "EsquemaTime1",
                table: "Partidas");

            migrationBuilder.DropColumn(
                name: "EsquemaTime2",
                table: "Partidas");
        }
    }
}
