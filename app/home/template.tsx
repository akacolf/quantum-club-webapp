import PageFade from "@/app/(components)/PageFade";
import type { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  return <PageFade>{children}</PageFade>;
}
