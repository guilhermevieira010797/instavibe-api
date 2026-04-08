import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class LinkProfileDto {
  @ValidateIf((dto: LinkProfileDto) => !dto.accessToken)
  @IsString()
  @IsNotEmpty()
  username?: string;

  @ValidateIf((dto: LinkProfileDto) => !dto.username)
  @IsString()
  @IsNotEmpty()
  accessToken?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  instagramAccountId?: string;
}
