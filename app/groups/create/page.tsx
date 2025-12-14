"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useGroups } from "@/app/(contexts)/GroupsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
        <div className="min-h-screen bg-background text-foreground pb-24 relative overflow-hidden">
            {/* Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 p-4 pt-8 space-y-6 flex flex-col items-center justify-center min-h-[80vh]">
                <Card className="w-full max-w-md border-border bg-card/80 backdrop-blur-sm">
                    <CardHeader className="text-center">
                        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <Users className="w-8 h-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Create Group</CardTitle>
                        <CardDescription>Max 5 members per group</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Group Name</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter group name"
                                maxLength={30}
                            />
                            <p className="text-xs text-muted-foreground text-right">{name.length}/30</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Description (optional)</label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What's your group about?"
                                maxLength={100}
                                rows={3}
                                className="resize-none"
                            />
                            <p className="text-xs text-muted-foreground text-right">{description.length}/100</p>
                        </div>

                        <Button
                            onClick={handleCreate}
                            disabled={isCreating || !name.trim()}
                            className="w-full"
                        >
                            {isCreating ? "Creating..." : "Create Group"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
