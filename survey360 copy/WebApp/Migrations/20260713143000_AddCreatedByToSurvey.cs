using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebApp.Migrations
{
    /// <inheritdoc />
    public partial class AddCreatedByToSurvey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int?>(
                name: "CreatedByUserId",
                table: "Surveys",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Surveys_CreatedByUserId",
                table: "Surveys",
                column: "CreatedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Surveys_Users_CreatedByUserId",
                table: "Surveys",
                column: "CreatedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Surveys_Users_CreatedByUserId",
                table: "Surveys");

            migrationBuilder.DropIndex(
                name: "IX_Surveys_CreatedByUserId",
                table: "Surveys");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "Surveys");
        }
    }
}
