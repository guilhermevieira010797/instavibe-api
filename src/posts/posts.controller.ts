import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/user.entity';

interface AuthenticatedRequest extends Request {
  user: User;
}

@ApiTags('Posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar postagem com geração de imagens via IA' })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreatePostDto) {
    return this.postsService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar postagens (opcionalmente filtrar por perfil)' })
  @ApiQuery({ name: 'profileId', required: false })
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('profileId') profileId?: string,
  ) {
    if (!profileId) {
      return this.postsService.findAllByUser(req.user.id);
    }

    return this.postsService.findAllByProfile(profileId, req.user.id);
  }

  @Get('me')
  @ApiOperation({ summary: 'Listar postagens do usuário autenticado' })
  findMyPosts(@Req() req: AuthenticatedRequest) {
    return this.postsService.findAllByUser(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter postagem por ID' })
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.postsService.findById(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar postagem' })
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.update(id, req.user.id, dto);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publicar postagem no Instagram' })
  publish(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.postsService.publish(id, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover postagem' })
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.postsService.remove(id, req.user.id);
  }
}
