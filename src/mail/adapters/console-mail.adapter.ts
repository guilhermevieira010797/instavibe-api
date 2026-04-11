import { Injectable, Logger } from '@nestjs/common';
import { MailAdapter, SendMailInput } from './mail-adapter.interface';

@Injectable()
export class ConsoleMailAdapter implements MailAdapter {
  private readonly logger = new Logger('ConsoleMailAdapter');

  send(input: SendMailInput): Promise<void> {
    this.logger.log(
      `\n==================== MAIL ====================\nTO: ${input.to}\nSUBJECT: ${input.subject}\n----------------------------------------------\n${input.html}\n==============================================\n`,
    );
    return Promise.resolve();
  }
}
