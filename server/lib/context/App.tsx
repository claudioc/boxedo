import type { FastifyInstance } from 'fastify';

// Store context in a module-level variable (safe for SSR since it's per-request)
let currentApp: FastifyInstance | null = null;

export const AppProvider = ({
  app,
  children,
}: {
  app: FastifyInstance;
  children: JSX.Element;
}) => {
  console.log('app', app);
  currentApp = app;
  return children;
};

export const useApp = (): FastifyInstance => {
  if (!currentApp) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return currentApp;
};

// Helper to reset context between requests
export const resetContext = () => {
  currentApp = null;
};
