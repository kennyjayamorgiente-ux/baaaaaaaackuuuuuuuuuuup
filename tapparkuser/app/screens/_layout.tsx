import { Stack } from 'expo-router';

export default function ScreensLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen 
        name="Splash1Screen" 
        options={{
          animation: 'fade',
        }}
      />
      <Stack.Screen name="GreetingsScreen" />
      <Stack.Screen name="LoginScreen" />
      <Stack.Screen name="SignupScreen" />
      <Stack.Screen name="AboutScreen" />
      <Stack.Screen name="AddVehicleScreen" />
      <Stack.Screen name="HomeScreen" />
      <Stack.Screen name="ActiveParkingScreen" />
      <Stack.Screen name="FavoritesScreen" />
      <Stack.Screen name="HistoryScreen" />
      <Stack.Screen name="ChangePasswordScreen" />
      <Stack.Screen name="RegisteredVehiclesScreen" />
      <Stack.Screen name="TermsAndConditionsScreen" />
      <Stack.Screen name="BalanceScreen" />
      <Stack.Screen name="TopUpScreen" />
      <Stack.Screen name="FAQScreen" />
    </Stack>
  );
}
