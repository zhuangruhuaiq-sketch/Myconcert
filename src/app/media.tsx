import { useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useData } from "@/data/context";
import { Label, Screen } from "@/components/ui";
export default function MediaPage() {
  const { eventId, mediaId } = useLocalSearchParams<{
    eventId: string;
    mediaId: string;
  }>();
  const { data } = useData();
  const media = data.events
    .find((e) => e.id === eventId)
    ?.media?.find((m) => m.id === mediaId);
  return (
    <Screen title="现场视频" back>
      {media ? <Video uri={media.uri} /> : <Label>附件不存在。</Label>}
    </Screen>
  );
}
function Video({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  return (
    <VideoView
      player={player}
      nativeControls
      style={{ width: "100%", height: 300 }}
    />
  );
}
