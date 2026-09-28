import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { DataProvider, useData } from "@/data/context";
import { usePalette } from "@/components/ui";
import { useNotificationRouting } from "@/services/notification-routing";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}><DataProvider>
      <Navigation />
    </DataProvider></GestureHandlerRootView>
  );
}
function Navigation() {
  useNotificationRouting();
  const { dark } = useData();
  const p = usePalette();
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: p.bg },
        }}
      />
      <StatusBar style={dark ? "light" : "dark"} />
    </>
  );
}
