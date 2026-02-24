import { Stack } from 'expo-router';
import ProtectedScreen from '../../components/ProtectedScreen';

export default function AttendantScreenLayout() {
  return (
    <ProtectedScreen allowedUserTypes={['Attendant', 'Admin']}>
      <Stack>
        <Stack.Screen 
          name="DashboardScreen" 
          options={{ 
            headerShown: false,
            title: 'Dashboard'
          }} 
        />
        <Stack.Screen 
          name="QRScannerScreen" 
          options={{ 
            headerShown: false,
            title: 'QR Scanner'
          }} 
        />
      </Stack>
    </ProtectedScreen>
  );
}
