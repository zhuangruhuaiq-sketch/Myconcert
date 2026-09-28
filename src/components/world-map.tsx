import { useMemo } from "react";
import { WebView } from "react-native-webview";
import { CityPin, mapDocument } from "@/domain/map-document";

export default function WorldMap({ cities, onSelect }: { cities: CityPin[]; onSelect: (city: string) => void }) {
  const html = useMemo(() => mapDocument(cities), [cities]);
  return <WebView source={{ html, baseUrl: "https://localhost/" }} originWhitelist={["*"]}
    applicationNameForUserAgent="Myconcert/1.0" style={{ height: 400, flex: 0 }} scrollEnabled={false}
    nestedScrollEnabled bounces={false} overScrollMode="never"
    onMessage={(event) => {
      try { const message = JSON.parse(event.nativeEvent.data);
        if (message.type === "myconcert-city" && cities.some((c) => c.city === message.city)) onSelect(message.city);
      } catch { /* Ignore messages not produced by our city markers. */ }
    }} />;
}
