import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateQuizAndSong1704067300000 implements MigrationInterface {
  name = 'CreateQuizAndSong1704067300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Create quizzes table
    await queryRunner.createTable(
      new Table({
        name: 'quizzes',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'creatorId',
            type: 'uuid',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'isPublic',
            type: 'boolean',
            default: false,
          },
          {
            name: 'playCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'timeLimit',
            type: 'int',
            default: 10,
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
        ],
      }),
      true,
    );

    // Create songs table
    await queryRunner.createTable(
      new Table({
        name: 'songs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'quizId',
            type: 'uuid',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'artist',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'audioUrl',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'startTime',
            type: 'int',
            default: 0,
          },
          {
            name: 'playDuration',
            type: 'int',
            default: 30,
          },
          {
            name: 'orderIndex',
            type: 'int',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'quizzes',
      new TableIndex({
        name: 'IDX_quizzes_creatorId',
        columnNames: ['creatorId'],
      }),
    );

    await queryRunner.createIndex(
      'songs',
      new TableIndex({
        name: 'IDX_songs_quizId',
        columnNames: ['quizId'],
      }),
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'songs',
      new TableForeignKey({
        name: 'FK_songs_quizId',
        columnNames: ['quizId'],
        referencedTableName: 'quizzes',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('songs', 'FK_songs_quizId');
    await queryRunner.dropIndex('songs', 'IDX_songs_quizId');
    await queryRunner.dropIndex('quizzes', 'IDX_quizzes_creatorId');
    await queryRunner.dropTable('songs');
    await queryRunner.dropTable('quizzes');
  }
}
