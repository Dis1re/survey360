using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebApp.Migrations
{
    /// <inheritdoc />
    public partial class BackfillSurveyCreatedByUserId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE Surveys
                SET CreatedByUserId = (
                    SELECT Id FROM Users WHERE IsAdmin = 1 ORDER BY Id LIMIT 1
                )
                WHERE CreatedByUserId IS NULL
                  AND EXISTS (SELECT 1 FROM Users WHERE IsAdmin = 1);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
