"use client";

import { Icon } from "@iconify/react";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { dbfs } from "@/app/(firebase)/client";

interface PollData {
  question: string;
  options: string[];
  votes: Record<string, string[]>;
  createdBy: string;
}

interface PollMessageProps {
  msgId: string;
  poll: PollData;
  telegramId: string;
  chatId: string;
  isOwnMessage: boolean;
}

export default function PollMessage({ msgId, poll, telegramId, chatId, isOwnMessage }: PollMessageProps) {
  const totalVotes = Object.values(poll.votes).reduce((sum, arr) => sum + arr.length, 0);
  const userVotedOption = Object.entries(poll.votes).find(([, voters]) =>
    voters.includes(telegramId)
  )?.[0];

  async function handleVote(optionIndex: number) {
    const key = String(optionIndex);
    const msgRef = doc(dbfs, "qc-chats", chatId, "messages", msgId);

    try {
      // Remove previous vote if any
      if (userVotedOption !== undefined) {
        await updateDoc(msgRef, {
          [`poll.votes.${userVotedOption}`]: arrayRemove(telegramId),
        });
      }
      // Add new vote (skip if tapping the same option to un-vote)
      if (userVotedOption !== key) {
        await updateDoc(msgRef, {
          [`poll.votes.${key}`]: arrayUnion(telegramId),
        });
      }
    } catch (err) {
      console.error("Vote failed:", err);
    }
  }

  return (
    <div className="space-y-2 min-w-[200px]">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon icon="solar:chart-2-bold" className="w-4 h-4 text-primary shrink-0" />
        <span className="text-[13px] font-semibold text-foreground leading-tight">
          {poll.question}
        </span>
      </div>

      {poll.options.map((option, i) => {
        const key = String(i);
        const count = poll.votes[key]?.length || 0;
        const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        const isMyVote = userVotedOption === key;

        return (
          <button
            key={i}
            onClick={() => handleVote(i)}
            className={`w-full text-left rounded-lg px-2.5 py-1.5 relative overflow-hidden transition-colors border ${
              isMyVote
                ? "border-primary/40 bg-primary/5"
                : "border-border/50 bg-background/50 hover:bg-muted/40"
            }`}
          >
            {/* Progress bar background */}
            <div
              className="absolute inset-y-0 left-0 bg-primary/10 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
            <div className="relative flex items-center justify-between gap-2">
              <span className={`text-[12px] leading-tight ${isMyVote ? "font-semibold text-primary" : "text-foreground"}`}>
                {isMyVote && <Icon icon="solar:check-read-bold" className="w-3 h-3 inline mr-1" />}
                {option}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {pct}%
              </span>
            </div>
          </button>
        );
      })}

      <p className="text-[10px] text-muted-foreground text-center pt-0.5">
        {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
