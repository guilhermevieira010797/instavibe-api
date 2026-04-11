import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { SafeUser, sanitizeUser } from '../users/user.utils';
import { MailService } from '../mail/mail.service';
import { CreditLedgerService } from '../billing/credit-ledger.service';
import { PlansConfig } from '../billing/config/plans.config';
import { SignupDto } from './dto/signup.dto';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: SafeUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly creditLedger: CreditLedgerService,
    private readonly plansConfig: PlansConfig,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findAuthByEmail(email);
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  sanitizeUser(user: User): SafeUser {
    return sanitizeUser(user);
  }

  generateTokens(user: User): { accessToken: string; refreshToken: string } {
    const payload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') ??
        '15m') as StringValue,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ??
        '7d') as StringValue,
    });

    return { accessToken, refreshToken };
  }

  private buildAuthResponse(user: User): AuthResponse {
    const tokens = this.generateTokens(user);
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private getVerificationTtlMs(): number {
    const min = parseInt(
      this.configService.get<string>('EMAIL_VERIFICATION_CODE_TTL_MIN', '30'),
      10,
    );
    return min * 60 * 1000;
  }

  private getPasswordResetTtlMs(): number {
    const min = parseInt(
      this.configService.get<string>('PASSWORD_RESET_CODE_TTL_MIN', '30'),
      10,
    );
    return min * 60 * 1000;
  }

  async signup({
    email,
    password,
    name,
    phone,
  }: SignupDto): Promise<AuthResponse> {
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.usersService.create({
      email,
      password: passwordHash,
      name: name.trim(),
      phone: phone?.trim() ?? null,
      isEmailVerified: false,
    });

    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + this.getVerificationTtlMs());
    await this.usersService.setEmailVerificationCode(user.id, code, expiresAt);

    try {
      await this.mailService.sendWelcomeWithVerification(
        user.email,
        user.name,
        code,
      );
    } catch {
      // não bloqueia o signup se o envio falhar
    }

    return this.buildAuthResponse(user);
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.validateUser(email, password);
    return this.buildAuthResponse(user);
  }

  refresh(user: User): AuthResponse {
    return this.buildAuthResponse(user);
  }

  async googleLogin(
    input: { user: User; isNew?: boolean } | User,
  ): Promise<AuthResponse> {
    const user = 'user' in input ? input.user : input;
    const isNew = 'isNew' in input ? input.isNew : false;
    if (isNew) {
      try {
        await this.mailService.sendWelcome(user.email, user.name);
      } catch {
        // ignora falha de e-mail
      }
      if (this.plansConfig.freeSignupCredits > 0) {
        await this.creditLedger.addExtra(
          user.id,
          this.plansConfig.freeSignupCredits,
        );
      }
    }
    return this.buildAuthResponse(user);
  }

  async verifyEmail(email: string, code: string): Promise<{ success: true }> {
    const user =
      await this.usersService.findByEmailWithVerificationCode(email);
    if (!user) throw new NotFoundException('User not found');
    if (user.isEmailVerified) {
      return { success: true };
    }
    if (
      !user.emailVerificationCode ||
      !user.emailVerificationExpiresAt ||
      user.emailVerificationCode !== code ||
      user.emailVerificationExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Invalid or expired verification code');
    }
    await this.usersService.markEmailVerified(user.id);
    if (this.plansConfig.freeSignupCredits > 0) {
      await this.creditLedger.addExtra(
        user.id,
        this.plansConfig.freeSignupCredits,
      );
    }
    return { success: true };
  }

  async resendVerification(email: string): Promise<{ success: true }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');
    if (user.isEmailVerified) {
      return { success: true };
    }
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + this.getVerificationTtlMs());
    await this.usersService.setEmailVerificationCode(user.id, code, expiresAt);
    try {
      await this.mailService.sendWelcomeWithVerification(
        user.email,
        user.name,
        code,
      );
    } catch {
      // ignora falha
    }
    return { success: true };
  }

  async forgotPassword(email: string): Promise<{ success: true }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // silencioso para não revelar existência do email
      return { success: true };
    }
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + this.getPasswordResetTtlMs());
    await this.usersService.setPasswordResetCode(user.id, code, expiresAt);
    try {
      await this.mailService.sendPasswordReset(user.email, user.name, code);
    } catch {
      // ignora falha
    }
    return { success: true };
  }

  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<{ success: true }> {
    const user = await this.usersService.findByEmailWithResetCode(email);
    if (!user) throw new NotFoundException('User not found');
    if (
      !user.passwordResetCode ||
      !user.passwordResetExpiresAt ||
      user.passwordResetCode !== code ||
      user.passwordResetExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Invalid or expired reset code');
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await this.usersService.updatePassword(user.id, hash);
    await this.usersService.clearPasswordResetCode(user.id);
    return { success: true };
  }
}
