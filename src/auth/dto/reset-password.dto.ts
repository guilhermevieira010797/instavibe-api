import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(4, 10)
  code: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
