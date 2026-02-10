"use client";

import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";

interface EmptyStateProps {
    icon?: string;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export function EmptyState({ icon = "solar:box-minimalistic-bold", title, description, action }: EmptyStateProps) {
    return (
        <Card className="bg-white/[0.02] border-white/5">
            <CardContent className="py-12 px-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                    <Icon icon={icon} className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="font-semibold text-white mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{description}</p>
                {action && (
                    <Button onClick={action.onClick} variant="outline" className="border-white/10">
                        {action.label}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

interface ErrorStateProps {
    title?: string;
    message: string;
    onRetry?: () => void;
}

export function ErrorState({ title = "Something went wrong", message, onRetry }: ErrorStateProps) {
    return (
        <Card className="bg-red-500/5 border-red-500/20">
            <CardContent className="py-8 px-6 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <Icon icon="solar:danger-triangle-bold" className="w-7 h-7 text-red-400" />
                </div>
                <h3 className="font-semibold text-white mb-1">{title}</h3>
                <p className="text-sm text-red-300/80 mb-4">{message}</p>
                {onRetry && (
                    <Button onClick={onRetry} variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10">
                        <Icon icon="solar:refresh-bold" className="w-4 h-4 mr-2" />
                        Try Again
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

interface LoadingStateProps {
    message?: string;
}

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
    return (
        <div className="py-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                <ButtonLoader />
            </div>
            <p className="text-sm text-muted-foreground">{message}</p>
        </div>
    );
}

interface RateLimitErrorProps {
    retryAfter: number;
}

export function RateLimitError({ retryAfter }: RateLimitErrorProps) {
    return (
        <Card className="bg-orange-500/5 border-orange-500/20">
            <CardContent className="py-6 px-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                        <Icon icon="solar:clock-circle-bold" className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                        <h3 className="font-medium text-white text-sm">Rate limit exceeded</h3>
                        <p className="text-xs text-orange-300/80">Please wait {retryAfter} seconds before trying again</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
