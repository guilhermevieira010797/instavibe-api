import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { SubscriptionService } from './subscription.service';
import { CheckoutSubscriptionDto } from './dto/checkout-subscription.dto';
import { CheckoutCreditPackageDto } from './dto/checkout-credit-package.dto';
import { ChangePlanDto } from './dto/change-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/user.entity';

interface AuthenticatedRequest extends Request {
  user: User;
}

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'Listar planos disponíveis' })
  listPlans() {
    return this.billingService.listPlans();
  }

  @Get('credit-packages')
  @ApiOperation({ summary: 'Listar pacotes de créditos' })
  listCreditPackages() {
    return this.billingService.listCreditPackages();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Assinatura e créditos do usuário atual' })
  getMine(@Req() req: AuthenticatedRequest) {
    return this.billingService.getMine(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('subscriptions/checkout')
  @ApiOperation({ summary: 'Criar link de checkout de assinatura' })
  createSubscriptionCheckout(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CheckoutSubscriptionDto,
  ) {
    return this.billingService.createSubscriptionCheckout(
      req.user,
      dto.plan,
      dto.cycle,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('credit-packages/checkout')
  @ApiOperation({ summary: 'Criar link de checkout de pacote de créditos' })
  createCreditPackageCheckout(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CheckoutCreditPackageDto,
  ) {
    return this.billingService.createCreditPackageCheckout(
      req.user,
      dto.packageId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('change-plan')
  @ApiOperation({
    summary:
      'Alterar plano (upgrade aplica imediato; downgrade agenda para fim do ciclo)',
  })
  changePlan(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChangePlanDto,
  ) {
    return this.subscriptionService.changePlan(req.user, dto.plan, dto.cycle);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('cancel-pending-change')
  @ApiOperation({ summary: 'Cancelar um downgrade pendente' })
  cancelPendingChange(@Req() req: AuthenticatedRequest) {
    return this.subscriptionService.cancelPendingChange(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('cancel')
  @ApiOperation({ summary: 'Cancelar assinatura ativa' })
  cancelSubscription(@Req() req: AuthenticatedRequest) {
    return this.billingService.cancelSubscription(req.user);
  }

  @Post('webhooks/stripe')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook Stripe' })
  async stripeWebhook(
    @Req() req: RawBodyRequest,
    @Headers('stripe-signature') signature: string,
  ) {
    const raw = req.rawBody ?? (req.body as Buffer);
    await this.billingService.handleStripeWebhook(raw, signature);
    return { received: true };
  }

  @Post('webhooks/pagarme')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook Pagar.me' })
  async pagarmeWebhook(
    @Req() req: RawBodyRequest,
    @Headers('x-hub-signature') signature: string,
  ) {
    const raw = req.rawBody ?? (req.body as Buffer);
    await this.billingService.handlePagarmeWebhook(raw, signature);
    return { received: true };
  }
}
