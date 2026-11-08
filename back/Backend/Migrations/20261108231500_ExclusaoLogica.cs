using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    // Exclusão lógica de peladas e partidas: excluir só preenche DeletedAt/DeletedByUserId.
    public partial class ExclusaoLogica : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Peladas",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DeletedByUserId",
                table: "Peladas",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Partidas",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DeletedByUserId",
                table: "Partidas",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Peladas");

            migrationBuilder.DropColumn(
                name: "DeletedByUserId",
                table: "Peladas");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Partidas");

            migrationBuilder.DropColumn(
                name: "DeletedByUserId",
                table: "Partidas");
        }
    }
}
