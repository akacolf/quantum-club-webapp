"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { ButtonLoader } from "./ButtonLoader";
import Image from "next/image";
import { useUserStore } from "@/stores/user-store";
import { useFrensStore } from "@/stores/frens-store";
import { useMiningDataQuery } from "@/app/(hooks)/queries/use-mining-data";

function getMessageText(message: UIMessage): string {
    return message.parts
        .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
        .map((p) => p.text)
        .join("");
}

// Migrate old localStorage format ({ content }) to new UIMessage format ({ parts })
function migrateMessages(messages: unknown[]): UIMessage[] {
    return messages.map((msg) => {
        const m = msg as Record<string, unknown>;
        if ("parts" in m && Array.isArray(m.parts)) return m as unknown as UIMessage;
        return {
            id: (m.id as string) || String(Date.now()),
            role: m.role === "assistant" ? "assistant" : "user",
            parts: [{ type: "text" as const, text: (m.content as string) || "" }],
        } as UIMessage;
    });
}

function QuantumLogoBlackBg() {
    return (
        <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="bg-background border border-border">
                <Image
                    src="/svg/logo-white.svg"
                    alt="AI"
                    width={14}
                    height={14}
                    priority
                />
            </AvatarFallback>
        </Avatar>
    );
}

function ChatMessage({ message }: { message: UIMessage }) {
    const isUser = message.role === "user";
    const [copied, setCopied] = useState(false);
    const textContent = getMessageText(message);

    function handleCopy() {
        navigator.clipboard.writeText(textContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"} group`}
        >
            {/* Avatar */}
            {isUser ? (
                <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                        <Icon icon="lucide:user" className="w-3.5 h-3.5" />
                    </AvatarFallback>
                </Avatar>
            ) : (
                <QuantumLogoBlackBg />
            )}

            {/* Content */}
            <div className="flex flex-col gap-1 max-w-[80%]">
                <div
                    className={`rounded-2xl px-4 py-2.5 text-sm ${isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-foreground"
                        }`}
                >
                    {isUser ? (
                        <p className="whitespace-pre-wrap">{textContent}</p>
                    ) : (
                        <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                            <ReactMarkdown>{textContent}</ReactMarkdown>
                        </div>
                    )}
                </div>
                {/* Copy button for AI responses */}
                {!isUser && textContent && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className="self-start h-auto p-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-transparent transition-colors opacity-0 group-hover:opacity-100"
                    >
                        {copied ? (
                            <><Icon icon="lucide:check" className="w-3 h-3" /> Copied</>
                        ) : (
                            <><Icon icon="lucide:copy" className="w-3 h-3" /> Copy</>
                        )}
                    </Button>
                )}
            </div>
        </motion.div>
    );
}

function ChatInputForm({
    onSubmit,
    isLoading,
}: {
    onSubmit: (message: string) => void;
    isLoading: boolean;
}) {
    const [input, setInput] = useState("");
    const inputRef = useRef<HTMLTextAreaElement>(null);

    function handleSubmit(e?: React.FormEvent) {
        e?.preventDefault();
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;
        onSubmit(trimmed);
        setInput("");
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    }

    return (
        <div className="p-4 border-t border-border">
            <form onSubmit={handleSubmit} className="flex gap-2">
                <Textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything..."
                    rows={1}
                    className="flex-1 min-h-[48px] px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:border-ring focus-visible:ring-0 focus-visible:ring-offset-0"
                    style={{ maxHeight: "100px" }}
                    aria-label="Message input"
                />
                <Button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    size="icon"
                    className="h-12 w-12 rounded-xl disabled:opacity-100"
                    aria-label="Send message"
                >
                    {isLoading ? (
                        <ButtonLoader />
                    ) : (
                        <Icon icon="lucide:send" className="w-5 h-5" />
                    )}
                </Button>
            </form>
        </div>
    );
}

