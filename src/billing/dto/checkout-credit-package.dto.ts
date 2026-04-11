import { IsNotEmpty, IsString } from 'class-validator';

export class CheckoutCreditPackageDto {
  @IsString()
  @IsNotEmpty()
  packageId: string;
}
