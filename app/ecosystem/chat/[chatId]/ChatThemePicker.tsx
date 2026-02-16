"use client";

import { Icon } from "@iconify/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CHAT_THEMES = [
  { id: "default", label: "Default", value: "" },
  {
    id: "dark-blue",
    label: "Ocean",
    value: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
  },
  {
    id: "dark-purple",
    label: "Nebula",
    value: "linear-gradient(135deg, #1a0533 0%, #2d1b69 50%, #1a0533 100%)",
  },
  {
    id: "dark-green",
    label: "Forest",
    value: "linear-gradient(135deg, #0a1f0a 0%, #1a3a2a 50%, #0a1f0a 100%)",
  },
  {
    id: "dark-red",
    label: "Ember",
    value: "linear-gradient(135deg, #1a0a0a 0%, #3a1a1a 50%, #1a0a0a 100%)",
  },
  {
    id: "stars",
    label: "Stars",
    value:
      "radial-gradient(ellipse at 20% 50%, #1b2735 0%, #090a0f 100%), radial-gradient(circle at 80% 20%, #1a1a2e 0%, transparent 50%)",
  },
  {
    id: "geometric",
    label: "Prism",
    value:
      "linear-gradient(135deg, #0c0c1d 25%, #1a1a3e 25%, #1a1a3e 50%, #0c0c1d 50%, #0c0c1d 75%, #1a1a3e 75%)",
  },
  {
    id: "aurora",
    label: "Aurora",
    value:
      "linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #24243e 70%, #0f0c29 100%)",
  },
];

interface ChatThemePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTheme: string;
  onSelect: (theme: string) => void;
}

export default function ChatThemePicker({
  open,
  onOpenChange,
  currentTheme,
  onSelect,
}: ChatThemePickerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm">Chat Wallpaper</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-2">
          {CHAT_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => {
                onSelect(theme.value);
                onOpenChange(false);
              }}
              className={`relative flex flex-col items-center gap-1 rounded-lg p-1 transition-colors hover:bg-muted/60 ${
                currentTheme === theme.value
                  ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                  : ""
              }`}
            >
              <div
                className="w-full aspect-square rounded-md border border-border/50"
                style={{
                  background:
                    theme.value || "var(--background)",
                }}
              />
              <span className="text-[10px] text-muted-foreground leading-tight">
                {theme.label}
              </span>
              {currentTheme === theme.value && (
                <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center">
                  <Icon
                    icon="solar:check-circle-bold"
                    className="w-2.5 h-2.5 text-primary-foreground"
                  />
                </div>
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
