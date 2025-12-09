"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            theme="dark"
            className="toaster group !mt-16"
            position="top-center"
            toastOptions={{
                classNames: {
                    toast:
                        "group toast group-[.toaster]:bg-[#1a1a1a] group-[.toaster]:text-white group-[.toaster]:border-[#333] group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl group-[.toaster]:font-[var(--font-onest)]",
                    title: "group-[.toast]:font-[var(--font-onest)]",
                    description: "group-[.toast]:text-gray-400 group-[.toast]:font-[var(--font-onest)]",
                    actionButton:
                        "group-[.toast]:bg-white group-[.toast]:text-black group-[.toast]:font-[var(--font-onest)]",
                    cancelButton:
                        "group-[.toast]:bg-[#333] group-[.toast]:text-gray-400 group-[.toast]:font-[var(--font-onest)]",
                    success: "group-[.toaster]:border-green-500/20",
                    error: "group-[.toaster]:border-red-500/20",
                },
                style: {
                    fontFamily: "var(--font-onest), system-ui, sans-serif",
                },
            }}
            {...props}
        />
    );
};

export { Toaster };
