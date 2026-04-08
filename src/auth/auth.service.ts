import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { SafeUser, sanitizeUser } from '../users/user.utils';
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
    });

    return this.buildAuthResponse(user);
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.validateUser(email, password);
    return this.buildAuthResponse(user);
  }

  refresh(user: User): AuthResponse {
    return this.buildAuthResponse(user);
  }

  googleLogin(user: User): AuthResponse {
    return this.buildAuthResponse(user);
  }
}
