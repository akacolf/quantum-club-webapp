"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PollCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreatePoll: (question: string, options: string[]) => void;
}

export default function PollCreator({ open, onOpenChange, onCreatePoll }: PollCreatorProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const canAdd = options.length < 4;
  const isValid = question.trim().length > 0 && options.filter((o) => o.trim()).length >= 2;

  function reset() {
    setQuestion("");
    setOptions(["", ""]);
  }

  function handleCreate() {
    if (!isValid) return;
    onCreatePoll(question.trim(), options.map((o) => o.trim()).filter(Boolean));
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-[340px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Icon icon="mdi:poll" className="w-5 h-5 text-primary" />
            Create Poll
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-1">
          <Input
            placeholder="Ask a question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={200}
            className="text-sm"
          />

          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => {
                    const next = [...options];
                    next[i] = e.target.value;
                    setOptions(next);
                  }}
                  maxLength={100}
                  className="text-sm flex-1"
                />
                {options.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 shrink-0"
                    onClick={() => setOptions(options.filter((_, j) => j !== i))}
                  >
                    <Icon icon="lucide:x" className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {canAdd && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={() => setOptions([...options, ""])}
            >
              <Icon icon="lucide:plus" className="w-3.5 h-3.5 mr-1" />
              Add option
            </Button>
          )}

          <Button
            onClick={handleCreate}
            disabled={!isValid}
            className="w-full rounded-full"
            size="sm"
          >
            Create Poll
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
