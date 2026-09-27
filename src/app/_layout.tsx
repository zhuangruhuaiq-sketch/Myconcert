import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { DataProvider, useData } from "@/data/context";
import { usePalette } from "@/components/ui";
import { useNotificationRouting } from "@/services/notification-routing";

export default function Layout() {
  return (
    <DataProvider>
      <Navigation />
    </DataProvider>
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
