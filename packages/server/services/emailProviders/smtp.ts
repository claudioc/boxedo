import type {
  EmailMessage,
  EmailProvider,
  EmailProviderConfig,
} from 'boxedo-core/types';
import nodemailer from 'nodemailer';

interface SmtpConfig extends EmailProviderConfig {
  type: 'smtp';
  host: string;
  port: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

export class SmtpProvider implements EmailProvider {
  private transporter!: nodemailer.Transporter;

  async initialize(config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure ?? config.port === 465,
      auth: config.auth,
    });
  }

  async sendEmail(message: EmailMessage): Promise<void> {
    if (
      !message.from ||
      !message.to ||
      !message.subject ||
      (!message.text && !message.html)
    ) {
      throw new Error('Invalid email message: missing required fields');
    }

    try {
      await this.transporter.sendMail({
        from: `${message.from.name} <${message.from.email}>`,
        to: `${message.to.name} <${message.to.email}>`,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  }
}
