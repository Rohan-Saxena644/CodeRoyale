import type { SVGProps } from "react";

type IconName = "arrow" | "code" | "check" | "bolt" | "link" | "refresh" | "clock" | "server";
const paths: Record<IconName, string> = {
  arrow: "M5 12h14m-6-6 6 6-6 6",
  code: "m8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18",
  check: "m5 12 4 4L19 6",
  bolt: "m13 2-9 12h7l-1 8 10-12h-7l1-8Z",
  link: "m10 13 4-4m-6 6-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 3 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0",
  refresh: "M20 7v5h-5M4 17v-5h5m-4-4a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3",
  clock: "M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  server: "M4 3h16v7H4V3Zm0 11h16v7H4v-7Zm3-7h.01M7 18h.01M12 7h5m-5 11h5",
};

export function UiIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>;
}
