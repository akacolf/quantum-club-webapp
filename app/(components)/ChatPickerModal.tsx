"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useAuth } from "@/app/(contexts)/auth";
import { useChatConversations } from "@/app/(hooks)/queries/use-chat-list";
import { isEncryptedMessage } from "@/lib/chat-crypto";

interface ChatPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (chatId: string, chatName: string) => void;
}

export default function ChatPickerModal({ open, onClose, onSelect }: ChatPickerModalProps) {
  const { telegramId } = useUserContext();
  const { currentUser } = useAuth();
  const isAuthenticated = !!currentUser;
  const { data: conversations = [], isLoading } = useChatConversations(telegramId, isAuthenticated);

  const showSkeleton = isLoading && conversations.length === 0;
  const showEmpty = !isLoading && conversations.length === 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-card border-t border-border rounded-t-2xl overflow-hidden max-h-[60vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-base font-bold">Share to Chat</h2>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <Icon icon="lucide:x" className="w-4 h-4" />
              </Button>
            </div>

            {/* Chat list */}
            <div className="overflow-y-auto max-h-[calc(60vh-60px)] p-2">
              {showSkeleton && (
                <div className="space-y-2 p-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showEmpty && (
                <div className="py-8 text-center">
                  <Icon icon="solar:chat-line-linear" className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No chats yet</p>
                </div>
              )}
              {conversations.map((chat) => {
                const names = telegramId
                  ? Object.entries(chat.participantNames)
                      .filter(([uid]) => uid !== telegramId)
                      .map(([, name]) => name)
                      .join(", ")
                  : "";
                const chatName = chat.groupName || names || "Chat";
                // Show a clean preview: decrypted system messages pass through,
                // ciphertext becomes "Encrypted message". Full async decryption
                // isn't worth it here — the picker is transient and users are
                // just identifying which chat to send into, not reading content.
                const preview = chat.lastMessage
                  ? isEncryptedMessage(chat.lastMessage)
                    ? "Encrypted message"
                    : chat.lastMessage
                  : null;
                return (
                  <button
                    key={chat.id}
                    onClick={() => onSelect(chat.id, chatName)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent transition-colors"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                        {chatName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate">{chatName}</p>
                      {preview && (
                        <p className="text-xs text-muted-foreground truncate">{preview}</p>
                      )}
                    </div>
                    <Icon icon="solar:arrow-right-linear" className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
