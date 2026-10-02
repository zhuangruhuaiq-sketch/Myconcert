import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { DataProvider, useData } from "@/data/context";
import { BottomTabs, usePalette } from "@/components/ui";
import { useNotificationRouting } from "@/services/notification-routing";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View } from "react-native";

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
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: p.bg },
            animation: "fade",
            animationDuration: 180,
          }}
        />
      </View>
      <BottomTabs />
      <StatusBar style={dark ? "light" : "dark"} />
    </View>
  );
}
