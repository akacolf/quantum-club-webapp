"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import QRCodeStyling from "qr-code-styling";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";

const InvitePopup = () => {
  const { telegramId } = useUserContext();
  const inviteLink = `https://t.me/QuantumClubBot/app?startapp=${telegramId}`;

  const [isOpen, setIsOpen] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);


  const openPopup = () => setIsOpen(true);
  const closePopup = () => setIsOpen(false);

  // Initialize QR code when modal opens
  useEffect(() => {
    if (isOpen && qrRef.current) {
      // Clear previous QR code
      qrRef.current.replaceChildren();

      const qrCode = new QRCodeStyling({
        width: 250,
        height: 250,
        type: "svg",
        data: inviteLink,
        image: "/svg/logo-qr.svg",
        dotsOptions: {
          color: "#000000",
          type: "dots",
        },
        cornersSquareOptions: {
          color: "#000000",
          type: "extra-rounded",
        },
        cornersDotOptions: {
          color: "#000000",
          type: "dot",
        },
        backgroundOptions: {
          color: "#ffffff",
        },
        imageOptions: {
          crossOrigin: "anonymous",
          margin: 5,
          imageSize: 0.35,
        },
        qrOptions: {
          errorCorrectionLevel: "H",
        },
      });

      qrCode.append(qrRef.current);
    }
  }, [isOpen, inviteLink]);



  const handleSendInviteLink = () => {
    const shareText = "The Quantum Era on Telegram has begun.";
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(
      inviteLink
    )}&text=${encodeURIComponent(shareText)}`;

    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(telegramUrl);
    } else {
      window.open(telegramUrl, "_blank");
    }
  };

  function handleCopyLink() {
    toast.success("Invitation link copied");
    navigator.clipboard.writeText(inviteLink);
    closePopup();
  }

  return (
    <div className="w-full">
      <Button
        onClick={openPopup}
        className="w-full h-12 bg-white text-black hover:bg-gray-200 font-bold rounded-xl text-base shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all active:scale-95"
      >
        <Icon icon="lucide:users" className="mr-2 h-5 w-5" />
        Invite frens
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] p-4"
            onClick={closePopup}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md mb-4 sm:mb-0"
            >
              <Card className="bg-[#1a1a1a]/95 border-[#333] text-white backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between border-b border-[#333] p-4 space-y-0">
                  <div className="w-8" /> {/* Spacer for centering */}
                  <CardTitle className="text-lg font-bold text-center">
                    Invite Friends
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closePopup}
                    className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
                  >
                    <Icon icon="lucide:x" className="h-5 w-5" />
                  </Button>
                </CardHeader>
                <CardContent className="p-6 flex flex-col gap-4">
                  {/* QR Code Section */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-white p-4 rounded-2xl shadow-lg inline-block">
                      <div ref={qrRef} />
                    </div>
                    <p className="text-gray-400 text-sm text-center">
                      Scan to join Quantum Club
                    </p>
                  </div>
                  <div className="flex items-center gap-3 my-2">
                    <div className="flex-1 h-px bg-[#333]" />
                    <span className="text-gray-500 text-sm">or</span>
                    <div className="flex-1 h-px bg-[#333]" />
                  </div>

                  <Button
                    onClick={handleCopyLink}
                    className="w-full h-14 bg-white text-black hover:bg-gray-200 font-bold text-base rounded-xl transition-all active:scale-95"
                  >
                    <Icon icon="lucide:copy" className="mr-2 h-5 w-5" />
                    Copy link
                  </Button>
                  <Button
                    onClick={() => {
                      handleSendInviteLink();
                      closePopup();
                    }}
                    className="w-full h-14 bg-[#2a2a2a] text-white hover:bg-[#333] border border-[#444] font-bold text-base rounded-xl transition-all active:scale-95"
                  >
                    <Icon icon="lucide:share-2" className="mr-2 h-5 w-5" />
                    Share link
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
};

export default InvitePopup;
