import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import Splash1Screen from './screens/Splash1Screen';

export default function Index() {
  const router = useRouter();
  const authContext = useContext(AuthContext);
  const isAuthenticated = authContext?.isAuthenticated ?? false;
  const user = authContext?.user ?? null;
  const isLoading = authContext?.isLoading ?? true;

  useEffect(() => {
    if (!authContext) {
      return;
    }
    if (!isLoading) {
      if (!isAuthenticated) {
        // User is not logged in, redirect to splash screen
        // Note: We can't easily check current route in expo-router, so we'll always redirect
        // This is fine since login errors are handled in the LoginScreen itself
        router.replace('/screens/Splash1Screen');
      } else {
        // User is authenticated, redirect to appropriate screen based on user type
        if (user?.account_type_name === 'Attendant') {
          router.replace('/attendant-screen/DashboardScreen');
        } else {
          router.replace('/screens/HomeScreen');
        }
      }
    }
  }, [authContext, isAuthenticated, isLoading, user, router]);

  // If AuthProvider is not ready, show splash screen
  if (!authContext) {
    return <Splash1Screen />;
  }

  // Show splash screen while loading or if not authenticated
  if (isLoading || !isAuthenticated) {
    return <Splash1Screen />;
  }

  // This should not be reached due to the useEffect above, but just in case
  return <Splash1Screen />;
}
