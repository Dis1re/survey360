using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebApp.Migrations
{
    /// <inheritdoc />
    public partial class MergeRespondentLinksIntoParticipants : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "SurveyParticipants",
                type: "TEXT",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "Token",
                table: "SurveyParticipants",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SurveyParticipants_Token",
                table: "SurveyParticipants",
                column: "Token",
                unique: true);

            migrationBuilder.Sql(@"
                UPDATE ""SurveyParticipants""
                SET ""Token"" = (
                    SELECT r.""Token""
                    FROM ""SurveyRespondentLinks"" r
                    WHERE r.""SurveyId"" = ""SurveyParticipants"".""SurveyId""
                      AND r.""ReviewerId"" = ""SurveyParticipants"".""UserId""
                ),
                ""CreatedAt"" = (
                    SELECT r.""CreatedAt""
                    FROM ""SurveyRespondentLinks"" r
                    WHERE r.""SurveyId"" = ""SurveyParticipants"".""SurveyId""
                      AND r.""ReviewerId"" = ""SurveyParticipants"".""UserId""
                )
                WHERE EXISTS (
                    SELECT 1 FROM ""SurveyRespondentLinks"" r
                    WHERE r.""SurveyId"" = ""SurveyParticipants"".""SurveyId""
                      AND r.""ReviewerId"" = ""SurveyParticipants"".""UserId""
                )");

            migrationBuilder.DropTable(
                name: "SurveyRespondentLinks");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SurveyParticipants_Token",
                table: "SurveyParticipants");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "SurveyParticipants");

            migrationBuilder.DropColumn(
                name: "Token",
                table: "SurveyParticipants");

            migrationBuilder.CreateTable(
                name: "SurveyRespondentLinks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ReviewerId = table.Column<int>(type: "INTEGER", nullable: false),
                    SurveyId = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Token = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SurveyRespondentLinks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SurveyRespondentLinks_Surveys_SurveyId",
                        column: x => x.SurveyId,
                        principalTable: "Surveys",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SurveyRespondentLinks_Users_ReviewerId",
                        column: x => x.ReviewerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SurveyRespondentLinks_ReviewerId",
                table: "SurveyRespondentLinks",
                column: "ReviewerId");

            migrationBuilder.CreateIndex(
                name: "IX_SurveyRespondentLinks_SurveyId_ReviewerId",
                table: "SurveyRespondentLinks",
                columns: new[] { "SurveyId", "ReviewerId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SurveyRespondentLinks_Token",
                table: "SurveyRespondentLinks",
                column: "Token",
                unique: true);
        }
    }
}
