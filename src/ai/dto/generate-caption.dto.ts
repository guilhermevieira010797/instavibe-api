import { IsString, IsNotEmpty, IsArray, ArrayMinSize } from 'class-validator';

export class GenerateCaptionDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  imagesBase64: string[];
}
