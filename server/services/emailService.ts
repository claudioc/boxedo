import type {
  EmailMessage,
  EmailProvider,
  EmailProviderConfig,
} from '~/../types';
import { DummyProvider } from './emailProviders/dummy';
import { MailgunProvider } from './emailProviders/mailgun';
import { SendgridProvider } from './emailProviders/sendgrid';
import { SmtpProvider } from './emailProviders/smtp';

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
    switch (config.type.trim().toLowerCase()) {
      case 'mailgun':
        return new MailgunProvider();
      case 'smtp':
        return new SmtpProvider();
      case 'sendgrid':
        return new SendgridProvider();
      case '':
      case 'dummy':
        return new DummyProvider();
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
