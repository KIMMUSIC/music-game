import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { QuizService } from '../services/quiz.service';
import { InternalGuard } from '../../../../shared/guards/internal.guard';

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
}
