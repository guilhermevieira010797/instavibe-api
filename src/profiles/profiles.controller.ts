import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { LinkProfileDto } from './dto/link-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/user.entity';
import { SubscriptionPolicyService } from '../billing/subscription-policy.service';

interface AuthenticatedRequest extends Request {
  user: User;
}

@ApiTags('Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly policy: SubscriptionPolicyService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar perfil de marca' })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateProfileDto) {
    return this.profilesService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar perfis do usuário' })
  findAll(@Req() req: AuthenticatedRequest) {
    return this.profilesService.findAllByUser(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter perfil por ID' })
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.profilesService.findById(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar perfil' })
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profilesService.update(id, req.user.id, dto);
  }

  @Post('link-instagram')
  @ApiOperation({ summary: 'Vincular Instagram e criar perfil' })
  linkInstagramAndCreate(
    @Req() req: AuthenticatedRequest,
    @Body() dto: LinkProfileDto,
  ) {
    this.policy.assertInstagram(req.user);
    return this.profilesService.linkInstagram(undefined, req.user.id, dto);
  }

  @Post(':id/link-instagram')
  @ApiOperation({ summary: 'Vincular Instagram a perfil existente' })
  linkInstagram(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LinkProfileDto,
  ) {
    this.policy.assertInstagram(req.user);
    return this.profilesService.linkInstagram(id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover perfil' })
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.profilesService.remove(id, req.user.id);
  }
}
