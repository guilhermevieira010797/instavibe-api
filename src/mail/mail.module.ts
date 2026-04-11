import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { ConsoleMailAdapter } from './adapters/console-mail.adapter';
import { MAIL_ADAPTER } from './adapters/mail-adapter.interface';

@Global()
@Module({
  providers: [
    ConsoleMailAdapter,
    {
      provide: MAIL_ADAPTER,
      useFactory: (configService: ConfigService, consoleAdapter: ConsoleMailAdapter) => {
        const provider = configService.get<string>('MAIL_PROVIDER', 'console');
        if (provider === 'console') return consoleAdapter;
        return consoleAdapter;
      },
      inject: [ConfigService, ConsoleMailAdapter],
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
