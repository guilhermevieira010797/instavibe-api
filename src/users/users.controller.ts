import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from './user.entity';
import { sanitizeUser } from './user.utils';
import { UpdatePasswordDto } from './dto/update-password.dto';

interface AuthenticatedRequest extends Request {
  user: User;
}

@ApiTags('Users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Obter dados do usuário autenticado' })
  getMe(@Req() req: AuthenticatedRequest) {
    return sanitizeUser(req.user);
  }

  @Post('me/password')
  @ApiOperation({
    summary:
      'Alterar senha do usuário autenticado (fluxo pós-reset ou troca logada)',
  })
  async updatePassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdatePasswordDto,
  ) {
    const user = await this.usersService.findAuthByEmail(req.user.email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.password) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required');
      }
      const match = await bcrypt.compare(dto.currentPassword, user.password);
      if (!match) {
        throw new BadRequestException('Current password is incorrect');
      }
    }

    const hash = await bcrypt.hash(dto.newPassword, 12);
    await this.usersService.updatePassword(user.id, hash);
    return { success: true };
  }
}
