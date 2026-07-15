using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebApp.Migrations
{
    /// <inheritdoc />
    public partial class AddSurveyAssignmentUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SurveyAssignments_SurveyId",
                table: "SurveyAssignments");

            migrationBuilder.CreateIndex(
                name: "IX_SurveyAssignments_SurveyId_ReviewerId_TargetId",
                table: "SurveyAssignments",
                columns: new[] { "SurveyId", "ReviewerId", "TargetId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SurveyAssignments_SurveyId_ReviewerId_TargetId",
                table: "SurveyAssignments");

            migrationBuilder.CreateIndex(
                name: "IX_SurveyAssignments_SurveyId",
                table: "SurveyAssignments",
                column: "SurveyId");
        }
    }
}
