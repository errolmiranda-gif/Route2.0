import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { CustomLoadingOverlay } from '@/components/custom-loading';
import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
    <CustomLoadingOverlay />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F4F2EA' } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="account" />
      <Stack.Screen name="explore" />
      <Stack.Screen name="alerts" />
    </Stack>
  </ThemeProvider>;
}
