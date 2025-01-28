import type {
  EmailProvider,
  EmailProviderConfig,
  EmailMessage,
} from '~/../types';
import { MailgunProvider } from './emailProviders/mailgun';
import { SmtpProvider } from './emailProviders/smtp';
import { SendgridProvider } from './emailProviders/sendgrid';

export class EmailService {
  private provider: EmailProvider | null = null;
  private static instance: EmailService;

  private constructor() {}

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async initialize(config: EmailProviderConfig): Promise<void> {
    this.provider = await this.createProvider(config);
    await this.provider.initialize(config);
  }

  private async createProvider(
    config: EmailProviderConfig
  ): Promise<EmailProvider> {
    switch (config.type) {
      case 'mailgun':
        return new MailgunProvider();
      case 'smtp':
        return new SmtpProvider();
      case 'sendgrid':
        return new SendgridProvider();
      default:
        throw new Error(`Unsupported email provider: ${config.type}`);
    }
  }

  async sendEmail(message: EmailMessage): Promise<void> {
    if (!this.provider) {
      throw new Error('Email service not initialized');
    }
    await this.provider.sendEmail(message);
  }
}
