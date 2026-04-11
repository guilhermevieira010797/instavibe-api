import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAIL_ADAPTER } from './adapters/mail-adapter.interface';
import type { MailAdapter } from './adapters/mail-adapter.interface';
import { welcomeVerificationTemplate } from './templates/welcome-verification.template';
import { welcomeTemplate } from './templates/welcome.template';
import { passwordResetTemplate } from './templates/password-reset.template';
import { subscriptionExpirationTemplate } from './templates/subscription-expiration.template';

@Injectable()
export class MailService {
  constructor(
    @Inject(MAIL_ADAPTER) private readonly adapter: MailAdapter,
    private readonly configService: ConfigService,
  ) {}

  async sendWelcomeWithVerification(to: string, name: string, code: string) {
    const ttl = parseInt(
      this.configService.get<string>('EMAIL_VERIFICATION_CODE_TTL_MIN', '30'),
      10,
    );
    const { subject, html } = welcomeVerificationTemplate({
      name,
      code,
      expiresInMinutes: ttl,
    });
    await this.adapter.send({ to, subject, html });
  }

  async sendWelcome(to: string, name: string) {
    const { subject, html } = welcomeTemplate({ name });
    await this.adapter.send({ to, subject, html });
  }

  async sendPasswordReset(to: string, name: string, code: string) {
    const ttl = parseInt(
      this.configService.get<string>('PASSWORD_RESET_CODE_TTL_MIN', '30'),
      10,
    );
    const { subject, html } = passwordResetTemplate({
      name,
      code,
      expiresInMinutes: ttl,
    });
    await this.adapter.send({ to, subject, html });
  }

  async sendSubscriptionExpirationWarning(
    to: string,
    name: string,
    plan: string,
    expiresAt: Date,
  ) {
    const { subject, html } = subscriptionExpirationTemplate({
      name,
      plan,
      expiresAt,
    });
    await this.adapter.send({ to, subject, html });
  }
}
