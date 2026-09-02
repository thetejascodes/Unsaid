import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { AuthProvider, useAuth } from "../lib/auth-context";
import { useAppFonts } from "../lib/fonts";
import { colors } from "../lib/theme";

function AuthGate() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/phone-login");
    } else if (user && inAuthGroup) {
      router.replace("/mood-picker");
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.duskDeep }} />;
  }

  return <Slot />;
}

export default function RootLayout() {
  const [fontsLoaded] = useAppFonts();

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.duskDeep }} />;
  }

  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}