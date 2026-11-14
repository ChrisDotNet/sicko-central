// Bigger versions of an outlet's thumbnail, for featured stories. Every source serves
// several sizes from the same address: NHL.com's image template, YouTube's numbered sizes,
// TSN's resize-on-request. Still loaded straight from the outlet, never copied.
export function biggerImage(url: string | null | undefined, size: "lead" | "mid"): string | null {
  if (!url) return null;
  if (url.includes("media.d3.nhle.com")) return url.replace(/t_ratio16_9-size\d+/, size === "lead" ? "t_ratio16_9-size50" : "t_ratio16_9-size40");
  // YouTube: 4:3 frames with the 16:9 picture in the middle; a 16:9 crop drops the bars.
  if (url.includes("i.ytimg.com")) return url.replace(/\/(?:mq|hq|sd|maxres)?default\.jpg/, size === "lead" ? "/sddefault.jpg" : "/hqdefault.jpg");
  if (/[?&]width=\d+/.test(url))
    return url.replace(/([?&])width=\d+/, `$1width=${size === "lead" ? 1200 : 640}`).replace(/([?&])height=\d+/, `$1height=${size === "lead" ? 675 : 360}`);
  return url;
}
