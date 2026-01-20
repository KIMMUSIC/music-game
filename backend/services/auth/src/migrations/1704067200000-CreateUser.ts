import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateUser1704067200000 implements MigrationInterface {
  name = 'CreateUser1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'oauthProvider',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'oauthId',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'nickname',
            type: 'varchar',
            length: '20',
            isUnique: true,
          },
          {
            name: 'avatarUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'lastLoginAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Enable UUID extension
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Create indexes
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_oauth_provider',
        columnNames: ['oauthProvider'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_oauth_id',
        columnNames: ['oauthId'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_nickname',
        columnNames: ['nickname'],
      }),
    );

    // Create composite unique index for OAuth
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_oauth_provider_id',
        columnNames: ['oauthProvider', 'oauthId'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('users', 'IDX_users_oauth_provider_id');
    await queryRunner.dropIndex('users', 'IDX_users_nickname');
    await queryRunner.dropIndex('users', 'IDX_users_oauth_id');
    await queryRunner.dropIndex('users', 'IDX_users_oauth_provider');
    await queryRunner.dropTable('users');
  }
}
