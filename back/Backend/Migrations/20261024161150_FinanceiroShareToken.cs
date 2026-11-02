using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class FinanceiroShareToken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FinanceiroShareToken",
                table: "Peladas",
                type: "varchar(64)",
                maxLength: 64,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Peladas_FinanceiroShareToken",
                table: "Peladas",
                column: "FinanceiroShareToken",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Peladas_FinanceiroShareToken",
                table: "Peladas");

            migrationBuilder.DropColumn(
                name: "FinanceiroShareToken",
                table: "Peladas");
        }
    }
}
