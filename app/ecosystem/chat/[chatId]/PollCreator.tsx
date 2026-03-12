"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { pollSchema } from "@/lib/validations";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError } from "@/components/ui/field";
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

let optionKeyCounter = 0;
const nextOptionKey = () => `opt-${++optionKeyCounter}`;

export default function PollCreator({ open, onOpenChange, onCreatePoll }: PollCreatorProps) {
  const form = useForm({
    defaultValues: {
      question: "",
      options: [{ value: "", id: nextOptionKey() }, { value: "", id: nextOptionKey() }],
    },
    validators: { onSubmit: pollSchema },
    onSubmit: async ({ value }) => {
      onCreatePoll(value.question.trim(), value.options.map((o) => o.value.trim()).filter(Boolean));
      resetForm();
      onOpenChange(false);
    },
  });

  const watchedOptions = useStore(form.store, (s) => s.values.options);
  const watchedQuestion = useStore(form.store, (s) => s.values.question);

  const filledOptions = watchedOptions.filter((o) => o.value.trim()).length;
  const isValid = watchedQuestion.trim().length > 0 && filledOptions >= 2;

  function resetForm() {
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-[340px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Icon icon="mdi:poll" className="w-5 h-5 text-primary" />
            Create Poll
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-1">
          <form.Field
            name="question"
            >
            {(field) => {
              const hasErrors = field.state.meta.errors.length > 0;
              return (
                <Field data-invalid={hasErrors}>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={hasErrors}
                    placeholder="Ask a question..."
                    maxLength={200}
                    className="text-sm"
                  />
                  {hasErrors && <FieldError errors={field.state.meta.errors.map(e => ({ message: String(e) }))} />}
                </Field>
              );
            }}
          </form.Field>

          <div className="space-y-2">
            <form.Field
              name="options"
              mode="array"
              >
              {(field) => (
                <>
                  {field.state.value.map((opt, i) => (
                    <form.Field
                      key={opt.id}
                      name={`options[${i}].value`}
                      >
                      {(subField) => (
                        <div className="flex items-center gap-2">
                          <Input
                            id={subField.name}
                            value={subField.state.value}
                            onBlur={subField.handleBlur}
                            onChange={(e) => subField.handleChange(e.target.value)}
                            aria-invalid={subField.state.meta.errors.length > 0}
                            placeholder={`Option ${i + 1}`}
                            maxLength={100}
                            className="text-sm flex-1"
                          />
                          {field.state.value.length > 2 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 shrink-0"
                              onClick={() => field.removeValue(i)}
                            >
                              <Icon icon="lucide:x" className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      )}
                    </form.Field>
                  ))}

                  {field.state.value.length < 4 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-muted-foreground"
                      onClick={() => field.pushValue({ value: "", id: nextOptionKey() })}
                    >
                      <Icon icon="lucide:plus" className="w-3.5 h-3.5 mr-1" />
                      Add option
                    </Button>
                  )}
                </>
              )}
            </form.Field>
          </div>

          <Button
            onClick={() => form.handleSubmit()}
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
