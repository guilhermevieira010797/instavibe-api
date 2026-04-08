import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AiService } from './ai.service';
import { GeneratePostDto } from './dto/generate-post.dto';
import { RefineImagesDto } from './dto/refine-images.dto';
import { GenerateCaptionDto } from './dto/generate-caption.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/user.entity';

interface AuthenticatedRequest extends Request {
  user: User;
}

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-images')
  @ApiOperation({ summary: 'Gerar imagens para postagem via IA' })
  async generateImages(
    @Req() req: AuthenticatedRequest,
    @Body() dto: GeneratePostDto,
  ) {
    return this.aiService.generateImages({
      ...dto,
      userId: req.user.id,
    });
  }

  @Post('refine-images')
  @ApiOperation({ summary: 'Refinar imagens existentes via IA' })
  async refineImages(
    @Req() req: AuthenticatedRequest,
    @Body() dto: RefineImagesDto,
  ) {
    return this.aiService.refineImages({
      ...dto,
      userId: req.user.id,
    });
  }

  @Post('generate-caption')
  @ApiOperation({ summary: 'Gerar legenda para postagem via IA' })
  async generateCaption(@Body() dto: GenerateCaptionDto) {
    return this.aiService.generateCaption(dto);
  }
}
