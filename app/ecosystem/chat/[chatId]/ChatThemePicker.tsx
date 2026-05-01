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
    value: "#0f172a",
  },
  {
    id: "dark-purple",
    label: "Nebula",
    value: "#1a0533",
  },
  {
    id: "dark-green",
    label: "Forest",
    value: "#0a1f0a",
  },
  {
    id: "dark-red",
    label: "Ember",
    value: "#1a0a0a",
  },
  {
    id: "stars",
    label: "Stars",
    value: "#090a0f",
  },
  {
    id: "geometric",
    label: "Prism",
    value: "#0c0c1d",
  },
  {
    id: "aurora",
    label: "Aurora",
    value: "#0f0c29",
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
          <DialogTitle className="text-sm">Chat wallpaper</DialogTitle>
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
                    icon="lucide:check"
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
