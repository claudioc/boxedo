import type {
  EmailProvider,
  EmailProviderConfig,
  EmailMessage,
} from '~/../types';
import FormData from 'form-data';

interface MailgunConfig extends EmailProviderConfig {
  type: 'mailgun';
  apiKey: string;
  domain: string;
  host?: string;
}

export class MailgunProvider implements EmailProvider {
  private apiKey!: string;
  private domain!: string;

  async initialize(config: MailgunConfig) {
    this.apiKey = config.apiKey;
    this.domain = config.domain;
  }

  async sendEmail(message: EmailMessage): Promise<void> {
    const form = new FormData();
    form.append('from', `${message.from.name} <${message.from.email}>`);
    form.append('to', `${message.to.name} <${message.to.email}>`);
    form.append('subject', message.subject);
    form.append('text', message.text);
    if (message.html) {
      form.append('html', message.html);
    }

    const response = await fetch(
      `https://api.mailgun.net/v3/${this.domain}/messages`,
      {
        method: 'POST',
        body: form as unknown as BodyInit,
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Mailgun error: ${response.statusText}`);
    }
  }
}
