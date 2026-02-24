import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  loadingMessage: string | null;
  targetRoute: string | null;
  showLoading: (message?: string, targetRoute?: string) => void;
  hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [targetRoute, setTargetRoute] = useState<string | null>(null);

  const showLoading = (message: string = 'Loading...', targetRoute?: string) => {
    setLoadingMessage(message);
    setTargetRoute(targetRoute || null);
    setIsLoading(true);
  };

  const hideLoading = () => {
    setIsLoading(false);
    setLoadingMessage(null);
    setTargetRoute(null);
  };

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        loadingMessage,
        targetRoute,
        showLoading,
        hideLoading,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
};


