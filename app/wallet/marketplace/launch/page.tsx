"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { useForm, useStore } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { toast } from "sonner";
import { nftLaunchSchema } from "@/lib/validations";

type Step = 1 | 2 | 3 | 4;

interface Attribute {
    trait_type: string;
    value: string;
}

export default function LaunchNftPage() {
    useTelegramBackButton("/wallet/marketplace");

    const [step, setStep] = useState<Step>(1);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [attributes, setAttributes] = useState<Attribute[]>([{ trait_type: "", value: "" }]);
    const [isDeploying, setIsDeploying] = useState(false);
    const [deploySuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm({
        defaultValues: { name: "", description: "", price: "", royalty: "" },
        validators: { onSubmit: nftLaunchSchema },
        onSubmit: async () => {
            if (!imageFile) return;
            setIsDeploying(true);
            try {
                // NFT minting is not yet available
                toast.error("NFT minting is coming soon!");
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Failed to mint NFT");
            } finally {
                setIsDeploying(false);
            }
        },
    });

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            toast.error("Image must be under 10MB");
            return;
        }
        setImageFile(file);
        const reader = new FileReader();
        reader.onload = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const addAttribute = () => {
        if (attributes.length >= 10) {
            toast.error("Maximum 10 attributes");
            return;
        }
        setAttributes([...attributes, { trait_type: "", value: "" }]);
    };

    const removeAttribute = (index: number) => {
        setAttributes(attributes.filter((_, i) => i !== index));
    };

    const updateAttribute = (index: number, field: "trait_type" | "value", val: string) => {
        const updated = [...attributes];
        updated[index][field] = val;
        setAttributes(updated);
    };

    const validAttributes = attributes.filter((a) => a.trait_type.trim() && a.value.trim());

    const name = useStore(form.store, (s) => s.values.name);
    const description = useStore(form.store, (s) => s.values.description);

    const canProceedStep1 = !!imageFile;
    const canProceedStep2 = !!name.trim();

    const handleDeploy = () => form.handleSubmit();

    const steps = [
        { num: 1, label: "Image" },
        { num: 2, label: "Details" },
        { num: 3, label: "Preview" },
        { num: 4, label: "Deploy" },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground p-4 pb-24">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md mx-auto space-y-6"
            >
                {/* Header */}
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold">Mint NFT</h1>
                    <p className="text-sm text-muted-foreground">Create your own NFT on TON</p>
                </div>

                {/* Step Indicator */}
                <div className="flex items-center gap-2">
                    {steps.map((s, i) => (
                        <div key={s.num} className="flex items-center gap-2 flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                step >= s.num
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                            }`}>
                                {step > s.num ? (
                                    <Icon icon="lucide:check" className="w-4 h-4" />
                                ) : (
                                    s.num
                                )}
                            </div>
                            {i < steps.length - 1 && (
                                <div className={`flex-1 h-0.5 ${step > s.num ? "bg-primary" : "bg-muted"}`} />
                            )}
                        </div>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {/* Step 1: Upload Image */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            <Card
                                className="bg-card border-border border-dashed rounded-2xl cursor-pointer hover:bg-accent/50 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <CardContent className="p-0">
                                    {imagePreview ? (
                                        <div className="relative w-full aspect-square rounded-2xl overflow-hidden">
                                            <Image
                                                src={imagePreview}
                                                alt="Preview"
                                                fill
                                                className="object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                <Icon icon="solar:camera-bold" className="w-8 h-8 text-white" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full aspect-square flex flex-col items-center justify-center gap-3">
                                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Icon icon="solar:camera-add-bold" className="w-8 h-8 text-primary" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-medium">Upload Image</p>
                                                <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                className="hidden"
                            />
                            <Button
                                onClick={() => setStep(2)}
                                disabled={!canProceedStep1}
                                className="w-full h-12 rounded-xl font-bold"
                            >
                                Next: Set Details
                            </Button>
                        </motion.div>
                    )}

                    {/* Step 2: Name, Description, Attributes */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            <form.Field name="name">
                                {(field) => (
                                    <Field>
                                        <FieldLabel>Name *</FieldLabel>
                                        <Input
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            placeholder="My Awesome NFT"
                                            maxLength={100}
                                        />
                                        {field.state.meta.errors.length > 0 && (
                                            <FieldError errors={field.state.meta.errors.map(e => ({ message: typeof e === 'string' ? e : (e as any)?.message ?? String(e) }))} />
                                        )}
                                    </Field>
                                )}
                            </form.Field>
                            <form.Field name="description">
                                {(field) => (
                                    <Field>
                                        <FieldLabel>Description</FieldLabel>
                                        <Textarea
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            placeholder="Describe your NFT..."
                                            maxLength={500}
                                            rows={3}
                                            className="resize-none"
                                        />
                                        {field.state.meta.errors.length > 0 && (
                                            <FieldError errors={field.state.meta.errors.map(e => ({ message: typeof e === 'string' ? e : (e as any)?.message ?? String(e) }))} />
                                        )}
                                    </Field>
                                )}
                            </form.Field>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Attributes</Label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={addAttribute}
                                        disabled={attributes.length >= 10}
                                        className="h-7 text-xs"
                                    >
                                        <Icon icon="lucide:plus" className="w-3 h-3 mr-1" />
                                        Add
                                    </Button>
                                </div>
                                {attributes.map((attr, i) => (
                                    <div key={i} className="flex gap-2">
                                        <Input
                                            value={attr.trait_type}
                                            onChange={(e) => updateAttribute(i, "trait_type", e.target.value)}
                                            placeholder="Trait"
                                            className="flex-1"
                                        />
                                        <Input
                                            value={attr.value}
                                            onChange={(e) => updateAttribute(i, "value", e.target.value)}
                                            placeholder="Value"
                                            className="flex-1"
                                        />
                                        {attributes.length > 1 && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeAttribute(i)}
                                                className="h-9 w-9 shrink-0"
                                            >
                                                <Icon icon="lucide:x" className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12 rounded-xl">
                                    Back
                                </Button>
                                <Button
                                    onClick={() => setStep(3)}
                                    disabled={!canProceedStep2}
                                    className="flex-1 h-12 rounded-xl font-bold"
                                >
                                    Next: Preview
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3: Review */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            <Card className="bg-card border-border rounded-2xl overflow-hidden">
                                {imagePreview && (
                                    <div className="relative w-full aspect-square">
                                        <Image
                                            src={imagePreview}
                                            alt={name}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                )}
                                <CardContent className="p-4 space-y-3">
                                    <h2 className="text-lg font-bold">{name}</h2>
                                    {description && (
                                        <p className="text-sm text-muted-foreground">{description}</p>
                                    )}
                                    {validAttributes.length > 0 && (
                                        <div className="grid grid-cols-2 gap-2">
                                            {validAttributes.map((attr, i) => (
                                                <div key={i} className="bg-muted rounded-lg p-2 text-center">
                                                    <p className="text-[10px] text-muted-foreground uppercase">{attr.trait_type}</p>
                                                    <p className="text-xs font-semibold truncate">{attr.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-12 rounded-xl">
                                    Back
                                </Button>
                                <Button
                                    onClick={() => setStep(4)}
                                    className="flex-1 h-12 rounded-xl font-bold"
                                >
                                    Deploy
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 4: Deploy */}
                    {step === 4 && (
                        <motion.div
                            key="step4"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            {deploySuccess ? (
                                <Card className="bg-card border-border">
                                    <CardContent className="p-8 text-center space-y-4">
                                        <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                                            <Icon icon="solar:check-circle-bold" className="w-8 h-8 text-green-500" />
                                        </div>
                                        <h2 className="text-lg font-bold">NFT Minted!</h2>
                                        <p className="text-sm text-muted-foreground">
                                            Your NFT has been deployed to the TON blockchain
                                        </p>
                                        <Badge className="bg-primary/10 text-primary">
                                            Check your wallet NFTs tab
                                        </Badge>
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card className="bg-card border-border">
                                    <CardContent className="p-6 space-y-4">
                                        <div className="text-center space-y-2">
                                            <Icon icon="solar:rocket-bold" className="w-10 h-10 text-primary mx-auto" />
                                            <h2 className="text-lg font-bold">Ready to Deploy</h2>
                                            <p className="text-sm text-muted-foreground">
                                                This will mint your NFT on the TON blockchain
                                            </p>
                                        </div>
                                        <div className="bg-muted rounded-xl p-3 space-y-1.5 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Name</span>
                                                <span className="font-medium">{name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Attributes</span>
                                                <span className="font-medium">{validAttributes.length}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Network Fee</span>
                                                <span className="font-medium">~0.05 TON</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                            <div className="flex gap-3">
                                {!deploySuccess && (
                                    <Button variant="outline" onClick={() => setStep(3)} className="flex-1 h-12 rounded-xl">
                                        Back
                                    </Button>
                                )}
                                <Button
                                    onClick={deploySuccess ? () => window.history.back() : handleDeploy}
                                    disabled={isDeploying}
                                    className="flex-1 h-12 rounded-xl font-bold"
                                >
                                    {isDeploying ? (
                                        <ButtonLoader size="sm" />
                                    ) : deploySuccess ? (
                                        "Done"
                                    ) : (
                                        <>
                                            <Icon icon="solar:rocket-bold" className="w-4 h-4 mr-2" />
                                            Mint NFT
                                        </>
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
