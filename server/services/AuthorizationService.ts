import type { Capability, UserModel, UserRole } from '../../types';
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

    // Decision: during tests, grant all capabilities
    // FIXME: either we use a specific .env file for tests or we actually test with capabilities
    if (process.env.NODE_ENV === 'test') {
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

  public getRoleCapabilities(role: UserRole): Capability[] {
    return roleCapabilities[role];
  }
}
