import { useEffect, useMemo, useRef } from "react";
import { CityPin, mapDocument } from "@/domain/map-document";

export default function WorldMap({ cities, onSelect }: { cities: CityPin[]; onSelect: (city: string) => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const html = useMemo(() => mapDocument(cities), [cities]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || typeof event.data !== "string") return;
      try { const message = JSON.parse(event.data);
        if (message.type === "myconcert-city" && cities.some((c) => c.city === message.city)) onSelect(message.city);
      } catch { /* Ignore unrelated frame messages. */ }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [cities, onSelect]);
  return <iframe ref={frame} title="演出城市世界地图" srcDoc={html}
    sandbox="allow-scripts allow-same-origin allow-popups" style={{ width: "100%", height: 400, border: 0, borderRadius: 16 }} />;
}
