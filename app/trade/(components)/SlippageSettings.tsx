"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { SLIPPAGE_OPTIONS, DEFAULT_SLIPPAGE } from "@/types/trading";

interface SlippageSettingsProps {
    value: number;
    onChange: (value: number) => void;
}

export default function SlippageSettings({ value, onChange }: SlippageSettingsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [customValue, setCustomValue] = useState("");
    const [isCustom, setIsCustom] = useState(!SLIPPAGE_OPTIONS.includes(value));

    const handlePresetClick = (preset: number) => {
        setIsCustom(false);
        setCustomValue("");
        onChange(preset);
    };

    const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setCustomValue(val);
        setIsCustom(true);

        const numVal = parseFloat(val);
        if (!isNaN(numVal) && numVal > 0 && numVal <= 50) {
            onChange(numVal);
        }
    };

    const getSlippageColor = () => {
        if (value < 0.5) return "text-orange-400";
        if (value > 5) return "text-orange-400";
        return "text-green-400";
    };

    const getSlippageWarning = () => {
        if (value < 0.5) return "Transaction may fail due to low slippage";
        if (value > 5) return "High slippage may result in unfavorable rates";
        return null;
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 gap-1.5 text-muted-foreground hover:text-white"
                >
                    <Icon icon="solar:settings-bold" className="w-4 h-4" />
                    <span className={`text-xs font-medium ${getSlippageColor()}`}>
                        {value}%
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 bg-[#1a1a1a] border-white/10" align="end">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-white font-medium">Slippage Tolerance</Label>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-white"
                            onClick={() => {
                                onChange(DEFAULT_SLIPPAGE);
                                setIsCustom(false);
                                setCustomValue("");
                            }}
                        >
                            Reset
                        </Button>
                    </div>

                    {/* Preset Options */}
                    <div className="flex gap-2">
                        {SLIPPAGE_OPTIONS.map((option) => (
                            <Button
                                key={option}
                                variant={!isCustom && value === option ? "default" : "outline"}
                                size="sm"
                                className={`flex-1 h-9 ${
                                    !isCustom && value === option
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                                }`}
                                onClick={() => handlePresetClick(option)}
                            >
                                {option}%
                            </Button>
                        ))}
                    </div>

                    {/* Custom Input */}
                    <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Custom</Label>
                        <div className="relative">
                            <Input
                                type="number"
                                placeholder="Enter custom %"
                                value={customValue}
                                onChange={handleCustomChange}
                                className={`bg-white/5 border-white/10 text-white pr-8 ${
                                    isCustom ? "border-primary" : ""
                                }`}
                                min="0.1"
                                max="50"
                                step="0.1"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                %
                            </span>
                        </div>
                    </div>

                    {/* Warning */}
                    {getSlippageWarning() && (
                        <div className="flex items-start gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                            <Icon icon="solar:danger-triangle-bold" className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-orange-300">{getSlippageWarning()}</p>
                        </div>
                    )}

                    {/* Info */}
                    <p className="text-xs text-muted-foreground">
                        Your transaction will revert if the price changes more than this percentage.
                    </p>
                </div>
            </PopoverContent>
        </Popover>
    );
}
