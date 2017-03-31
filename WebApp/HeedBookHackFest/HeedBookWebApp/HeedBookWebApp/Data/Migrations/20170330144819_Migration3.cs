using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

namespace HeedBookWebApp.Data.Migrations
{
    public partial class Migration3 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FaceEmotionGuid",
                columns: table => new
                {
                    FaceEmotionGuidId = table.Column<Guid>(nullable: false),
                    Age = table.Column<int>(nullable: false),
                    DialogId = table.Column<int>(nullable: false),
                    EmotionType = table.Column<string>(nullable: true),
                    EmotionValue = table.Column<float>(nullable: false),
                    Sex = table.Column<bool>(nullable: false),
                    Time = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FaceEmotionGuid", x => x.FaceEmotionGuidId);
                });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FaceEmotionGuid");
        }
    }
}
