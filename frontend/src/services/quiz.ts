import { api } from './api';

export type MatchMode = 'title_only' | 'title_and_artist' | 'exact';

export interface Song {
  id?: string;
  title: string;
  artist: string;
  audioUrl: string;
  sourceType?: 'upload' | 'youtube';
  startTime: number;
  playDuration: number;
  timeLimit: number;
  orderIndex: number;
  matchMode?: MatchMode;
  alternativeAnswers?: string[];
  genre?: string;
  releaseYear?: number;
  hint?: string;
}

export interface Quiz {
  id: string;
  creatorId: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  playCount: number;
  songCount: number;
  songs?: Song[];
  hintsEnabled?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateQuizDto {
  title: string;
  description?: string;
  isPublic?: boolean;
  songs: Omit<Song, 'id'>[];
  hintsEnabled?: boolean;
}

export interface UpdateQuizDto {
  title?: string;
  description?: string;
  isPublic?: boolean;
  songs?: Song[];
  hintsEnabled?: boolean;
}

export const quizService = {
  async getMyQuizzes(): Promise<Quiz[]> {
    return api.get<Quiz[]>('/quiz/my');
  },

  async getPublicQuizzes(limit = 20, offset = 0): Promise<Quiz[]> {
    return api.get<Quiz[]>('/quiz/public', {
      params: { limit, offset },
    });
  },

  async getQuiz(id: string): Promise<Quiz> {
    return api.get<Quiz>(`/quiz/${id}`);
  },

  async createQuiz(data: CreateQuizDto): Promise<Quiz> {
    return api.post<Quiz>('/quiz', data);
  },

  async updateQuiz(id: string, data: UpdateQuizDto): Promise<Quiz> {
    return api.put<Quiz>(`/quiz/${id}`, data);
  },

  async deleteQuiz(id: string): Promise<void> {
    await api.delete(`/quiz/${id}`);
  },

  async searchQuizzes(query: string, limit = 20): Promise<Quiz[]> {
    return api.get<Quiz[]>('/quiz/search', {
      params: { q: query, limit },
    });
  },

  async getUploadUrl(fileName: string): Promise<{ uploadUrl: string; audioUrl: string }> {
    return api.post<{ uploadUrl: string; audioUrl: string }>(
      '/quiz/upload-url',
      { fileName }
    );
  },

  async uploadAudio(uploadUrl: string, file: File): Promise<string | void> {
    // Check if it's a local upload (relative URL starting with /)
    if (uploadUrl.startsWith('/')) {
      // Local storage upload using FormData
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.postFormData<{ audioUrl: string }>(uploadUrl, formData);
      return response.audioUrl;
    } else {
      // S3 presigned URL upload
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });
    }
  },
};
