import { IsEnum } from 'class-validator';

export class ChangePlanDto {
  @IsEnum(['basic', 'standard', 'premium'])
  plan: 'basic' | 'standard' | 'premium';

  @IsEnum(['monthly', 'annual'])
  cycle: 'monthly' | 'annual';
}
