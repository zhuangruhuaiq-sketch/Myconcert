import { Button, Label } from "./ui";
import { Linking, View } from "react-native";

export function PlatformBrowser({ url }: { url: string }) {
  return <View style={{ padding: 18, gap: 12 }}>
    <Label>网页端请在平台网站登录。网页浏览器的会话不会转入手机应用。</Label>
    <Button title="打开平台网站" onPress={() => Linking.openURL(url)} />
  </View>;
}
