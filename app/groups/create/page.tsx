"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useGroups } from "@/app/(contexts)/GroupsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Users } from "lucide-react";

export default function CreateGroupPage() {
    useTelegramBackButton("/groups");
    const router = useRouter();
    const { createGroup } = useGroups();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) {
            toast.error("Please enter a group name");
            return;
        }
        if (name.length > 30) {
            toast.error("Group name must be 30 characters or less");
            return;
        }
        if (description.length > 100) {
            toast.error("Description must be 100 characters or less");
            return;
        }

        setIsCreating(true);
        try {
            const groupId = await createGroup(name.trim(), description.trim());
            if (groupId) {
                toast.success("Group created!");
                router.push(`/groups/${groupId}`);
            } else {
                toast.error("Failed to create group");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white pb-24">
            {/* Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 p-4 pt-8 space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-2"
                >
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                        <Users className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Create Group</h1>
                    <p className="text-sm text-gray-400">Max 5 members per group</p>
                </motion.div>

                {/* Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-4"
                >
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Group Name</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter group name"
                            maxLength={30}
                            className="bg-[#1a1a1a] border-[#333] text-white placeholder:text-gray-500"
                        />
                        <p className="text-xs text-gray-500 text-right">{name.length}/30</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Description (optional)</label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What's your group about?"
                            maxLength={100}
                            rows={3}
                            className="bg-[#1a1a1a] border-[#333] text-white placeholder:text-gray-500 resize-none"
                        />
                        <p className="text-xs text-gray-500 text-right">{description.length}/100</p>
                    </div>

                    <Button
                        onClick={handleCreate}
                        disabled={isCreating || !name.trim()}
                        className="w-full bg-white text-black hover:bg-gray-200 disabled:opacity-50"
                    >
                        {isCreating ? "Creating..." : "Create Group"}
                    </Button>
                </motion.div>
            </div>
        </div>
    );
}
