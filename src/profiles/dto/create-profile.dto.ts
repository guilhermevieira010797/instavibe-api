import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateProfileDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  niche?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  visualIdentity?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colorPalette?: string[];

  @IsOptional()
  @IsString()
  fontStyle?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referenceImagesBase64?: string[];

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsString()
  toneOfVoice?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  forbiddenWords?: string[];

  @IsOptional()
  @IsString()
  communicationGoal?: string;

  @IsOptional()
  @IsString()
  preferredCta?: string;

  @IsOptional()
  @IsString()
  brandDifferentials?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  instagramAccountId?: string;

  @IsOptional()
  @IsString()
  instagramAccessToken?: string;
}
