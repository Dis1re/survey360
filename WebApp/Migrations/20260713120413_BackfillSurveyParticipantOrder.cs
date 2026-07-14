using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebApp.Migrations
{
    /// <inheritdoc />
    public partial class BackfillSurveyParticipantOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "UPDATE SurveyParticipants SET TargetOrder = (SELECT COUNT(*) FROM SurveyParticipants sp2 WHERE sp2.SurveyId = SurveyParticipants.SurveyId AND sp2.IsTarget AND sp2.Id <= SurveyParticipants.Id) WHERE IsTarget;");

            migrationBuilder.Sql(
                "UPDATE SurveyParticipants SET RespondentOrder = (SELECT COUNT(*) FROM SurveyParticipants sp2 WHERE sp2.SurveyId = SurveyParticipants.SurveyId AND sp2.IsRespondent AND sp2.Id <= SurveyParticipants.Id) WHERE IsRespondent;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
