"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: string) => void;
  title?: string;
  description?: string;
}

export function QRScanner({
  isOpen,
  onClose,
  onScan,
  title = "Scan QR Code",
  description = "Point your camera at a QR code to scan",
}: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const containerId = "qr-scanner-container";

  const startScanner = useCallback(async (cameraId?: string) => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Ignore stop errors
      }
    }

    try {
      const html5Qrcode = new Html5Qrcode(containerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = html5Qrcode;

      // Get available cameras
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        
        // Prefer back camera
        let selectedCamera = cameraId || devices[0].id;
        const backCamera = devices.find(d => 
          d.label.toLowerCase().includes("back") || 
          d.label.toLowerCase().includes("rear") ||
          d.label.toLowerCase().includes("environment")
        );
        if (backCamera && !cameraId) {
          selectedCamera = backCamera.id;
          setCurrentCameraIndex(devices.indexOf(backCamera));
        }

        await html5Qrcode.start(
          selectedCamera,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            // Success callback
            onScan(decodedText);
            stopScanner();
            onClose();
          },
          () => {
            // Error callback - ignore (constantly called when no QR is in view)
          }
        );
        setIsScanning(true);
        setError(null);
      } else {
        setError("No cameras found on this device");
      }
    } catch (err) {
      console.error("QR Scanner error:", err);
      setError(
        err instanceof Error 
          ? err.message 
          : "Failed to start camera. Please ensure camera permissions are granted."
      );
    }
  }, [onScan, onClose]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch {
        // Ignore stop errors
      }
    }
    setIsScanning(false);
  }, []);

  const switchCamera = useCallback(async () => {
    if (cameras.length < 2) return;
    
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    await stopScanner();
    await startScanner(cameras[nextIndex].id);
  }, [cameras, currentCameraIndex, stopScanner, startScanner]);

  useEffect(() => {
    if (isOpen) {
      // Give the drawer time to render
      const timeout = setTimeout(() => {
        startScanner();
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      stopScanner();
    }
  }, [isOpen, startScanner, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const handleClose = useCallback(() => {
    stopScanner();
    onClose();
  }, [stopScanner, onClose]);

  return (
    <Drawer open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DrawerContent className="bg-black border-[#222] text-white max-h-[90vh]">
        <DrawerHeader className="text-center border-b border-[#222] pb-4">
          <DrawerTitle className="text-lg font-bold">{title}</DrawerTitle>
          <DrawerDescription className="text-xs text-gray-400 mt-1">{description}</DrawerDescription>
        </DrawerHeader>

        <div className="relative w-full aspect-square bg-black max-h-[60vh]">
          {/* Scanner container */}
          <div 
            id={containerId} 
            className="w-full h-full"
            style={{ position: 'relative' }}
          />

          {/* Overlay with scanning frame */}
          <AnimatePresence>
            {isScanning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none"
              >
                {/* Scanning animation */}
                <motion.div
                  className="absolute left-1/2 top-1/2 w-[260px] h-[260px] -translate-x-1/2 -translate-y-1/2 border-2 border-white/30 rounded-2xl"
                  animate={{
                    boxShadow: [
                      "0 0 0 0 rgba(255,255,255,0.4)",
                      "0 0 0 10px rgba(255,255,255,0)",
                    ],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                />
                
                {/* Corner accents */}
                <div className="absolute left-1/2 top-1/2 w-[260px] h-[260px] -translate-x-1/2 -translate-y-1/2">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />
                </div>

                {/* Scanning line */}
                <motion.div
                  className="absolute left-1/2 w-[240px] h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent -translate-x-1/2"
                  initial={{ top: "calc(50% - 120px)" }}
                  animate={{ top: "calc(50% + 120px)" }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error overlay */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6">
              <Camera className="w-12 h-12 text-gray-600 mb-4" />
              <p className="text-sm text-gray-400 text-center mb-4">{error}</p>
              <Button
                onClick={() => startScanner()}
                variant="outline"
                className="border-[#333] bg-[#222] hover:bg-[#333]"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 flex justify-center gap-4 border-t border-[#222]">
          {cameras.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={switchCamera}
              className="w-12 h-12 rounded-full bg-[#222] hover:bg-[#333]"
            >
              <SwitchCamera className="w-5 h-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="w-12 h-12 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// Hook for easy QR Scanner usage
export function useQRScanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [scannedValue, setScannedValue] = useState<string | null>(null);

  const openScanner = useCallback(() => {
    setScannedValue(null);
    setIsOpen(true);
  }, []);

  const closeScanner = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleScan = useCallback((result: string) => {
    setScannedValue(result);
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    scannedValue,
    openScanner,
    closeScanner,
    handleScan,
  };
}
