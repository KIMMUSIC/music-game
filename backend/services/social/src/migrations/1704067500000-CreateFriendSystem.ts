import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFriendSystem1704067500000 implements MigrationInterface {
  name = 'CreateFriendSystem1704067500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create friend_request_status enum
    await queryRunner.query(`
      CREATE TYPE "friend_request_status" AS ENUM ('pending', 'accepted', 'rejected')
    `);

    // Create friend_requests table
    await queryRunner.query(`
      CREATE TABLE "friend_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sender_id" uuid NOT NULL,
        "receiver_id" uuid NOT NULL,
        "status" friend_request_status NOT NULL DEFAULT 'pending',
        "message" varchar,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_friend_requests" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_friend_requests_sender_receiver" UNIQUE ("sender_id", "receiver_id")
      )
    `);

    // Create friendships table
    await queryRunner.query(`
      CREATE TABLE "friendships" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "friend_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_friendships" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_friendships_user_friend" UNIQUE ("user_id", "friend_id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_friend_requests_sender" ON "friend_requests" ("sender_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_friend_requests_receiver" ON "friend_requests" ("receiver_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_friend_requests_status" ON "friend_requests" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_friendships_user" ON "friendships" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_friendships_friend" ON "friendships" ("friend_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "friendships"`);
    await queryRunner.query(`DROP TABLE "friend_requests"`);
    await queryRunner.query(`DROP TYPE "friend_request_status"`);
  }
}
