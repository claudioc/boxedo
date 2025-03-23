import { execSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

export const isDockerAvailable = (): boolean => {
  try {
    execSync('docker --version');
    return true;
  } catch {
    return false;
  }
};

export const dockerComposeDown = () => {
  execSync('docker compose down', { stdio: 'inherit' });
};

export const dockerComposeUp = () => {
  execSync('docker compose up -d', { stdio: 'inherit' });
};

export const waitForService = async (
  url: string,
  maxAttempts = 30
): Promise<boolean> => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await fetch(url);
      return true;
    } catch (error) {
      await delay(1000);
    }
  }

  return false;
};
