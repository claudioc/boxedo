import type {
  EmailMessage,
  EmailProvider,
  EmailProviderConfig,
} from 'boxedo-core/types';

interface SendgridConfig extends EmailProviderConfig {
  type: 'sendgrid';
  apiKey: string;
}

export class SendgridProvider implements EmailProvider {
  private apiKey!: string;

  async initialize(config: SendgridConfig) {
    this.apiKey = config.apiKey;
  }

  async sendEmail(message: EmailMessage): Promise<void> {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [
              {
                email: message.to.email,
                ...(message.to.name ? { name: message.to.name } : {}),
              },
            ],
          },
        ],
        from: {
          email: message.from.email,
          ...(message.from.name ? { name: message.from.name } : {}),
        },
        subject: message.subject,
        content: [
          { type: 'text/plain', value: message.text },
          ...(message.html ? [{ type: 'text/html', value: message.html }] : []),
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SendGrid API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`SendGrid error: ${response.status} ${errorText}`);
    }
  }
}
