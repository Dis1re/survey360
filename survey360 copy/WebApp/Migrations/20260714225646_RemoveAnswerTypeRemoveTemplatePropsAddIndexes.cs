using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebApp.Migrations
{
    /// <inheritdoc />
    public partial class RemoveAnswerTypeRemoveTemplatePropsAddIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Answers_Users_TargetId",
                table: "Answers");

            migrationBuilder.DropForeignKey(
                name: "FK_SurveyAssignments_Users_ReviewerId",
                table: "SurveyAssignments");

            migrationBuilder.DropForeignKey(
                name: "FK_SurveyAssignments_Users_TargetId",
                table: "SurveyAssignments");

            migrationBuilder.DropIndex(
                name: "IX_Answers_QuestionId",
                table: "Answers");

            migrationBuilder.DropColumn(
                name: "Props",
                table: "SurveyTemplates");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Answers");

            migrationBuilder.CreateIndex(
                name: "IX_Answers_QuestionId_UserId_TargetId",
                table: "Answers",
                columns: new[] { "QuestionId", "UserId", "TargetId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Answers_Users_TargetId",
                table: "Answers",
                column: "TargetId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_SurveyAssignments_Users_ReviewerId",
                table: "SurveyAssignments",
                column: "ReviewerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_SurveyAssignments_Users_TargetId",
                table: "SurveyAssignments",
                column: "TargetId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Answers_Users_TargetId",
                table: "Answers");

            migrationBuilder.DropForeignKey(
                name: "FK_SurveyAssignments_Users_ReviewerId",
                table: "SurveyAssignments");

            migrationBuilder.DropForeignKey(
                name: "FK_SurveyAssignments_Users_TargetId",
                table: "SurveyAssignments");

            migrationBuilder.DropIndex(
                name: "IX_Answers_QuestionId_UserId_TargetId",
                table: "Answers");

            migrationBuilder.AddColumn<string>(
                name: "Props",
                table: "SurveyTemplates",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "Answers",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Answers_QuestionId",
                table: "Answers",
                column: "QuestionId");

            migrationBuilder.AddForeignKey(
                name: "FK_Answers_Users_TargetId",
                table: "Answers",
                column: "TargetId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SurveyAssignments_Users_ReviewerId",
                table: "SurveyAssignments",
                column: "ReviewerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SurveyAssignments_Users_TargetId",
                table: "SurveyAssignments",
                column: "TargetId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
