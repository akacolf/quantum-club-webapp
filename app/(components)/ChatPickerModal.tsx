"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useChat } from "@/app/(contexts)/ChatContext";

interface ChatPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (chatId: string, chatName: string) => void;
}

export default function ChatPickerModal({ open, onClose, onSelect }: ChatPickerModalProps) {
  const { chats } = useChat();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
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
              {chats.length === 0 && (
                <div className="py-8 text-center">
                  <Icon icon="solar:chat-line-linear" className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No chats yet</p>
                </div>
              )}
              {chats.map((chat) => {
                const chatName = chat.groupName || chat.participantNames?.filter(Boolean).join(", ") || "Chat";
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
                      {chat.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate">{chat.lastMessage.text}</p>
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
