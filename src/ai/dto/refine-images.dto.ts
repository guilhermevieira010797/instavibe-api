import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  ArrayMinSize,
  IsUUID,
} from 'class-validator';

export class RefineImagesDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

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
  @IsArray()
  @IsString({ each: true })
  referenceImagesBase64?: string[];

  @IsOptional()
  @IsUUID()
  profileId?: string;
}