// Dynamic suggested prompts based on current page
function getContextualPrompts(pathname: string): string[] {
    if (pathname.match(/\/ecosystem\/trade\/[^/]+/) || pathname.match(/\/trade\/[^/]+/)) {
        return [
            "How does the bonding curve work?",
            "When does a token graduate?",
            "What are the trading fees?",
            "How do I read token metrics?",
        ];
    }
    if (pathname.includes("/trade/create")) {
        return [
            "How much does it cost to launch?",
            "What happens after I create a token?",
            "How does graduation work?",
            "Tips for a successful launch",
        ];
    }
    if (pathname.startsWith("/ecosystem/trade") || pathname.startsWith("/trade")) {
        return [
            "How does token trading work?",
            "What are graduated tokens?",
            "How to spot good tokens?",
            "What fees do I pay?",
        ];
    }
    if (pathname.startsWith("/wallet/staking")) {
        return [
            "How does TON staking work?",
            "What APY can I expect?",
            "Normal vs instant unstake?",
            "What are liquid staking tokens?",
        ];
    }
    if (pathname.startsWith("/wallet")) {
        return [
            "How do I send TON?",
            "What chains are supported?",
            "How to keep my wallet secure?",
            "What are gas fees on TON?",
        ];
    }
    if (pathname.startsWith("/groups")) {
        return [
            "How do I create a group?",
            "Can I link a group to my token?",
            "What is NFT gating?",
            "How do group roles work?",
        ];
    }
    if (pathname.startsWith("/earn")) {
        return [
            "How do I maximize QNTM earnings?",
            "How do daily streaks work?",
            "What is Solve-to-Earn?",
            "What tasks give the most QNTM?",
        ];
    }
    if (pathname.startsWith("/frens")) {
        return [
            "How do referral rewards work?",
            "What's the 0.1% trade fee?",
            "How do I share my invite link?",
            "What are referral milestones?",
        ];
    }
    if (pathname.startsWith("/leaderboard")) {
        return [
            "How is the leaderboard ranked?",
            "How do I climb the rankings?",
            "What counts toward my score?",
            "How often does it update?",
        ];
    }
    // Default prompts
    return [
        "What can I do in Quantum Club?",
        "How do I earn QNTM?",
        "How does token trading work?",
        "What ranks can I unlock?",
    ];
}

const CHAT_STORAGE_KEY = "qc_ai_chat_sessions";

interface ChatSession {
    id: string;
    title: string;
    messages: UIMessage[];
    createdAt: string;
    updatedAt: string;
}

