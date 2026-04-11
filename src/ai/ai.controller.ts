import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AiService } from './ai.service';
import { GeneratePostDto } from './dto/generate-post.dto';
import { RefineImagesDto } from './dto/refine-images.dto';
import { GenerateCaptionDto } from './dto/generate-caption.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/user.entity';
import { SubscriptionPolicyService } from '../billing/subscription-policy.service';
import { CreditLedgerService } from '../billing/credit-ledger.service';
import { AiCategoriesConfig } from '../billing/config/ai-categories.config';

interface AuthenticatedRequest extends Request {
  user: User;
}

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly policy: SubscriptionPolicyService,
    private readonly ledger: CreditLedgerService,
    private readonly aiCategories: AiCategoriesConfig,
  ) {}

  @Post('generate-images')
  @ApiOperation({ summary: 'Gerar imagens para postagem via IA' })
  async generateImages(
    @Req() req: AuthenticatedRequest,
    @Body() dto: GeneratePostDto,
  ) {
    this.policy.assertCategory(req.user, dto.category);
    if (dto.postType === 'carousel') {
      this.policy.assertCarousel(req.user);
    }

    const imageCount = dto.postType === 'carousel' ? (dto.slidesCount ?? 5) : 1;
    const cost = this.aiCategories.costFor(
      dto.category,
      'generate',
      imageCount,
    );
    const debit = await this.ledger.consume(req.user.id, cost);

    try {
      return await this.aiService.generateImages({
        ...dto,
        userId: req.user.id,
      });
    } catch (err) {
      await this.ledger.refund(req.user.id, debit);
      throw err;
    }
  }

  @Post('refine-images')
  @ApiOperation({ summary: 'Refinar imagens existentes via IA' })
  async refineImages(
    @Req() req: AuthenticatedRequest,
    @Body() dto: RefineImagesDto,
  ) {
    this.policy.assertCategory(req.user, dto.category);

    const imageCount = dto.slideIndexes?.length
      ? dto.slideIndexes.length
      : dto.currentImagesBase64.length;

    if (imageCount <= 0) {
      throw new BadRequestException('No images to refine');
    }

    const cost = this.aiCategories.costFor(dto.category, 'refine', imageCount);
    const debit = await this.ledger.consume(req.user.id, cost);

    try {
      return await this.aiService.refineImages({
        ...dto,
        userId: req.user.id,
      });
    } catch (err) {
      await this.ledger.refund(req.user.id, debit);
      throw err;
    }
  }

  @Post('generate-caption')
  @ApiOperation({ summary: 'Gerar legenda para postagem via IA' })
  async generateCaption(
    @Req() req: AuthenticatedRequest,
    @Body() dto: GenerateCaptionDto,
  ) {
    this.policy.assertCategory(req.user, dto.category);

    const cost = this.aiCategories.costFor(dto.category, 'caption', 1);
    const debit = await this.ledger.consume(req.user.id, cost);

    try {
      return await this.aiService.generateCaption({
        ...dto,
        userId: req.user.id,
      });
    } catch (err) {
      await this.ledger.refund(req.user.id, debit);
      throw err;
    }
  }
}
