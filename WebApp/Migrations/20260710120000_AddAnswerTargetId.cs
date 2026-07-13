using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebApp.Migrations
{
    /// <inheritdoc />
    public partial class AddAnswerTargetId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TargetId",
                table: "Answers",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql("UPDATE Answers SET TargetId = UserId WHERE TargetId = 0");

            migrationBuilder.CreateIndex(
                name: "IX_Answers_TargetId",
                table: "Answers",
                column: "TargetId");

            migrationBuilder.AddForeignKey(
                name: "FK_Answers_Users_TargetId",
                table: "Answers",
                column: "TargetId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Answers_Users_TargetId",
                table: "Answers");

            migrationBuilder.DropIndex(
                name: "IX_Answers_TargetId",
                table: "Answers");

            migrationBuilder.DropColumn(
                name: "TargetId",
                table: "Answers");
        }
    }
}
