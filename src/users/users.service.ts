import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: this.normalizeEmail(email) },
      relations: ['subscription'],
    });
  }

  async findAuthByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.subscription', 'subscription')
      .addSelect('user.password')
      .where('user.email = :email', {
        email: this.normalizeEmail(email),
      })
      .getOne();
  }

  async findByEmailWithVerificationCode(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.subscription', 'subscription')
      .addSelect('user.emailVerificationCode')
      .where('user.email = :email', {
        email: this.normalizeEmail(email),
      })
      .getOne();
  }

  async findByEmailWithResetCode(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.subscription', 'subscription')
      .addSelect('user.passwordResetCode')
      .where('user.email = :email', {
        email: this.normalizeEmail(email),
      })
      .getOne();
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: ['subscription'],
    });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { googleId },
      relations: ['subscription'],
    });
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.usersRepository.create({
      ...data,
      email: data.email ? this.normalizeEmail(data.email) : undefined,
    });
    const savedUser = await this.usersRepository.save(user);
    return (await this.findById(savedUser.id)) ?? savedUser;
  }

  async upsertByGoogle(data: {
    googleId: string;
    email: string;
    name: string;
  }): Promise<{ user: User; isNew: boolean }> {
    const email = this.normalizeEmail(data.email);

    let user = await this.findByGoogleId(data.googleId);
    if (!user) {
      user = await this.findByEmail(email);
    }
    if (user) {
      user.googleId = data.googleId;
      user.name = data.name;
      if (!user.isEmailVerified) user.isEmailVerified = true;
      const saved = await this.usersRepository.save(user);
      return { user: saved, isNew: false };
    }
    const created = await this.create({
      ...data,
      email,
      isEmailVerified: true,
    });
    return { user: created, isNew: true };
  }

  async setEmailVerificationCode(
    userId: string,
    code: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.usersRepository.update(
      { id: userId },
      {
        emailVerificationCode: code,
        emailVerificationExpiresAt: expiresAt,
      },
    );
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.usersRepository.update(
      { id: userId },
      {
        isEmailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpiresAt: null,
      },
    );
  }

  async setPasswordResetCode(
    userId: string,
    code: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.usersRepository.update(
      { id: userId },
      {
        passwordResetCode: code,
        passwordResetExpiresAt: expiresAt,
      },
    );
  }

  async clearPasswordResetCode(userId: string): Promise<void> {
    await this.usersRepository.update(
      { id: userId },
      {
        passwordResetCode: null,
        passwordResetExpiresAt: null,
      },
    );
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.usersRepository.update(
      { id: userId },
      { password: passwordHash },
    );
  }

  async setSubscription(
    userId: string,
    subscriptionId: string | null,
  ): Promise<void> {
    await this.usersRepository.update({ id: userId }, { subscriptionId });
  }

  async setCredits(
    userId: string,
    credits: number,
    extraCredits?: number,
  ): Promise<void> {
    const update: Partial<User> = { credits };
    if (extraCredits !== undefined) update.extraCredits = extraCredits;
    await this.usersRepository.update({ id: userId }, update);
  }

  async incrementExtraCredits(userId: string, amount: number): Promise<void> {
    await this.usersRepository.increment({ id: userId }, 'extraCredits', amount);
  }

  async consumeCredits(
    userId: string,
    amount: number,
  ): Promise<{ remainingCredits: number; remainingExtra: number }> {
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');

    const fromExtra = Math.min(user.extraCredits, amount);
    const remainingAmount = amount - fromExtra;
    const fromCredits = Math.min(user.credits, remainingAmount);

    if (fromExtra + fromCredits < amount) {
      throw new Error('Insufficient credits');
    }

    const newExtra = user.extraCredits - fromExtra;
    const newCredits = user.credits - fromCredits;

    await this.usersRepository.update(
      { id: userId },
      { credits: newCredits, extraCredits: newExtra },
    );

    return { remainingCredits: newCredits, remainingExtra: newExtra };
  }

  async refundCredits(
    userId: string,
    credits: number,
    extraCredits: number,
  ): Promise<void> {
    if (credits > 0) {
      await this.usersRepository.increment({ id: userId }, 'credits', credits);
    }
    if (extraCredits > 0) {
      await this.usersRepository.increment(
        { id: userId },
        'extraCredits',
        extraCredits,
      );
    }
  }
}
