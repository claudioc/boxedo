import type { Capability, UserModel } from '../../types';
import { roleCapabilities } from '../../types';

export class AuthorizationService {
  private static instance: AuthorizationService;

  private constructor() {}

  public static getInstance(): AuthorizationService {
    if (!AuthorizationService.instance) {
      AuthorizationService.instance = new AuthorizationService();
    }
    return AuthorizationService.instance;
  }

  public hasCapability(
    user: UserModel | null,
    capability: Capability
  ): boolean {
    if (capability === 'impossible') {
      return false;
    }

    // Decision: If auth is disabled, grant all capabilities
    if (!user && process.env.AUTHENTICATION_TYPE === 'none') {
      return true;
    }

    if (!user) {
      return false;
    }

    const userCapabilities = roleCapabilities[user.role];

    if (!userCapabilities) {
      return false;
    }

    return userCapabilities.includes(capability);
  }
}
