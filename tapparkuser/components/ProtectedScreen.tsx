import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { useThemeColors } from '../contexts/ThemeContext';

interface ProtectedScreenProps {
  children: React.ReactNode;
  allowedUserTypes: string[];
  fallbackRoute?: string;
}

export default function ProtectedScreen({ 
  children, 
  allowedUserTypes, 
  fallbackRoute = '/screens/HomeScreen' 
}: ProtectedScreenProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const colors = useThemeColors();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // User is not authenticated
        router.replace('/screens/LoginScreen');
      } else if (user && !allowedUserTypes.includes(user.account_type_name)) {
        // User doesn't have permission for this route
        router.replace(fallbackRoute as any);
      }
    }
  }, [user, isAuthenticated, isLoading, allowedUserTypes, fallbackRoute]);

  // Show loading while checking permissions
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 10, color: colors.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  // Show nothing if not authenticated or no permission
  if (!isAuthenticated || !user || !allowedUserTypes.includes(user.account_type_name)) {
    return null;
  }

  return <>{children}</>;
}

