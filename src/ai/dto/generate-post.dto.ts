import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsArray,
  IsUUID,
} from 'class-validator';
import { ImageStyle } from '../providers/ai-provider.interface';

export class GeneratePostDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsEnum(['single', 'carousel'])
  postType: 'single' | 'carousel';

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(20)
  slidesCount?: number;

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
