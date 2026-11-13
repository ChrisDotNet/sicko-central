import type { NewsItem } from "@/lib/news";
import type { GameVideo } from "@/lib/video";
import { formatTime } from "@/lib/format";

export type LatestItem = { key: string; kind: string; title: string; href?: string; external?: boolean; onSelect?: () => void };

// The newest things on the Media tab, for the desktop side column: full-game video first,
// then the latest stories.
export function latestItems(
  media: { news: NewsItem[]; video: GameVideo | null } | null,
  open: { video: (clipId: number) => LatestItem["onSelect"] | string },
): LatestItem[] {
  if (!media) return [];
  const video = [...(media.video?.recaps ?? []), ...(media.video?.condensed ?? [])].slice(0, 2).map((v) => {
    const target = open.video(v.clipId);
    return {
      key: `v-${v.clipId}`,
      kind: "Video · NHL.com",
      title: v.title,
      ...(typeof target === "string" ? { href: target } : { onSelect: target }),
    };
  });
  const news = media.news.slice(0, 5 - video.length).map((n) => ({
    key: n.url,
    kind: `${n.outlet} · ${formatTime(n.published)}`,
    title: n.title,
    href: n.url,
    external: true,
  }));
  return [...video, ...news];
}
