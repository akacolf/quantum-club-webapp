"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { pollSchema, type PollFormData } from "@/lib/validations";
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
  const form = useForm<PollFormData>({
    resolver: zodResolver(pollSchema),
    defaultValues: {
      question: "",
      options: [{ value: "" }, { value: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });

  const canAdd = fields.length < 4;
  const filledOptions = form.watch("options").filter((o) => o.value.trim()).length;
  const isValid = form.watch("question").trim().length > 0 && filledOptions >= 2;

  function reset() {
    form.reset({ question: "", options: [{ value: "" }, { value: "" }] });
  }

  function handleCreate(data: PollFormData) {
    onCreatePoll(data.question.trim(), data.options.map((o) => o.value.trim()).filter(Boolean));
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
            {...form.register("question")}
            maxLength={200}
            className="text-sm"
          />

          <div className="space-y-2">
            {fields.map((field, i) => (
              <div key={field.id} className="flex items-center gap-2">
                <Input
                  placeholder={`Option ${i + 1}`}
                  {...form.register(`options.${i}.value`)}
                  maxLength={100}
                  className="text-sm flex-1"
                />
                {fields.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 shrink-0"
                    onClick={() => remove(i)}
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
              onClick={() => append({ value: "" })}
            >
              <Icon icon="lucide:plus" className="w-3.5 h-3.5 mr-1" />
              Add option
            </Button>
          )}

          <Button
            onClick={form.handleSubmit(handleCreate)}
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
