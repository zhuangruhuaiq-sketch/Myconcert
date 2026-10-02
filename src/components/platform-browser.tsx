import { WebView } from "react-native-webview";

export function PlatformBrowser({ url }: { url: string }) {
  return <WebView
    source={{ uri: url }}
    style={{ flex: 1 }}
    sharedCookiesEnabled
    thirdPartyCookiesEnabled
  />;
}
