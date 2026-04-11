import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsInt,
  IsEnum,
  Min,
  ArrayMinSize,
  IsUUID,
} from 'class-validator';
import { ImageStyle } from '../providers/ai-provider.interface';
import { AI_CATEGORIES } from '../../billing/config/ai-categories.config';
import type { AiCategory } from '../../billing/config/ai-categories.config';

export class RefineImagesDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsEnum(AI_CATEGORIES)
  category: AiCategory;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  currentImagesBase64: string[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  slideIndexes?: number[];

  @IsOptional()
  @IsEnum(ImageStyle)
  imageStyle?: ImageStyle;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referenceImagesBase64?: string[];

  @IsOptional()
  @IsUUID()
  profileId?: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}
