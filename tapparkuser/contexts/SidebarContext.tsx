import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SidebarContextType {
  isSidebarVisible: boolean;
  currentScreen: string;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  setCurrentScreen: (screen: string) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

interface SidebarProviderProps {
  children: ReactNode;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({ children }) => {
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('Home');

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  const closeSidebar = () => {
    setIsSidebarVisible(false);
  };

  return (
    <SidebarContext.Provider
      value={{
        isSidebarVisible,
        currentScreen,
        toggleSidebar,
        closeSidebar,
        setCurrentScreen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};






