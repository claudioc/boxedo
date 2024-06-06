import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { FastifyInstance } from 'fastify';
import type { FunctionalComponent } from 'preact';

export const AppContext = createContext<FastifyInstance | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within a AppProvider');
  }
  return context;
};

interface AppProviderProps {
  app: FastifyInstance;
  children: preact.ComponentChildren;
}

export const AppProvider: FunctionalComponent<AppProviderProps> = ({
  app,
  children,
}) => {
  return <AppContext.Provider value={app}>{children}</AppContext.Provider>;
};
