import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import ApiService from '../services/api';
import RealtimeService from '../services/realtime';
import { normalizeUserProfileImageFields } from '../utils/profileImage';

interface User {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  profile_image?: string;
  profile_image_url?: string;
  hour_balance: number;
  type_id: number;
  account_type_name: string;
  terms_accepted?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const resetRealtimeAndCache = () => {
  RealtimeService.clearSubscriptions();
  RealtimeService.disconnect();
  ApiService.clearCache();
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = async () => {
    let token: string | null = null;
    try {
      setIsLoading(true);

      token = await ApiService.getStoredToken();
      if (!token) {
        console.log('?? No token found, user not authenticated');
        resetRealtimeAndCache();
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      const response = await ApiService.getProfile();
      if (response.success && response.data.user) {
        setUser(normalizeUserProfileImageFields(response.data.user) as User);
        setIsAuthenticated(true);
      } else {
        resetRealtimeAndCache();
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Too many requests') || message.includes('Rate limit cooldown')) {
        console.log('? Token validation throttled; keeping current auth state.');
        if (token) {
          setIsAuthenticated(true);
        }
      } else {
        console.log('?? Token validation failed:', error);
        resetRealtimeAndCache();
        setUser(null);
        setIsAuthenticated(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      await ApiService.initializeToken();
      await checkAuthStatus();
    };
    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      setIsLoading(true);

      // Avoid carrying old realtime subscriptions/session state across account switches.
      resetRealtimeAndCache();

      const response = await ApiService.login(email, password);

      if (response.success && response.data && response.data.user) {
        const normalizedUser = normalizeUserProfileImageFields(response.data.user) as User;
        setUser(normalizedUser);
        setIsAuthenticated(true);
        return { success: true, user: normalizedUser };
      }

      return { success: false, error: response.message || 'Invalid email or password' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error. Please check your connection and try again.';
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await ApiService.logout();
    } catch (_error) {
      // Silent logout
    } finally {
      resetRealtimeAndCache();
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
