import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View } from 'react-native';
import { DrawerProvider } from '../contexts/DrawerContext';
import { AuthProvider } from '../contexts/AuthContext';
import { LoadingProvider } from '../contexts/LoadingContext';
import { ExpirationModalProvider } from '../contexts/ExpirationModalContext';
import { ThemeProvider, useThemeColors } from '../contexts/ThemeContext';
import CustomDrawer from '../components/CustomDrawer';
import GlobalSpinner from '../components/GlobalSpinner';
import ExpirationModal from '../components/ExpirationModal';
import { useDrawer } from '../contexts/DrawerContext';

function RootLayoutNav() {
	const { isDrawerOpen, closeDrawer } = useDrawer();
	
	return (
		<>
			<Stack
				screenOptions={{
					headerShown: false,
					animation: 'fade',
					contentStyle: {
						backgroundColor: 'transparent',
					},
				}}
			>
				<Stack.Screen 
					name="index" 
					options={{
						animation: 'fade',
					}}
				/>
				<Stack.Screen name="screens" />
				<Stack.Screen name="attendant-screen" />
				<Stack.Screen name="ProfileScreen" />
				<Stack.Screen 
					name="(tabs)" 
					options={{
						animation: 'fade',
					}}
				/>
				<Stack.Screen 
					name="modal" 
					options={{
						presentation: 'modal',
						animation: 'slide_from_bottom',
					}}
				/>
			</Stack>
			<CustomDrawer isOpen={isDrawerOpen} onClose={closeDrawer} />
		</>
	);
}

function ThemedRootLayout() {
	const colors = useThemeColors();
	
	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<RootLayoutNav />
			<GlobalSpinner />
			<ExpirationModal />
		</View>
	);
}

export default function RootLayout() {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<ThemeProvider>
				<AuthProvider>
					<LoadingProvider>
						<ExpirationModalProvider>
							<DrawerProvider>
								<ThemedRootLayout />
							</DrawerProvider>
						</ExpirationModalProvider>
					</LoadingProvider>
				</AuthProvider>
			</ThemeProvider>
		</GestureHandlerRootView>
	);
}
