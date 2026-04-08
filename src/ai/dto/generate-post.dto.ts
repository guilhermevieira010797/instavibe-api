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
  @IsArray()
  @IsString({ each: true })
  referenceImagesBase64?: string[];

  @IsOptional()
  @IsUUID()
  profileId?: string;
}
