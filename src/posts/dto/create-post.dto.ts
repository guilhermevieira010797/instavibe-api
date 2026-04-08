import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsArray,
  IsUUID,
} from 'class-validator';

export class CreatePostDto {
  @IsOptional()
  @IsUUID()
  profileId?: string;

  @IsEnum(['single', 'carousel'])
  postType: 'single' | 'carousel';

  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(10)
  slidesCount?: number;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referenceImagesBase64?: string[];

  @IsOptional()
  @IsBoolean()
  draft?: boolean;
}
