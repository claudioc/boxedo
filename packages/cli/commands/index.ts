import type { Command } from '../lib/Command';
import BulkLoadCommand from './bulk-load';
import DbBackupCommand from './db-backup';
import DbDownCommand from './db-down';
import DbResetCommand from './db-reset';
import DbRestoreCommand from './db-restore';
import DbUpCommand from './db-up';
import ExportCommand from './export';
import I18nCheckCommand from './i18n-check';
import I18nSyncCommand from './i18n-sync';
import ReleaseCommand from './release';
import ReverseProxyCommand from './reverse-proxy';
import UserAddCommand from './user-add';
import UserDelCommand from './user-del';
import UserListCommand from './user-list';
import UserRoleCommand from './user-role';
import VersionCommand from './version';

export const commandMap: Record<string, typeof Command> = {
  'bulk-load': BulkLoadCommand,
  'db-backup': DbBackupCommand,
  'db-down': DbDownCommand,
  'db-reset': DbResetCommand,
  'db-restore': DbRestoreCommand,
  'db-up': DbUpCommand,
  export: ExportCommand,
  'i18n-check': I18nCheckCommand,
  'i18n-sync': I18nSyncCommand,
  release: ReleaseCommand,
  'reverse-proxy': ReverseProxyCommand,
  'user-add': UserAddCommand,
  'user-del': UserDelCommand,
  'user-list': UserListCommand,
  'user-role': UserRoleCommand,
  version: VersionCommand,
} as const;
