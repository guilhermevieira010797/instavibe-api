export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
}

export const MAIL_ADAPTER = Symbol('MAIL_ADAPTER');

export interface MailAdapter {
  send(input: SendMailInput): Promise<void>;
}
