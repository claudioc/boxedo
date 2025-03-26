import { execSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

// This directly referenced in the docker compose file
export const DOCKER_IMAGE_NAME = 'couchdb-joongle';

export const isDockerAvailable = (): boolean => {
  try {
    execSync('docker --version');
    return true;
  } catch {
    return false;
  }
};

export const isDockerImageRunning = (imageName: string): boolean => {
  try {
    execSync(`docker inspect ${imageName}`);
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

export const generateBackupFilename = (prefix: string, ext: string): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  const timestamp = `${year}-${month}-${day}-${hours}-${minutes}`;

  return `${prefix}-${timestamp}.${ext}`;
};

export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};
