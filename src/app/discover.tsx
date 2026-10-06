import { useEffect, useRef, useState } from "react";
import { Linking, View } from "react-native";
import { router, usePathname } from "expo-router";
import { Button, Card, Choices, Field, Label, Screen } from "@/components/ui";
import { useData } from "@/data/context";
import { artistSuggestions, groupShows, platforms, searchPlatform, searchUrl, type Platform } from "@/domain/discovery";
import { FoundShow } from "@/domain/rules";
import { cityName } from "@/domain/city-name";

export default function Discover() {
  const { data, change, ready, clock } = useData();
  const { following, results, lastSuccess } = data.discovery;
  const [name, setName] = useState("");
  const [artistFilter, setArtistFilter] = useState("全部歌手");
  const [cityFilter, setCityFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [failures, setFailures] = useState<Partial<Record<Platform, string>>>({});
  const [searched, setSearched] = useState(false);
  const [message, setMessage] = useState("");
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const pathname = usePathname();
  const followedKey = following.join("\n");

  async function refresh() {
    if (!ready || !following.length || loading) return;
    setLoading(true);
    setMessage("");
    const attempts = await Promise.allSettled(platforms.map((platform) => searchPlatform(platform, following)));
    const failed: Partial<Record<Platform, string>> = {};
    const successful: { platform: Platform; items: FoundShow[] }[] = [];
    attempts.forEach((attempt, index) => {
      const platform = platforms[index];
      if (attempt.status === "fulfilled") successful.push({ platform, items: attempt.value });
      else failed[platform] = String(attempt.reason);
    });
    try {
      if (successful.length) await change((previous) => {
        const refreshed = new Set(successful.map((entry) => entry.platform));
        return { ...previous, discovery: {
          ...previous.discovery,
          results: [...previous.discovery.results.filter((item) => !refreshed.has(item.platform as Platform)), ...successful.flatMap((entry) => entry.items)],
          lastSuccess: { ...previous.discovery.lastSuccess, ...Object.fromEntries(successful.map((entry) => [entry.platform, new Date().toISOString()])) },
        } };
      });
    } catch (error) { setMessage("搜索完成，但结果保存失败：" + String(error)); }
    setFailures(failed);
    setSearched(true);
    setLoading(false);
  }

  useEffect(() => { refreshRef.current = refresh; });
  useEffect(() => { if (pathname === "/discover" && ready && followedKey) void refreshRef.current(); }, [pathname, ready, followedKey]);

  async function addArtist(raw: string) {
    const artist = raw.trim();
    if (!artist) return;
    if (following.some((item) => item.normalize("NFKC").toLowerCase() === artist.normalize("NFKC").toLowerCase())) return;
    await change((previous) => ({ ...previous, discovery: { ...previous.discovery, following: [...previous.discovery.following, artist] } }));
    setName("");
  }

  const suggestions = artistSuggestions(data.events, following);
  const visible = groupShows(results.filter((item) => following.some((artist) => item.artists.split(/[,，、;；\/]+/).some((part) => part.trim() === artist))), clock)
    .filter((show) => (artistFilter === "全部歌手" || show.artists.includes(artistFilter)) && (!cityFilter.trim() || cityName(show.city).includes(cityName(cityFilter))));
  const cacheTime = Object.values(lastSuccess).sort().at(-1);
  return <Screen title="关注歌手演出">
    <Card title="关注歌手">
      <Field label="歌手名称" value={name} onChange={setName} />
      <Button title="添加关注" onPress={() => addArtist(name)} />
      {following.map((artist) => <View key={artist} style={{ gap: 4 }}><Label>{artist}</Label>
        <Button title={`取消关注 ${artist}`} subtle onPress={() => change((previous) => ({ ...previous, discovery: { ...previous.discovery, following: previous.discovery.following.filter((item) => item !== artist) } }))} />
      </View>)}
      {!following.length && <Label muted>添加歌手后，进入本页会尝试搜索公开演出。</Label>}
    </Card>
    {!!suggestions.length && <Card title="从已有演出建议关注" collapsible>
      {suggestions.map((artist) => <Button key={artist} title={`关注 ${artist}`} subtle onPress={() => addArtist(artist)} />)}
    </Card>}
    <Card title="搜索状态">
      <Label muted>仅在打开页面或点按刷新时搜索。以下结果可能不完整，请以票务平台为准。</Label>
      {cacheTime && <Label muted>最近成功更新：{new Date(cacheTime).toLocaleString()}</Label>}
      <Button title={loading ? "正在刷新" : "刷新演出"} disabled={loading || !following.length} onPress={refresh} />
      {platforms.map((platform) => <View key={platform} style={{ gap: 4 }}>
        <Label>{platform}：{failures[platform] ? "本次无法获取" : searched && lastSuccess[platform] ? "本次已更新" : "尚未成功获取"}</Label>
        {failures[platform] && <Label muted>{failures[platform]}</Label>}
        {lastSuccess[platform] && <Label muted>上次成功：{new Date(lastSuccess[platform]).toLocaleString()}</Label>}
        <Button title={`在应用内查看${platform}官方页面`} subtle onPress={() => router.push({ pathname: "/platform", params: { name: platform, artist: following[0] || "" } })} />
        {!!following.length && <Button title={platform === "秀动" || platform === "大麦" ? `打开${platform}搜索` : `打开${platform}手动搜索`} subtle onPress={() => Linking.openURL(searchUrl(platform, following[0]))} />}
      </View>)}
      {!!message && <Label>{message}</Label>}
    </Card>
    <Choices label="歌手筛选" value={artistFilter} options={["全部歌手", ...following]} onChange={setArtistFilter} />
    <Field label="城市筛选" value={cityFilter} onChange={setCityFilter} />
    <Label muted>按开演时间由近到远 · {visible.length} 场</Label>
    {!visible.length && <Card><Label>暂无符合条件的已验证未来场次。可查看上方各平台搜索入口。</Label></Card>}
    {visible.map((show) => {
      const saved = data.events.some((event) => show.links.some((link) => event.sourceUrl === link.url) ||
        (event.startAt === show.startAt && cityName(event.city) === cityName(show.city) && event.venue === show.venue && event.artists === show.artists));
      return <Card key={show.links[0].url} title={show.title}>
        <Label>{show.artists}</Label>
        <Label>{new Date(show.startAt).toLocaleString()} · {show.city} · {show.venue}</Label>
        {show.links.map((link) => <Button key={link.url} title={`查看${link.platform}原页`} subtle onPress={() => Linking.openURL(link.url)} />)}
        <Button title={saved ? "已收藏" : "收藏到演出"} disabled={saved} onPress={() => router.push({ pathname: "/edit", params: { found: JSON.stringify({ ...show, platform: show.links[0].platform, url: show.links[0].url }) } })} />
      </Card>;
    })}
  </Screen>;
}
