"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useGroups, GroupMember } from "@/app/(contexts)/GroupsContext";
import { useUserContext } from "@/app/(contexts)/UserContext";
import Loader from "@/app/(components)/Loader";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Icon } from "@iconify/react";

export default function GroupDetailPage() {
    useTelegramBackButton("/groups");
    const router = useRouter();
    const params = useParams();
    const groupId = params.groupId as string;

    const { telegramId } = useUserContext();
    const { groups, leaveGroup, getGroupMembers } = useGroups();

    const [members, setMembers] = useState<GroupMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [leaving, setLeaving] = useState(false);
    const [copied, setCopied] = useState(false);

    const group = groups.find((g) => g.id === groupId);
    const isAdmin = group?.createdBy === telegramId;

    useEffect(() => {
        router.prefetch("/groups");
    }, [router]);

    useEffect(() => {
        const loadMembers = async () => {
            const membersList = await getGroupMembers(groupId);
            setMembers(membersList);
            setLoading(false);
        };
        loadMembers();
    }, [groupId, getGroupMembers]);

    const handleLeave = async () => {
        if (isAdmin) {
            toast.error("Admins cannot leave their own group");
            return;
        }

        setLeaving(true);
        const success = await leaveGroup(groupId);
        if (success) {
            toast.success("Left group");
            router.push("/groups");
        } else {
            toast.error("Failed to leave group");
        }
        setLeaving(false);
    };

    const handleCopyInvite = async () => {
        try {
            const inviteLink = `https://t.me/QuantumClubBot?start=group_${groupId}`;
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            toast.success("Invite link copied!");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy");
        }
    };

    if (loading) {
        return <Loader />;
    }

    if (!group) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
                <p className="text-muted-foreground">Group not found</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-24 relative overflow-hidden">
            {/* Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 p-4 pt-8 space-y-6">
                {/* Group Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center space-y-3"
                >
                    <Avatar className="h-20 w-20 border-2 border-white/10">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${group.name}`} />
                        <AvatarFallback className="bg-white/10 text-white font-bold text-3xl">
                            {group.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>

                    <h1 className="text-2xl font-bold text-foreground text-center">{group.name}</h1>
                    {group.description && (
                        <p className="text-muted-foreground text-center text-sm">{group.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Icon icon="lucide:users" className="w-4 h-4" />
                        {members.length} / 5 members
                    </div>
                    {group.nftGated && (
                        <div className="flex flex-col items-center gap-1">
                            <Badge className="bg-purple-600/20 text-purple-400 border-purple-500/30">
                                <Icon icon="solar:gallery-bold" className="w-3 h-3 mr-1" />
                                NFT-Gated
                            </Badge>
                            {group.requiredNftCollectionName && (
                                <p className="text-xs text-muted-foreground">
                                    Requires {group.requiredNftCollectionName} NFT
                                </p>
                            )}
                        </div>
                    )}
                </motion.div>

                {/* Invite Button */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Button
                        onClick={handleCopyInvite}
                        variant="outline"
                        className="w-full h-11 px-6 rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10 active:scale-95 transition-all"
                    >
                        {copied ? <Icon icon="lucide:check" className="w-4 h-4 mr-2" /> : <Icon icon="lucide:copy" className="w-4 h-4 mr-2" />}
                        {copied ? "Copied!" : "Copy Invite Link"}
                    </Button>
                </motion.div>

                {/* Members List */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-3"
                >
                    <h2 className="text-lg font-semibold text-foreground">Members</h2>
                    <div className="space-y-2">
                        {members.map((member) => (
                            <div
                                key={member.telegramId}
                                className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between transition-all active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-11 w-11 border border-white/10">
                                        <AvatarFallback className="bg-white/10">
                                            <Icon icon="lucide:users" className="w-5 h-5 text-white" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-bold text-white text-sm">{member.username}</p>
                                        <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
                                            {member.telegramId === telegramId && "You"}
                                            {member.telegramId !== telegramId && member.role}
                                        </p>
                                    </div>
                                </div>
                                {member.role === "admin" && (
                                    <Icon icon="lucide:crown" className="w-4 h-4 text-white" />
                                )}
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Leave Button */}
                {!isAdmin && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Button
                            onClick={handleLeave}
                            disabled={leaving}
                            variant="destructive"
                            className="w-full h-11 rounded-2xl font-bold bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 active:scale-95 transition-all"
                        >
                            <Icon icon="lucide:log-out" className="w-4 h-4 mr-2" />
                            {leaving ? "Leaving..." : "Leave Group"}
                        </Button>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
