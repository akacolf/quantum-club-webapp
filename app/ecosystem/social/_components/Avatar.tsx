"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { getInitials } from "./format";

interface Props {
  src: string | null;
  name: string;
  size?: number;
  className?: string;
}

/**
 * Profile avatar — renders the image when available, otherwise a flat
 * background tile with initials. No outline border (design system).
 */
export function Avatar({ src, name, size = 40, className }: Props) {
  if (src) {
    return (
      <div
        className={cn("relative rounded-full overflow-hidden shrink-0", className)}
        style={{ width: size, height: size }}
      >
        <Image
          src={src}
          alt={name}
          fill
          sizes={`${size}px`}
          className="object-cover"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-secondary text-secondary-foreground shrink-0",
        "flex items-center justify-center text-xs font-semibold",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {getInitials(name) || "?"}
    </div>
  );
}
