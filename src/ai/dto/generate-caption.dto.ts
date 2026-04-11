import {
  IsString,
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  IsOptional,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { AI_CATEGORIES } from '../../billing/config/ai-categories.config';
import type { AiCategory } from '../../billing/config/ai-categories.config';

export class GenerateCaptionDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsEnum(AI_CATEGORIES)
  category: AiCategory;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  imagesBase64: string[];

  @IsOptional()
  @IsUUID()
  profileId?: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}
