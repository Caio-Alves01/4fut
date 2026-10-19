using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class PartidaCreatedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Partidas",
                type: "datetime(6)",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP(6)");

            // Partidas antigas não sabem quando foram agendadas: as que já passaram ficam com a data da
            // própria partida, para não aparecerem todas como "agendada hoje" nas Atividades Recentes.
            migrationBuilder.Sql("UPDATE Partidas SET CreatedAt = Date WHERE Date < CreatedAt;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Partidas");
        }
    }
}
