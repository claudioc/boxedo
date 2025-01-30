import type {
  EmailProvider,
  EmailProviderConfig,
  EmailMessage,
} from '~/../types';

interface DummyConfig extends EmailProviderConfig {
  type: 'dummy';
  apiKey?: string;
  domain?: string;
  host?: string;
}

export class DummyProvider implements EmailProvider {
  async initialize(_config: DummyConfig) {}

  async sendEmail(message: EmailMessage): Promise<void> {
    console.log('[The Dummy Email Provider] Sending email:', message);
  }
}
