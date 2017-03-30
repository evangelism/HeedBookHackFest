using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

namespace HeedBookWebApp.Data.Migrations
{
    public partial class Migration2 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "EmotionType",
                table: "FaceEmotion",
                nullable: true,
                oldClrType: typeof(int));

            migrationBuilder.AddColumn<float>(
                name: "EmotionValue",
                table: "FaceEmotion",
                nullable: false,
                defaultValue: 0f);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EmotionValue",
                table: "FaceEmotion");

            migrationBuilder.AlterColumn<int>(
                name: "EmotionType",
                table: "FaceEmotion",
                nullable: false,
                oldClrType: typeof(string),
                oldNullable: true);
        }
    }
}