export default function AIChatDrawer() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"chat" | "history">("chat");

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Gather user context for personalized AI responses
    const { MainQuantAmount, rank, daily, walletAddress, telegramId } = useUserStore();
    const { referralsNum } = useFrensStore();
    const { data: miningData } = useMiningDataQuery(telegramId);

    // Refs to keep transport body fresh without recreating the transport
    const userContextRef = useRef({
        qntmBalance: MainQuantAmount || undefined,
        rank: rank || undefined,
        streak: daily || undefined,
        walletConnected: !!walletAddress,
        referralCount: referralsNum || undefined,
        solveToEarnPasses: miningData?.values.remainingSolveToEarn,
    });
    const pathnameRef = useRef(pathname);
    userContextRef.current = {
        qntmBalance: MainQuantAmount || undefined,
        rank: rank || undefined,
        streak: daily || undefined,
        walletConnected: !!walletAddress,
        referralCount: referralsNum || undefined,
        solveToEarnPasses: miningData?.values.remainingSolveToEarn,
    };
    pathnameRef.current = pathname;

    // Stable transport instance — body resolver reads latest values from refs
    const [transport] = useState(
        () =>
            new DefaultChatTransport({
                api: "/api/ai/chat",
                body: () => ({
                    currentPage: pathnameRef.current,
                    userContext: userContextRef.current,
                }),
            })
    );

    // AI SDK chat hook
    const {
        messages,
        sendMessage,
        status,
        stop,
        setMessages,
    } = useChat({
        transport,
        onError: (error) => {
            toast.error(error.message || "Failed to get response");
        },
    });

    const isLoading = status === "submitted" || status === "streaming";
    const suggestedPrompts = getContextualPrompts(pathname);

    // Load chat sessions from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(CHAT_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    // Migrate messages to UIMessage format
                    const migrated = parsed.map((s: ChatSession) => ({
                        ...s,
                        messages: migrateMessages(s.messages),
                    }));
                    setSessions(migrated);
                    setCurrentSessionId(migrated[0].id);
                    setMessages(migrated[0].messages);
                }
            }
        } catch (error) {
            console.error("Failed to load chat sessions:", error);
        }
    }, []);

    // Sync useChat messages back to current session when not streaming
    useEffect(() => {
        if (!currentSessionId || messages.length === 0) return;
        if (status === "streaming") return;

        setSessions((prev) => {
            const updated = prev.map((s) =>
                s.id === currentSessionId
                    ? { ...s, messages, updatedAt: new Date().toISOString() }
                    : s
            );
            // Persist to localStorage
            try {
                localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(updated));
            } catch (e) {
                console.error("Failed to save chat sessions:", e);
            }
            return updated;
        });
    }, [messages, status, currentSessionId]);

    // Create a new chat session
    function handleNewChat() {
        const newSession: ChatSession = {
            id: Date.now().toString(),
            title: "New Chat",
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        setSessions((prev) => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
        setMessages([]);
        setViewMode("chat");
    }

    // Delete a chat session
    function handleDeleteSession(sessionId: string, e: React.MouseEvent) {
        e.stopPropagation();
        setSessions((prev) => {
            const filtered = prev.filter((s) => s.id !== sessionId);
            if (sessionId === currentSessionId) {
                const next = filtered.length > 0 ? filtered[0] : null;
                setCurrentSessionId(next?.id ?? null);
                setMessages(next?.messages ?? []);
            }
            if (filtered.length === 0) {
                localStorage.removeItem(CHAT_STORAGE_KEY);
            } else {
                localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(filtered));
            }
            return filtered;
        });
        toast.success("Chat deleted");
    }

    // Switch to a session
    function handleSelectSession(sessionId: string) {
        setCurrentSessionId(sessionId);
        const session = sessions.find((s) => s.id === sessionId);
        setMessages(session?.messages ?? []);
        setViewMode("chat");
    }

    // Clear current chat (keep session but clear messages)
    function handleClearChat() {
        if (!currentSessionId) return;
        setMessages([]);
        setSessions((prev) => {
            const updated = prev.map((session) =>
                session.id === currentSessionId
                    ? { ...session, messages: [], title: "New Chat", updatedAt: new Date().toISOString() }
                    : session
            );
            localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
        toast.success("Chat cleared");
    }

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, status]);

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

    // Handle message submission
    function handleSendMessage(messageText: string) {
        // Auto-create a session if none exists
        let sessionId = currentSessionId;
        if (!sessionId) {
            const newSession: ChatSession = {
                id: Date.now().toString(),
                title: messageText.slice(0, 30) + (messageText.length > 30 ? "..." : ""),
                messages: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            setSessions((prev) => [newSession, ...prev]);
            setCurrentSessionId(newSession.id);
            sessionId = newSession.id;
        }

        // Update title if still "New Chat"
        setSessions((prev) =>
            prev.map((s) =>
                s.id === sessionId && s.title === "New Chat"
                    ? { ...s, title: messageText.slice(0, 30) + (messageText.length > 30 ? "..." : "") }
                    : s
            )
        );

        sendMessage({ text: messageText });
    }

    function handlePromptClick(prompt: string) {
        handleSendMessage(prompt);
    }

    // Filter out assistant messages with no text content (empty streaming placeholder)
    const visibleMessages = messages.filter((msg) => {
        if (msg.role === "assistant") {
            const text = getMessageText(msg);
            return text.length > 0;
        }
        return true;
    });

    return (
        <>
            {/* Floating AI Button */}
            <motion.button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-28 right-4 z-40 w-12 h-12 rounded-full bg-primary shadow-lg flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                aria-label="Open Quantum Club AI"
            >
                <Icon icon="lucide:sparkles" className="w-6 h-6 text-primary-foreground" />
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
                            className="fixed inset-0 bg-black/70 z-[60]"
                            aria-hidden="true"
                        />

                        {/* Drawer */}
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 h-[80vh] bg-background border-t border-border rounded-t-2xl z-[60] flex flex-col overflow-hidden"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Quantum Club AI Chat"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-border">
                                <div className="flex items-center gap-3">
                                    {viewMode === "history" ? (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setViewMode("chat")}
                                            className="h-8 w-8 rounded-full"
                                            aria-label="Back to chat"
                                        >
                                            <Icon icon="lucide:arrow-left" className="w-4 h-4" />
                                        </Button>
                                    ) : (
                                        <Avatar className="h-9 w-9">
                                            <AvatarFallback className="bg-primary text-primary-foreground">
                                                <Image
                                                    src="/svg/logo-white.svg"
                                                    alt="Quantum Club AI"
                                                    width={20}
                                                    height={20}
                                                    className="invert"
                                                    priority
                                                />
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div>
                                        <h2 className="font-bold text-foreground text-base">
                                            {viewMode === "history" ? "Chat History" : "Quantum Club AI"}
                                        </h2>
                                        <p className="text-xs text-muted-foreground">
                                            {viewMode === "history"
                                                ? `${sessions.length} conversation${sessions.length !== 1 ? "s" : ""}`
                                                : "Your assistant"
                                            }
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {viewMode === "chat" && (
                                        <>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={handleNewChat}
                                                className="h-8 w-8 rounded-full bg-secondary hover:bg-accent"
                                                aria-label="New chat"
                                            >
                                                <Icon icon="lucide:plus" className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setViewMode("history")}
                                                className="h-8 w-8 rounded-full bg-secondary hover:bg-accent"
                                                aria-label="Chat history"
                                            >
                                                <Icon icon="lucide:history" className="w-4 h-4" />
                                            </Button>
                                            {messages.length > 0 && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={handleClearChat}
                                                    className="h-8 w-8 rounded-full bg-secondary hover:bg-destructive/20 hover:text-destructive"
                                                    aria-label="Clear chat"
                                                >
                                                    <Icon icon="lucide:trash-2" className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {status === "streaming" && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={stop}
                                                    className="h-8 w-8 rounded-full bg-secondary hover:bg-accent"
                                                    aria-label="Stop generating"
                                                >
                                                    <Icon icon="lucide:square" className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                        </>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsOpen(false)}
                                        className="h-8 w-8 rounded-full bg-secondary hover:bg-accent"
                                        aria-label="Close chat"
                                    >
                                        <Icon icon="lucide:x" className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                </div>
                            </div>

                            {/* Content - History View or Chat View */}
                            {viewMode === "history" ? (
                                <ScrollArea className="flex-1 p-4">
                                    <div className="space-y-2">
                                        {sessions.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                                                <Icon icon="lucide:message-square" className="w-12 h-12 text-muted-foreground mb-4" />
                                                <h3 className="text-lg font-semibold text-foreground mb-2">No conversations yet</h3>
                                                <p className="text-sm text-muted-foreground mb-4">Start a new chat to begin</p>
                                                <Button onClick={handleNewChat}>
                                                    <Icon icon="lucide:plus" className="w-4 h-4 mr-2" /> New Chat
                                                </Button>
                                            </div>
                                        ) : (
                                            sessions.map((session) => (
                                                <motion.div
                                                    key={session.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors group ${session.id === currentSessionId
                                                        ? "bg-primary/10 border border-primary/20"
                                                        : "bg-card border border-border hover:bg-accent"
                                                        }`}
                                                    onClick={() => handleSelectSession(session.id)}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <Icon icon="lucide:message-square" className="w-5 h-5 text-muted-foreground shrink-0" />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-medium text-foreground truncate">{session.title}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {session.messages.length} message{session.messages.length !== 1 ? "s" : ""} • {new Date(session.updatedAt).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => handleDeleteSession(session.id, e)}
                                                        className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
                                                        aria-label="Delete chat"
                                                    >
                                                        <Icon icon="lucide:trash-2" className="w-3.5 h-3.5" />
                                                    </Button>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                            ) : (
                                /* Messages */
                                <ScrollArea className="flex-1 p-4">
                                    <div className="space-y-4">
                                        {visibleMessages.length === 0 && !currentSessionId ? (
                                            <div className="flex flex-col items-center justify-center h-[50vh] text-center px-4">
                                                <Avatar className="h-16 w-16 mb-4">
                                                    <AvatarFallback className="bg-card border border-border">
                                                        <Image
                                                            src="/svg/logo-white.svg"
                                                            alt="Quantum Club AI"
                                                            width={32}
                                                            height={32}
                                                            priority
                                                        />
                                                    </AvatarFallback>
                                                </Avatar>
                                                <h3 className="text-lg font-semibold text-foreground mb-2">
                                                    How can I help?
                                                </h3>
                                                <p className="text-sm text-muted-foreground mb-6">
                                                    Ask about crypto, TON, or Quantum Club
                                                </p>
                                                <div className="flex flex-wrap gap-2 justify-center">
                                                    {suggestedPrompts.map((prompt) => (
                                                        <Button
                                                            key={prompt}
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handlePromptClick(prompt)}
                                                            className="rounded-full"
                                                        >
                                                            {prompt}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : visibleMessages.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-[50vh] text-center px-4">
                                                <Avatar className="h-16 w-16 mb-4">
                                                    <AvatarFallback className="bg-card border border-border">
                                                        <Image
                                                            src="/svg/logo-white.svg"
                                                            alt="Quantum Club AI"
                                                            width={32}
                                                            height={32}
                                                            priority
                                                        />
                                                    </AvatarFallback>
                                                </Avatar>
                                                <h3 className="text-lg font-semibold text-foreground mb-2">
                                                    How can I help?
                                                </h3>
                                                <p className="text-sm text-muted-foreground mb-6">
                                                    Ask about crypto, TON, or Quantum Club
                                                </p>
                                                <div className="flex flex-wrap gap-2 justify-center">
                                                    {suggestedPrompts.map((prompt) => (
                                                        <Button
                                                            key={prompt}
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handlePromptClick(prompt)}
                                                            className="rounded-full"
                                                        >
                                                            {prompt}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            visibleMessages.map((message) => (
                                                <ChatMessage
                                                    key={message.id}
                                                    message={message}
                                                />
                                            ))
                                        )}

                                        {status === "submitted" && (
                                            <div className="flex gap-2">
                                                <QuantumLogoBlackBg />
                                                <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center">
                                                    <div className="flex gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                                                        <span className="w-2 h-2 rounded-full bg-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                                                        <span className="w-2 h-2 rounded-full bg-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div ref={messagesEndRef} />
                                    </div>
                                </ScrollArea>
                            )}

                            {/* Input - Only show in chat view */}
                            {viewMode === "chat" && (
                                <ChatInputForm
                                    onSubmit={handleSendMessage}
                                    isLoading={isLoading}
                                />
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
