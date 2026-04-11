import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';

export interface CreditDebit {
  fromExtra: number;
  fromCredits: number;
}

@Injectable()
export class CreditLedgerService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async consume(userId: string, amount: number): Promise<CreditDebit> {
    if (amount <= 0) return { fromExtra: 0, fromCredits: 0 };

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const fromExtra = Math.min(user.extraCredits, amount);
    const remainingAmount = amount - fromExtra;
    const fromCredits = Math.min(user.credits, remainingAmount);

    if (fromExtra + fromCredits < amount) {
      throw new HttpException(
        `Insufficient credits. Required: ${amount}, available: ${
          user.extraCredits + user.credits
        }`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    await this.usersRepository.update(
      { id: userId },
      {
        credits: user.credits - fromCredits,
        extraCredits: user.extraCredits - fromExtra,
      },
    );

    return { fromExtra, fromCredits };
  }

  async refund(userId: string, debit: CreditDebit): Promise<void> {
    if (debit.fromCredits > 0) {
      await this.usersRepository.increment(
        { id: userId },
        'credits',
        debit.fromCredits,
      );
    }
    if (debit.fromExtra > 0) {
      await this.usersRepository.increment(
        { id: userId },
        'extraCredits',
        debit.fromExtra,
      );
    }
  }

  async addExtra(userId: string, amount: number): Promise<void> {
    if (amount <= 0) return;
    await this.usersRepository.increment(
      { id: userId },
      'extraCredits',
      amount,
    );
  }
}
