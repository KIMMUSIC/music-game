import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { QuizService } from '../services/quiz.service';
import { StorageService } from '../services/storage.service';
import { LocalStorageService } from '../services/local-storage.service';
import { CreateQuizDto } from '../dto/create-quiz.dto';
import { UpdateQuizDto } from '../dto/update-quiz.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { id: string; nickname: string };
}

@Controller()
export class QuizController {
  constructor(
    private quizService: QuizService,
    private storageService: StorageService,
    private localStorageService: LocalStorageService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Req() req: RequestWithUser, @Body() dto: CreateQuizDto) {
    const quiz = await this.quizService.create(req.user.id, dto);
    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      isPublic: quiz.isPublic,
      hintsEnabled: quiz.hintsEnabled,
      songCount: quiz.songs.length,
      createdAt: quiz.createdAt,
    };
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyQuizzes(@Req() req: RequestWithUser) {
    const quizzes = await this.quizService.findByCreator(req.user.id);
    return quizzes.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      isPublic: quiz.isPublic,
      playCount: quiz.playCount,
      songCount: quiz.songs.length,
      createdAt: quiz.createdAt,
    }));
  }

  @Get('public')
  async getPublicQuizzes(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const quizzes = await this.quizService.findPublic(
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );

    return quizzes.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      playCount: quiz.playCount,
      songCount: quiz.songs.length,
      createdAt: quiz.createdAt,
    }));
  }

  @Get('search')
  async search(@Query('q') query: string, @Query('limit') limit?: string) {
    if (!query || query.length < 2) {
      return [];
    }

    const quizzes = await this.quizService.search(
      query,
      limit ? parseInt(limit, 10) : 20,
    );

    return quizzes.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      playCount: quiz.playCount,
      songCount: quiz.songs.length,
    }));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getQuiz(@Param('id', ParseUUIDPipe) id: string) {
    const quiz = await this.quizService.findById(id);

    return {
      id: quiz.id,
      creatorId: quiz.creatorId,
      title: quiz.title,
      description: quiz.description,
      isPublic: quiz.isPublic,
      hintsEnabled: quiz.hintsEnabled,
      playCount: quiz.playCount,
      songs: quiz.songs.map((song) => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        audioUrl: song.audioUrl,
        sourceType: song.sourceType || 'upload',
        startTime: song.startTime,
        playDuration: song.playDuration,
        timeLimit: song.timeLimit,
        orderIndex: song.orderIndex,
        matchMode: song.matchMode,
        alternativeAnswers: song.alternativeAnswers,
        hint: song.hint,
      })),
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateQuiz(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
    @Body() dto: UpdateQuizDto,
  ) {
    const quiz = await this.quizService.update(id, req.user.id, dto);

    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      isPublic: quiz.isPublic,
      hintsEnabled: quiz.hintsEnabled,
      songCount: quiz.songs.length,
      updatedAt: quiz.updatedAt,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteQuiz(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ) {
    await this.quizService.delete(id, req.user.id);
  }

  @Post('upload-url')
  @UseGuards(JwtAuthGuard)
  async getUploadUrl(
    @Req() req: RequestWithUser,
    @Body('fileName') fileName: string,
  ) {
    const { uploadUrl, audioUrl } =
      await this.storageService.getPresignedUploadUrl(req.user.id, fileName);

    return { uploadUrl, audioUrl };
  }

  @Post('upload-file')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Req() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
    @Query('fileName') fileName: string,
  ) {
    if (!this.storageService.isUsingLocalStorage()) {
      throw new BadRequestException(
        'Direct file upload is only available in local storage mode',
      );
    }

    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const audioUrl = await this.storageService.uploadAudio(
      file.buffer,
      fileName || file.originalname,
      req.user.id,
    );

    return { audioUrl };
  }
}
