import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Label, usePalette } from "@/components/ui";
import { PlatformBrowser } from "@/components/platform-browser";
import { platforms, searchUrl, type Platform } from "@/domain/discovery";

export default function PlatformPage() {
  const { name, artist } = useLocalSearchParams<{ name?: string; artist?: string }>();
  const platform = platforms.find((item) => item === name) as Platform | undefined;
  const p = usePalette();
  const url = platform ? searchUrl(platform, artist || "") : "";
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }}>
    <View style={{ padding: 12, gap: 8 }}>
      <Button title="返回发现" subtle onPress={() => router.back()} />
      <Label large>{platform || "未知平台"}</Label>
      <Label muted>若平台提供登录入口，请自行登录。Myconcert 不读取账号、密码或验证码。</Label>
      {!!url && <Label muted>{new URL(url).hostname}</Label>}
    </View>
    {platform ? <PlatformBrowser url={url} /> : <Label>平台名称无效。</Label>}
  </SafeAreaView>;
}
