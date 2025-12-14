"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { ButtonLoader } from "./ButtonLoader";
import Image from "next/image";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

// Memoized logo components for performance
const QuantumLogoWhiteBg = memo(function QuantumLogoWhiteBg() {
    return (
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center overflow-hidden">
            <Image
                src="/svg/logo-white.svg"
                alt="Quantum Club AI"
                width={20}
                height={20}
                className="invert"
                priority
            />
        </div>
    );
});

const QuantumLogoBlackBg = memo(function QuantumLogoBlackBg() {
    return (
        <div className="shrink-0 w-7 h-7 rounded-full bg-black border border-[#333] flex items-center justify-center overflow-hidden">
            <Image
                src="/svg/logo-white.svg"
                alt="AI"
                width={14}
                height={14}
                priority
            />
        </div>
    );
});

// Memoized message component for performance
const ChatMessage = memo(function ChatMessage({ message }: { message: Message }) {
    const isUser = message.role === "user";

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
        >
            {/* Avatar */}
            {isUser ? (
                <div className="shrink-0 w-7 h-7 rounded-full bg-white flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-black" />
                </div>
            ) : (
                <QuantumLogoBlackBg />
            )}

            {/* Content */}
            <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${isUser
                    ? "bg-white text-black"
                    : "bg-[#1a1a1a] border border-[#333] text-white"
                    }`}
            >
                {isUser ? (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                    <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                )}
            </div>
        </motion.div>
    );
});

export default function AIChatDrawer() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    // Use ref to avoid recreating handleSubmit when messages change
    const messagesRef = useRef<Message[]>(messages);
    messagesRef.current = messages;

    // Scroll to bottom
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, scrollToBottom]);

    // Handle body overflow when drawer opens
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    // Memoized input change handler to prevent re-renders
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
    }, []);

    // Optimized handleSubmit using messagesRef to avoid dependency on messages
    const handleSubmit = useCallback(async (e?: React.FormEvent) => {
        e?.preventDefault();

        const trimmedInput = input.trim();
        if (!trimmedInput || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: trimmedInput,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: trimmedInput,
                    // Use ref to get current messages without adding to dependencies
                    history: messagesRef.current.slice(-10),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || "Failed to get response");
                // Remove the last user message if request failed
                setMessages((prev) => prev.slice(0, -1));
                return;
            }

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.response,
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch {
            toast.error("Failed to connect. Please try again.");
            // Remove the last user message if request failed
            setMessages((prev) => prev.slice(0, -1));
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    }, [handleSubmit]);

    const suggestedPrompts = [
        "What is TON blockchain?",
        "How do I earn QNTM?",
        "Explain staking",
        "What are Jettons?",
    ];



    return (
        <>
            {/* Floating AI Button */}
            <motion.button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-28 right-4 z-40 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                aria-label="Open Quantum Club AI"
            >
                <Sparkles className="w-6 h-6 text-black" />
            </motion.button>

            {/* Chat Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/70 z-50"
                            aria-hidden="true"
                        />

                        {/* Drawer */}
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 h-[80vh] bg-black border-t border-[#333] rounded-t-2xl z-50 flex flex-col overflow-hidden"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Quantum Club AI Chat"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-[#333]">
                                <div className="flex items-center gap-3">
                                    <QuantumLogoWhiteBg />
                                    <div>
                                        <h2 className="font-bold text-white text-base">Quantum Club AI</h2>
                                        <p className="text-xs text-gray-500">Your assistant</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsOpen(false)}
                                    className="h-8 w-8 rounded-full bg-[#1a1a1a] hover:bg-[#2a2a2a]"
                                    aria-label="Close chat"
                                >
                                    <X className="w-4 h-4 text-gray-400" />
                                </Button>
                            </div>

                            {/* Messages */}
                            <ScrollArea className="flex-1 p-4">
                                <div className="space-y-4">
                                    {messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-[50vh] text-center px-4">
                                            <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
                                                <Image
                                                    src="/svg/logo-white.svg"
                                                    alt="Quantum Club AI"
                                                    width={32}
                                                    height={32}
                                                    priority
                                                />
                                            </div>
                                            <h3 className="text-lg font-semibold text-white mb-2">
                                                How can I help?
                                            </h3>
                                            <p className="text-sm text-gray-500 mb-6">
                                                Ask about crypto, TON, or Quantum Club
                                            </p>
                                            <div className="flex flex-wrap gap-2 justify-center">
                                                {suggestedPrompts.map((prompt) => (
                                                    <Button
                                                        key={prompt}
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setInput(prompt);
                                                            inputRef.current?.focus();
                                                        }}
                                                        className="rounded-full bg-[#1a1a1a] border-[#333] text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
                                                    >
                                                        {prompt}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        messages.map((message) => (
                                            <ChatMessage
                                                key={message.id}
                                                message={message}
                                            />
                                        ))
                                    )}

                                    {isLoading && (
                                        <div className="flex gap-2">
                                            <QuantumLogoBlackBg />
                                            <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl px-4 py-3 flex items-center">
                                                <div className="flex gap-1">
                                                    <span className="w-2 h-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                                                    <span className="w-2 h-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                                                    <span className="w-2 h-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div ref={messagesEndRef} />
                                </div>
                            </ScrollArea>

                            {/* Input */}
                            <div className="p-4 border-t border-[#333]">
                                <form onSubmit={handleSubmit} className="flex gap-2">
                                    <Textarea
                                        ref={inputRef}
                                        value={input}
                                        onChange={handleInputChange}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Ask anything..."
                                        rows={1}
                                        className="flex-1 min-h-0 px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-xl text-white placeholder-gray-500 resize-none focus:outline-none focus:border-white/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                                        style={{ maxHeight: "100px" }}
                                        aria-label="Message input"
                                    />
                                    <Button
                                        type="submit"
                                        disabled={!input.trim() || isLoading}
                                        className="h-12 w-12 rounded-xl bg-white hover:bg-gray-200 disabled:opacity-50"
                                        aria-label="Send message"
                                    >
                                        {isLoading ? (
                                            <ButtonLoader />
                                        ) : (
                                            <Send className="w-5 h-5 text-black" />
                                        )}
                                    </Button>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
