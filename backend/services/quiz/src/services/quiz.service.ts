import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz } from '../entities/quiz.entity';
import { Song } from '../entities/song.entity';
import { CreateQuizDto } from '../dto/create-quiz.dto';
import { UpdateQuizDto } from '../dto/update-quiz.dto';
import { S3Service } from './s3.service';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(Quiz)
    private quizRepository: Repository<Quiz>,
    @InjectRepository(Song)
    private songRepository: Repository<Song>,
    private s3Service: S3Service,
  ) {}

  async create(creatorId: string, dto: CreateQuizDto): Promise<Quiz> {
    const quiz = this.quizRepository.create({
      creatorId,
      title: dto.title,
      description: dto.description,
      isPublic: dto.isPublic ?? false,
      hintsEnabled: dto.hintsEnabled ?? false,
    });

    const savedQuiz = await this.quizRepository.save(quiz);

    const songs = dto.songs.map((songDto) =>
      this.songRepository.create({
        quizId: savedQuiz.id,
        title: songDto.title,
        artist: songDto.artist,
        audioUrl: songDto.audioUrl,
        sourceType: songDto.sourceType ?? this.detectSourceType(songDto.audioUrl),
        startTime: songDto.startTime ?? 0,
        playDuration: songDto.playDuration ?? 10,
        timeLimit: songDto.timeLimit ?? 30,
        orderIndex: songDto.orderIndex,
        matchMode: songDto.matchMode ?? 'title_and_artist',
        alternativeAnswers: songDto.alternativeAnswers ?? [],
        genre: songDto.genre ?? null,
        releaseYear: songDto.releaseYear ?? null,
        hint: songDto.hint ?? null,
      }),
    );

    await this.songRepository.save(songs);

    return this.findById(savedQuiz.id);
  }

  async findById(id: string): Promise<Quiz> {
    const quiz = await this.quizRepository.findOne({
      where: { id },
      relations: ['songs'],
      order: { songs: { orderIndex: 'ASC' } },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return quiz;
  }

  async findByCreator(creatorId: string): Promise<Quiz[]> {
    return this.quizRepository.find({
      where: { creatorId },
      relations: ['songs'],
      order: { createdAt: 'DESC', songs: { orderIndex: 'ASC' } },
    });
  }

  async findPublic(limit: number = 20, offset: number = 0): Promise<Quiz[]> {
    return this.quizRepository.find({
      where: { isPublic: true },
      relations: ['songs'],
      order: { playCount: 'DESC', createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateQuizDto,
  ): Promise<Quiz> {
    const quiz = await this.findById(id);

    if (quiz.creatorId !== userId) {
      throw new ForbiddenException('You can only update your own quizzes');
    }

    // Update quiz fields
    if (dto.title !== undefined) quiz.title = dto.title;
    if (dto.description !== undefined) quiz.description = dto.description;
    if (dto.isPublic !== undefined) quiz.isPublic = dto.isPublic;
    if (dto.hintsEnabled !== undefined) quiz.hintsEnabled = dto.hintsEnabled;

    await this.quizRepository.save(quiz);

    // Update songs if provided
    if (dto.songs) {
      // Delete existing songs
      await this.songRepository.delete({ quizId: id });

      // Create new songs
      const songs = dto.songs.map((songDto) =>
        this.songRepository.create({
          quizId: id,
          title: songDto.title,
          artist: songDto.artist,
          audioUrl: songDto.audioUrl,
          sourceType: songDto.sourceType ?? this.detectSourceType(songDto.audioUrl),
          startTime: songDto.startTime ?? 0,
          playDuration: songDto.playDuration ?? 10,
          timeLimit: songDto.timeLimit ?? 30,
          orderIndex: songDto.orderIndex,
          matchMode: songDto.matchMode ?? 'title_and_artist',
          alternativeAnswers: songDto.alternativeAnswers ?? [],
          genre: songDto.genre ?? null,
          releaseYear: songDto.releaseYear ?? null,
          hint: songDto.hint ?? null,
        }),
      );

      await this.songRepository.save(songs);
    }

    return this.findById(id);
  }

  async delete(id: string, userId: string): Promise<void> {
    const quiz = await this.findById(id);

    if (quiz.creatorId !== userId) {
      throw new ForbiddenException('You can only delete your own quizzes');
    }

    // Delete audio files from S3
    for (const song of quiz.songs) {
      try {
        await this.s3Service.deleteAudio(song.audioUrl);
      } catch {
        // Log but don't fail if S3 deletion fails
        console.error(`Failed to delete audio: ${song.audioUrl}`);
      }
    }

    await this.quizRepository.delete(id);
  }

  async incrementPlayCount(id: string): Promise<void> {
    await this.quizRepository.increment({ id }, 'playCount', 1);
  }

  private detectSourceType(audioUrl: string): 'upload' | 'youtube' {
    const youtubePatterns = [
      /youtube\.com\/watch/,
      /youtu\.be\//,
      /youtube\.com\/embed/,
      /youtube\.com\/shorts/,
    ];

    for (const pattern of youtubePatterns) {
      if (pattern.test(audioUrl)) {
        return 'youtube';
      }
    }

    return 'upload';
  }

  async search(query: string, limit: number = 20): Promise<Quiz[]> {
    return this.quizRepository
      .createQueryBuilder('quiz')
      .leftJoinAndSelect('quiz.songs', 'songs')
      .where('quiz.isPublic = :isPublic', { isPublic: true })
      .andWhere('quiz.title ILIKE :query', { query: `%${query}%` })
      .orderBy('quiz.playCount', 'DESC')
      .addOrderBy('quiz.createdAt', 'DESC')
      .addOrderBy('songs.orderIndex', 'ASC')
      .take(limit)
      .getMany();
  }
}
