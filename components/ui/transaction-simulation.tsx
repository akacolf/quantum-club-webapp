"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, AlertTriangle, CheckCircle, Info, Loader2, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BalanceChange {
  symbol: string;
  name: string;
  amount: string;
  isIncoming: boolean;
  usdValue?: number;
  image?: string;
}

interface TransactionSimulationProps {
  isLoading?: boolean;
  sending: BalanceChange;
  receiving?: BalanceChange | null;
  fee: {
    amount: string;
    symbol: string;
    usdValue?: number;
  };
  recipient: string;
  warnings?: string[];
  isSimulated?: boolean;
}

export function TransactionSimulation({
  isLoading = false,
  sending,
  receiving = null,
  fee,
  recipient,
  warnings = [],
  isSimulated = true,
}: TransactionSimulationProps) {
  const formatAddress = (address: string) => {
    if (!address) return "Unknown";
    if (address.length > 20) {
      return `${address.slice(0, 8)}...${address.slice(-6)}`;
    }
    return address;
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-8 gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Simulating transaction...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-3 bg-muted/30 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Transaction Preview</span>
          </div>
          {isSimulated && (
            <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-400 border-green-500/30">
              <CheckCircle className="w-3 h-3 mr-1" />
              Simulated
            </Badge>
          )}
        </div>

        {/* Balance Changes */}
        <div className="p-4 space-y-3">
          {/* Sending */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Send</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {formatAddress(recipient)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground">
                -{parseFloat(sending.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })} {sending.symbol}
              </p>
              {sending.usdValue !== undefined && (
                <p className="text-xs text-muted-foreground">
                  ≈${sending.usdValue.toFixed(2)}
                </p>
              )}
            </div>
          </motion.div>

          {/* Receiving (for swaps) */}
          <AnimatePresence>
            {receiving && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-between p-3 bg-green-500/5 rounded-xl border border-green-500/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <ArrowDownLeft className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-400">Receive</p>
                    <p className="text-xs text-muted-foreground">{receiving.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-400">
                    +{parseFloat(receiving.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })} {receiving.symbol}
                  </p>
                  {receiving.usdValue !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      ≈${receiving.usdValue.toFixed(2)}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="border-t border-border" />

          {/* Network Fee */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <Info className="w-4 h-4" />
              <span>Network fee</span>
            </div>
            <div className="text-right">
              <span className="font-medium text-foreground">
                ≈{parseFloat(fee.amount).toFixed(6)} {fee.symbol}
              </span>
              {fee.usdValue !== undefined && (
                <span className="text-xs text-muted-foreground ml-1">
                  (${fee.usdValue.toFixed(2)})
                </span>
              )}
            </div>
          </motion.div>

          {/* Total */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-between text-sm pt-2 border-t border-border"
          >
            <span className="font-medium text-foreground">Total</span>
            <div className="text-right">
              <span className="font-bold text-foreground">
                ${(
                  (sending.usdValue || 0) + 
                  (fee.usdValue || 0)
                ).toFixed(2)}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Warnings */}
        <AnimatePresence>
          {warnings.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-border"
            >
              <div className="p-3 space-y-2">
                {warnings.map((warning, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="flex items-start gap-2 p-2 bg-yellow-500/10 rounded-lg"
                  >
                    <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-400">{warning}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// Hook to simulate a transaction (for future use with actual simulation APIs)
export function useTransactionSimulation() {
  // This can be expanded to integrate with actual simulation services
  // like TON's emulate or Blowfish for EVM chains
  
  const simulateTransaction = async (params: {
    from: string;
    to: string;
    amount: string;
    token: string;
    chain: string;
  }): Promise<{
    success: boolean;
    balanceChanges: BalanceChange[];
    warnings: string[];
  }> => {
    // For now, return a simple simulation based on input
    // In production, this would call actual simulation APIs
    
    const balanceChanges: BalanceChange[] = [
      {
        symbol: params.token,
        name: params.token,
        amount: params.amount,
        isIncoming: false,
      }
    ];
    
    const warnings: string[] = [];
    
    // Add warnings based on transaction type
    if (parseFloat(params.amount) > 1000) {
      warnings.push("Large transaction amount - please double-check recipient address");
    }
    
    return {
      success: true,
      balanceChanges,
      warnings,
    };
  };

  return { simulateTransaction };
}
