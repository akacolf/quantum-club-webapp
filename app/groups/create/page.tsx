"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useStore } from "@tanstack/react-form";
import { createGroupSchema, type CreateGroupFormData } from "@/lib/validations";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useGroups } from "@/app/(contexts)/GroupsContext";
import { useWallet } from "@/app/wallet/WalletContext";
import { haptics } from "@/lib/haptics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Icon } from "@iconify/react";
import { usePopularCollectionsQuery } from "@/app/(hooks)/queries/use-nft-marketplace";

export default function CreateGroupPage() {
    useTelegramBackButton("/groups");
    const router = useRouter();
    const { createGroup } = useGroups();
    const { isTestnet } = useWallet();

    const collectionsQuery = usePopularCollectionsQuery(isTestnet);

    useEffect(() => {
        router.prefetch("/groups");
    }, [router]);

    const [isCreating, setIsCreating] = useState(false);

    const form = useForm({
        defaultValues: { name: "", description: "", nftGated: false, nftCollection: "", nftCollectionName: "" },
        validators: { onSubmit: createGroupSchema },
        onSubmit: async ({ value }) => {
            await handleCreate(value);
        },
    });

    const nameValue = useStore(form.store, (s) => s.values.name);
    const nftGated = useStore(form.store, (s) => s.values.nftGated);
    const selectedCollection = useStore(form.store, (s) => s.values.nftCollection ?? "");
    const selectedCollectionName = useStore(form.store, (s) => s.values.nftCollectionName ?? "");

    const handleCreate = async (data: CreateGroupFormData) => {
        setIsCreating(true);
        try {
            const groupId = await createGroup(
                data.name.trim(),
                data.description.trim(),
                undefined,
                undefined,
                data.nftGated || undefined,
                data.nftGated ? (data.nftCollection ?? undefined) : undefined,
                data.nftGated ? (data.nftCollectionName ?? undefined) : undefined,
            );
            if (groupId) {
                haptics.success();
                toast.success("Group created!");
                router.push(`/groups/${groupId}`);
            } else {
                haptics.error();
                toast.error("Failed to create group");
            }
        } catch {
            haptics.error();
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
                            <Icon icon="lucide:users" className="w-8 h-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Create Group</CardTitle>
                        <CardDescription>Max 5 members per group</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <form.Field
                            name="name"
                            >
                            {(field) => {
                                const hasErrors = field.state.meta.errors.length > 0;
                                return (
                                    <Field data-invalid={hasErrors}>
                                        <FieldLabel htmlFor={field.name} className="text-sm font-medium text-muted-foreground">Group Name</FieldLabel>
                                        <Input
                                            id={field.name}
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            aria-invalid={hasErrors}
                                            placeholder="Enter group name"
                                            maxLength={30}
                                        />
                                        <div className="flex justify-between">
                                            {hasErrors ? (
                                                <FieldError errors={field.state.meta.errors.map(e => ({ message: typeof e === 'string' ? e : (e as any)?.message ?? String(e) }))} />
                                            ) : <span />}
                                            <p className="text-xs text-muted-foreground">{field.state.value.length}/30</p>
                                        </div>
                                    </Field>
                                );
                            }}
                        </form.Field>

                        <form.Field
                            name="description"
                            >
                            {(field) => {
                                const hasErrors = field.state.meta.errors.length > 0;
                                return (
                                    <Field data-invalid={hasErrors}>
                                        <FieldLabel htmlFor={field.name} className="text-sm font-medium text-muted-foreground">Description (optional)</FieldLabel>
                                        <Textarea
                                            id={field.name}
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            aria-invalid={hasErrors}
                                            placeholder="What's your group about?"
                                            maxLength={100}
                                            rows={3}
                                            className="resize-none"
                                        />
                                        <div className="flex justify-between">
                                            {hasErrors ? (
                                                <FieldError errors={field.state.meta.errors.map(e => ({ message: typeof e === 'string' ? e : (e as any)?.message ?? String(e) }))} />
                                            ) : <span />}
                                            <p className="text-xs text-muted-foreground">{field.state.value.length}/100</p>
                                        </div>
                                    </Field>
                                );
                            }}
                        </form.Field>

                        {/* NFT-Gated Toggle */}
                        <div className="flex items-center justify-between py-2">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium">NFT-Gated</Label>
                                <p className="text-xs text-muted-foreground">Require an NFT to join</p>
                            </div>
                            <Switch checked={nftGated} onCheckedChange={(v) => {
                                form.setFieldValue("nftGated", v);
                                if (!v) {
                                    form.setFieldValue("nftCollection", "");
                                    form.setFieldValue("nftCollectionName", "");
                                }
                            }} />
                        </div>

                        {/* Collection Selector */}
                        {nftGated && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-muted-foreground">Required NFT Collection</Label>
                                {collectionsQuery.isLoading ? (
                                    <p className="text-xs text-muted-foreground">Loading collections...</p>
                                ) : (
                                    <div className="max-h-40 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
                                        {(collectionsQuery.data ?? []).map((col) => (
                                            <button
                                                key={col.address}
                                                onClick={() => {
                                                    form.setFieldValue("nftCollection", col.address);
                                                    form.setFieldValue("nftCollectionName", col.name);
                                                }}
                                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                                                    selectedCollection === col.address
                                                        ? "bg-primary/10 border border-primary/30"
                                                        : "hover:bg-accent"
                                                }`}
                                            >
                                                <Icon icon="solar:gallery-minimalistic-bold" className="w-4 h-4 text-muted-foreground shrink-0" />
                                                <span className="text-sm truncate">{col.name}</span>
                                                {col.verified && (
                                                    <Icon icon="solar:verified-check-bold" className="w-3.5 h-3.5 text-primary shrink-0" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {selectedCollectionName && (
                                    <p className="text-xs text-primary">
                                        Selected: {selectedCollectionName}
                                    </p>
                                )}
                            </div>
                        )}

                        <Button
                            onClick={() => form.handleSubmit()}
                            disabled={isCreating || !nameValue.trim()}
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
