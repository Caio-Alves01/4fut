using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class FinanceiroMensalidadesCobrancas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ValorAvulso",
                table: "Peladas",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ValorCartaoAmarelo",
                table: "Peladas",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ValorCartaoVermelho",
                table: "Peladas",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ValorMensalidade",
                table: "Peladas",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Jogadores",
                type: "datetime(6)",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP(6)");

            migrationBuilder.CreateTable(
                name: "Cobrancas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    PeladaId = table.Column<int>(type: "int", nullable: false),
                    JogadorId = table.Column<int>(type: "int", nullable: false),
                    PartidaId = table.Column<int>(type: "int", nullable: true),
                    EventoId = table.Column<int>(type: "int", nullable: true),
                    Tipo = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Descricao = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Valor = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Data = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    PagoEm = table.Column<DateOnly>(type: "date", nullable: true),
                    TransacaoId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cobrancas", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "MensalidadePagamentos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    PeladaId = table.Column<int>(type: "int", nullable: false),
                    JogadorId = table.Column<int>(type: "int", nullable: false),
                    Ano = table.Column<int>(type: "int", nullable: false),
                    Mes = table.Column<int>(type: "int", nullable: false),
                    Valor = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    PagoEm = table.Column<DateOnly>(type: "date", nullable: false),
                    TransacaoId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MensalidadePagamentos", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "PartidaEventos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    PartidaId = table.Column<int>(type: "int", nullable: false),
                    JogadorId = table.Column<int>(type: "int", nullable: false),
                    AssistJogadorId = table.Column<int>(type: "int", nullable: true),
                    Tipo = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Minuto = table.Column<int>(type: "int", nullable: false),
                    Time = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PartidaEventos", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "PartidaPresencas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    PartidaId = table.Column<int>(type: "int", nullable: false),
                    JogadorId = table.Column<int>(type: "int", nullable: false),
                    Confirmacao = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Presente = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PartidaPresencas", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Cobrancas_PeladaId",
                table: "Cobrancas",
                column: "PeladaId");

            migrationBuilder.CreateIndex(
                name: "IX_MensalidadePagamentos_JogadorId_Ano_Mes",
                table: "MensalidadePagamentos",
                columns: new[] { "JogadorId", "Ano", "Mes" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MensalidadePagamentos_PeladaId",
                table: "MensalidadePagamentos",
                column: "PeladaId");

            migrationBuilder.CreateIndex(
                name: "IX_PartidaEventos_PartidaId",
                table: "PartidaEventos",
                column: "PartidaId");

            migrationBuilder.CreateIndex(
                name: "IX_PartidaPresencas_PartidaId_JogadorId",
                table: "PartidaPresencas",
                columns: new[] { "PartidaId", "JogadorId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Cobrancas");

            migrationBuilder.DropTable(
                name: "MensalidadePagamentos");

            migrationBuilder.DropTable(
                name: "PartidaEventos");

            migrationBuilder.DropTable(
                name: "PartidaPresencas");

            migrationBuilder.DropColumn(
                name: "ValorAvulso",
                table: "Peladas");

            migrationBuilder.DropColumn(
                name: "ValorCartaoAmarelo",
                table: "Peladas");

            migrationBuilder.DropColumn(
                name: "ValorCartaoVermelho",
                table: "Peladas");

            migrationBuilder.DropColumn(
                name: "ValorMensalidade",
                table: "Peladas");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Jogadores");
        }
    }
}
