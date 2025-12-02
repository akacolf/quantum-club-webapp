"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Fingerprint, KeyRound, X, ShieldCheck, AlertCircle } from "lucide-react";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { dbfs } from "@/app/(firebase)/client";
import { useGameContext } from "@/app/(contexts)/MiningContext";

interface BiometricAuthProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

type AuthMethod = "biometric" | "pin" | "selecting";

// Check if Web Authentication API (biometrics) is available
function isBiometricAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.PublicKeyCredential && navigator.credentials);
}

// Check if platform authenticator (Face ID, Touch ID, Windows Hello) is available
async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isBiometricAvailable()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function BiometricAuth({
  isOpen,
  onSuccess,
  onCancel,
  title = "Confirm Transaction",
  description = "Authenticate to sign and send this transaction",
}: BiometricAuthProps) {
  const [authMethod, setAuthMethod] = useState<AuthMethod>("selecting");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);
  const [hasStoredPin, setHasStoredPin] = useState(false);
  const {telegramId} = useGameContext();
   // Simple hash function for PIN (in production, use a proper crypto library)
  const hashPin = useCallback((pinValue: string): string => {
    let hash = 0;
    for (let i = 0; i < pinValue.length; i++) {
      const char = pinValue.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }, []);

  const getPin = useCallback(async() => {
    if (!telegramId) {
      return null;
    }
    const pinRef = doc(dbfs,"wallet",telegramId);
    const storedHash = localStorage.getItem("quantum_wallet_pin_hash");
    if (!storedHash) {
      const getPin = await getDoc(pinRef);
      const pinData = getPin.data()?.pinHash;
      if (pinData) {
        localStorage.setItem("quantum_wallet_pin_hash", pinData);
        return getPin;
      }else{
        return null;
      }
    }else{
      return storedHash;
    }
  }, [telegramId, hashPin, pin]);
  // Check available authentication methods on mount
  useEffect(() => {
    const checkAuthMethods = async () => {
      if (isOpen) {
      // Check for biometric availability
      isPlatformAuthenticatorAvailable().then(setHasBiometric);
      
      // Check if PIN is set up
      if(!telegramId){
        return;
      }
      const dataPin = await getPin();
      setHasStoredPin(!!dataPin);
      setAuthMethod("selecting");
      setPin("");
      setPinError("");
  }
    };
      checkAuthMethods();
  }, [isOpen]);
  
 
  // Verify PIN
  const verifyPin = useCallback(async() => {
    if (pin.length < 4) {
      setPinError("PIN must be at least 4 digits");
      return;
    }
    if (!telegramId) {
      return;
    }
    const pinRef = doc(dbfs,"wallet",telegramId);
    const storedHash = localStorage.getItem("quantum_wallet_pin_hash");
    if (!storedHash) {
      const getPin = (await getDoc(pinRef)).data()?.pinHash;
      if (getPin) {
        localStorage.setItem("quantum_wallet_pin_hash", hashPin(pin));
        if (hashPin(pin) === getPin) {
          setPinError("");
          onSuccess();
        } else {
          setPinError("Incorrect PIN. Please try again.");
          setPin("");
        }
      }else{
      setDoc(pinRef, { pinHash: hashPin(pin) });
      onSuccess();
      return;
      }
    }else{
    // Verify against stored PIN
    if (hashPin(pin) === storedHash) {
      setPinError("");
      onSuccess();
    } else {
      setPinError("Incorrect PIN. Please try again.");
      setPin("");
    }
    }

  }, [pin, hashPin, onSuccess]);
  // Biometric authentication using Web Authentication API
  const authenticateWithBiometric = useCallback(async () => {
    if (!hasBiometric) {
      setPinError("Biometric authentication not available on this device");
      setAuthMethod("pin");
      return;
    }

    setIsAuthenticating(true);
    
    try {
      // Check if we have existing credentials
      const credentialId = localStorage.getItem("quantum_wallet_credential_id");
      
      if (credentialId) {
        // Use existing credential
        const credential = await navigator.credentials.get({
          publicKey: {
            challenge: new Uint8Array(32),
            timeout: 60000,
            userVerification: "required",
            allowCredentials: [{
              id: Uint8Array.from(atob(credentialId), c => c.charCodeAt(0)),
              type: "public-key",
              transports: ["internal"],
            }],
          },
        });

        if (credential) {
          onSuccess();
        }
      } else {
        // Create new credential for first-time setup
        const userId = new Uint8Array(16);
        crypto.getRandomValues(userId);
        
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge: new Uint8Array(32),
            rp: {
              name: "Quantum Club Wallet",
              id: window.location.hostname,
            },
            user: {
              id: userId,
              name: "wallet-user",
              displayName: "Wallet User",
            },
            pubKeyCredParams: [
              { alg: -7, type: "public-key" },   // ES256
              { alg: -257, type: "public-key" }, // RS256
            ],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required",
              residentKey: "preferred",
            },
            timeout: 60000,
          },
        });

        if (credential && credential instanceof PublicKeyCredential) {
          // Store credential ID for future use
          const rawId = new Uint8Array(credential.rawId);
          const credIdBase64 = btoa(String.fromCharCode(...rawId));
          localStorage.setItem("quantum_wallet_credential_id", credIdBase64);
          onSuccess();
        }
      }
    } catch (error) {
      console.error("Biometric authentication failed:", error);
      
      // Handle specific errors
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          setPinError("Authentication cancelled or not allowed");
        } else if (error.name === "SecurityError") {
          setPinError("Security error. Please use PIN instead.");
          setAuthMethod("pin");
        } else {
          setPinError("Biometric authentication failed. Please use PIN.");
          setAuthMethod("pin");
        }
      }
    } finally {
      setIsAuthenticating(false);
    }
  }, [hasBiometric, onSuccess]);

  // Handle PIN input (only allow numbers)
  const handlePinChange = (value: string) => {
    const numericValue = value.replace(/\D/g, "").slice(0, 6);
    setPin(numericValue);
    setPinError("");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onCancel()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="w-full max-w-sm"
        >
          <Card className="bg-card border-border text-card-foreground shadow-2xl">
            <CardHeader className="relative pb-4 text-center">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8 rounded-full"
                onClick={onCancel}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                <ShieldCheck className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="text-lg font-bold">{title}</CardTitle>
              <CardDescription className="text-sm">
                {description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Method Selection */}
              {authMethod === "selecting" && (
                <div className="space-y-3">
                  {hasBiometric && (
                    <Button
                      variant="outline"
                      className="w-full h-14 justify-start gap-4 bg-secondary/50 border-border hover:bg-secondary"
                      onClick={() => {
                        setAuthMethod("biometric");
                        authenticateWithBiometric();
                      }}
                    >
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Fingerprint className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">Biometrics</div>
                        <div className="text-xs text-muted-foreground">
                          Face ID, Touch ID, or fingerprint
                        </div>
                      </div>
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    className="w-full h-14 justify-start gap-4 bg-secondary/50 border-border hover:bg-secondary"
                    onClick={() => setAuthMethod("pin")}
                  >
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <KeyRound className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">PIN Code</div>
                      <div className="text-xs text-muted-foreground">
                        {hasStoredPin ? "Enter your PIN" : "Set up a new PIN"}
                      </div>
                    </div>
                  </Button>
                </div>
              )}

              {/* Biometric Authentication */}
              {authMethod === "biometric" && (
                <div className="text-center space-y-4 py-4">
                  {isAuthenticating ? (
                    <>
                      <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                        <Fingerprint className="w-10 h-10 text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Waiting for authentication...
                      </p>
                    </>
                  ) : (
                    <>
                      {pinError && (
                        <div className="flex items-center gap-2 text-destructive text-sm justify-center">
                          <AlertCircle className="w-4 h-4" />
                          {pinError}
                        </div>
                      )}
                      <Button
                        onClick={authenticateWithBiometric}
                        className="w-full"
                      >
                        Try Again
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setAuthMethod("pin");
                          setPinError("");
                        }}
                        className="text-sm"
                      >
                        Use PIN instead
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* PIN Authentication */}
              {authMethod === "pin" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">
                      {hasStoredPin ? "Enter your PIN" : "Create a new PIN (4-6 digits)"}
                    </label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={pin}
                      onChange={(e) => handlePinChange(e.target.value)}
                      placeholder="••••••"
                      className="text-center text-2xl tracking-[0.5em] h-14 bg-secondary/50 border-border"
                      maxLength={6}
                      autoFocus
                    />
                    {pinError && (
                      <div className="flex items-center gap-2 text-destructive text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {pinError}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={verifyPin}
                    disabled={pin.length < 4}
                    className="w-full h-12"
                  >
                    {hasStoredPin ? "Confirm" : "Set PIN & Continue"}
                  </Button>

                  {hasBiometric && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setAuthMethod("biometric");
                        setPinError("");
                        setPin("");
                        authenticateWithBiometric();
                      }}
                      className="w-full text-sm"
                    >
                      Use Biometrics instead
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
export function DeletePin(telegramId:string) {
    const runDeleteProcess = async () => {
      if (!telegramId || telegramId.trim() === "") return;
      try {
        const pinRef = doc(dbfs, "wallet", telegramId);
        localStorage.removeItem("quantum_wallet_pin_hash");
        await updateDoc(pinRef, { 
            pinHash: ""
        });
        console.log("Pin başarıyla silindi.");
        return;
      } catch (error) {
        console.error("Pin silinirken hata oluştu:", error);
        return;
      }
    };
    runDeleteProcess();
}
// Hook for easy integration
export function useBiometricAuth() {
  const [isOpen, setIsOpen] = useState(false);
  const [resolveAuth, setResolveAuth] = useState<((value: boolean) => void) | null>(null);

  const requestAuth = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      setResolveAuth(() => resolve);
      setIsOpen(true);
    });
  }, []);

  const handleSuccess = useCallback(() => {
    setIsOpen(false);
    resolveAuth?.(true);
    setResolveAuth(null);
  }, [resolveAuth]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resolveAuth?.(false);
    setResolveAuth(null);
  }, [resolveAuth]);

  return {
    isOpen,
    requestAuth,
    handleSuccess,
    handleCancel,
    BiometricAuthComponent: BiometricAuth,
  };
}
