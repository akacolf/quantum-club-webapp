"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useGroups, GroupMember } from "@/app/(contexts)/GroupsContext";
import { useGameContext } from "@/app/(contexts)/MiningContext";
import Loader from "@/app/(components)/Loader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, Crown, LogOut, Copy, Check } from "lucide-react";

export default function GroupDetailPage() {
    useTelegramBackButton("/groups");
    const router = useRouter();
    const params = useParams();
    const groupId = params.groupId as string;

    const { telegramId } = useGameContext();
    const { groups, leaveGroup, getGroupMembers } = useGroups();

    const [members, setMembers] = useState<GroupMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [leaving, setLeaving] = useState(false);
    const [copied, setCopied] = useState(false);

    const group = groups.find((g) => g.id === groupId);
    const isAdmin = group?.createdBy === telegramId;

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
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <p className="text-gray-400">Group not found</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pb-24">
            {/* Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 p-4 pt-8 space-y-6">
                {/* Group Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center space-y-3"
                >
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-white font-bold text-3xl">
                        {group.name.charAt(0).toUpperCase()}
                    </div>
                    <h1 className="text-2xl font-bold text-white text-center">{group.name}</h1>
                    {group.description && (
                        <p className="text-gray-400 text-center text-sm">{group.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Users className="w-4 h-4" />
                        {members.length} / 5 members
                    </div>
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
                        className="w-full border-[#333] text-white hover:bg-[#1a1a1a]"
                    >
                        {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
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
                    <h2 className="text-lg font-semibold text-white">Members</h2>
                    <div className="space-y-2">
                        {members.map((member) => (
                            <div
                                key={member.telegramId}
                                className="bg-[#1a1a1a]/80 border border-[#333] rounded-xl p-3 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#2a2a2a] rounded-full flex items-center justify-center">
                                        <Users className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">{member.username}</p>
                                        <p className="text-xs text-gray-500">
                                            {member.telegramId === telegramId && "You"}
                                            {member.telegramId !== telegramId && member.role}
                                        </p>
                                    </div>
                                </div>
                                {member.role === "admin" && (
                                    <Crown className="w-4 h-4 text-yellow-400" />
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
                            variant="outline"
                            className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            {leaving ? "Leaving..." : "Leave Group"}
                        </Button>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
