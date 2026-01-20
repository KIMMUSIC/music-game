import {
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
  IsIn,
  Min,
  Max,
  MaxLength,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSongDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(200)
  artist: string;

  @IsString()
  @MaxLength(500)
  audioUrl: string;

  @IsString()
  @IsIn(['upload', 'youtube'])
  @IsOptional()
  sourceType?: 'upload' | 'youtube';

  @IsInt()
  @Min(0)
  @IsOptional()
  startTime?: number;

  @IsInt()
  @Min(1)
  @Max(60)
  @IsOptional()
  playDuration?: number;

  @IsInt()
  @Min(5)
  @Max(300)
  @IsOptional()
  timeLimit?: number;

  @IsInt()
  @Min(0)
  orderIndex: number;

  @IsString()
  @IsIn(['title_only', 'title_and_artist', 'exact'])
  @IsOptional()
  matchMode?: 'title_only' | 'title_and_artist' | 'exact';

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  @IsOptional()
  alternativeAnswers?: string[];

  @IsString()
  @MaxLength(50)
  @IsOptional()
  genre?: string;

  @IsInt()
  @Min(1900)
  @Max(2100)
  @IsOptional()
  releaseYear?: number;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  hint?: string;
}

export class UpdateQuizDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  title?: string;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSongDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsOptional()
  songs?: UpdateSongDto[];

  @IsBoolean()
  @IsOptional()
  hintsEnabled?: boolean;
}
