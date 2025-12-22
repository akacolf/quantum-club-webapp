"use client";

import { useEffect, useRef, useState } from "react";

interface StyledQRCodeProps {
    data: string;
    image?: string;
    size?: number;
}

export default function StyledQRCode({ data, image, size = 200 }: StyledQRCodeProps) {
    const qrRef = useRef<HTMLDivElement>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Small delay to ensure component is mounted
        const mountTimer = setTimeout(() => setIsReady(true), 50);
        return () => clearTimeout(mountTimer);
    }, []);

    useEffect(() => {
        if (!isReady || !qrRef.current || !data) return;

        const renderQR = async () => {
            if (!qrRef.current) return;

            qrRef.current.innerHTML = "";

            try {
                const QRCodeStyling = (await import("qr-code-styling")).default;

                const qrCode = new QRCodeStyling({
                    width: size,
                    height: size,
                    type: "svg",
                    data: data,
                    image: image,
                    dotsOptions: {
                        color: "#000000",
                        type: "rounded"
                    },
                    cornersSquareOptions: {
                        color: "#000000",
                        type: "extra-rounded"
                    },
                    cornersDotOptions: {
                        color: "#000000",
                        type: "dot"
                    },
                    backgroundOptions: {
                        color: "#ffffff"
                    },
                    imageOptions: {
                        crossOrigin: "anonymous",
                        margin: 5,
                        imageSize: 0.25
                    },
                    qrOptions: {
                        errorCorrectionLevel: "H"
                    },
                });

                qrCode.append(qrRef.current);

                // Ensure SVG fills container
                const svgElement = qrRef.current.querySelector("svg");
                if (svgElement) {
                    svgElement.setAttribute("width", "100%");
                    svgElement.setAttribute("height", "100%");
                    svgElement.style.display = "block";
                }
            } catch (error) {
                console.error("QR code rendering error:", error);
            }
        };

        renderQR();
    }, [isReady, data, image, size]);

    return (
        <div
            ref={qrRef}
            className="flex items-center justify-center"
            style={{ width: size, height: size }}
        />
    );
}
