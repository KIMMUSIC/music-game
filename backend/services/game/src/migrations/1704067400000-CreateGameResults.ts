import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGameResults1704067400000 implements MigrationInterface {
  name = 'CreateGameResults1704067400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create game_results table
    await queryRunner.query(`
      CREATE TABLE "game_results" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "room_id" varchar NOT NULL,
        "quiz_id" uuid NOT NULL,
        "quiz_title" varchar NOT NULL,
        "host_id" uuid NOT NULL,
        "winner_id" uuid,
        "player_count" integer NOT NULL,
        "total_rounds" integer NOT NULL,
        "duration_ms" integer NOT NULL,
        "round_data" jsonb NOT NULL DEFAULT '[]',
        "played_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_game_results" PRIMARY KEY ("id")
      )
    `);

    // Create player_game_results table
    await queryRunner.query(`
      CREATE TABLE "player_game_results" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "game_result_id" uuid NOT NULL,
        "player_id" uuid NOT NULL,
        "player_nickname" varchar NOT NULL,
        "player_avatar_url" varchar,
        "rank" integer NOT NULL,
        "score" integer NOT NULL,
        "correct_answers" integer NOT NULL,
        "total_answers" integer NOT NULL,
        "average_response_time_ms" integer,
        "is_winner" boolean NOT NULL DEFAULT false,
        "answer_details" jsonb NOT NULL DEFAULT '[]',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_player_game_results" PRIMARY KEY ("id"),
        CONSTRAINT "FK_player_game_results_game" FOREIGN KEY ("game_result_id")
          REFERENCES "game_results"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_game_results_room_id" ON "game_results" ("room_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_game_results_quiz_id" ON "game_results" ("quiz_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_game_results_host_id" ON "game_results" ("host_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_game_results_played_at" ON "game_results" ("played_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_player_game_results_player_id" ON "player_game_results" ("player_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_player_game_results_game_player" ON "player_game_results" ("player_id", "game_result_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "player_game_results"`);
    await queryRunner.query(`DROP TABLE "game_results"`);
  }
}
