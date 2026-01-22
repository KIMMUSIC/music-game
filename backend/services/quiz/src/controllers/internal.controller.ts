import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { QuizService } from '../services/quiz.service';
import { InternalGuard } from '../../../../shared/guards/internal.guard';
import { CreateQuizDto } from '../dto/create-quiz.dto';

// System user ID for seeded quizzes (public quizzes not owned by any real user)
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

@Controller('internal')
@UseGuards(InternalGuard)
export class InternalController {
  constructor(private quizService: QuizService) {}

  @Post('get-quiz')
  async getQuiz(@Body('quizId') quizId: string) {
    try {
      const quiz = await this.quizService.findById(quizId);
      return {
        found: true,
        quiz: {
          id: quiz.id,
          creatorId: quiz.creatorId,
          title: quiz.title,
          hintsEnabled: quiz.hintsEnabled,
          songs: quiz.songs.map((song) => ({
            id: song.id,
            title: song.title,
            artist: song.artist,
            audioUrl: song.audioUrl,
            sourceType: song.sourceType,
            startTime: song.startTime,
            playDuration: song.playDuration,
            timeLimit: song.timeLimit,
            orderIndex: song.orderIndex,
            matchMode: song.matchMode,
            alternativeAnswers: song.alternativeAnswers,
            hint: song.hint,
          })),
        },
      };
    } catch {
      return { found: false };
    }
  }

  @Post('increment-play-count')
  async incrementPlayCount(@Body('quizId') quizId: string) {
    await this.quizService.incrementPlayCount(quizId);
    return { success: true };
  }

  @Post('seed-quiz')
  async seedQuiz(@Body() dto: CreateQuizDto & { creatorId?: string }) {
    const creatorId = dto.creatorId || SYSTEM_USER_ID;
    try {
      const quiz = await this.quizService.create(creatorId, dto);
      return {
        success: true,
        quizId: quiz.id,
        title: quiz.title,
        songCount: quiz.songs.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
