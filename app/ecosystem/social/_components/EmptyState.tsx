"use client";

import { Icon } from "@iconify/react";

interface Props {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

/** Pure icon + copy. No tinted boxes, no outline borders (design system). */
export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center text-center gap-3 px-6 py-16">
      <Icon icon={icon} className="w-14 h-14 text-muted-foreground" />
      <div className="space-y-1.5">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
