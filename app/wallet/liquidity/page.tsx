"use client";

import { useState, useEffect } from "react";
import { useQueryState, parseAsStringLiteral } from "nuqs";
import { getSecureMnemonic } from "@/lib/secure-mnemonic";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import Loader from "@/app/(components)/Loader";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import {
  BiometricAuth,
  useBiometricAuth,
} from "@/components/ui/biometric-auth";
import { Address, internal, SendMode, Cell } from "@ton/core";
import { WalletContractV5R1 } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { TonApiClient } from "@ton-api/client";
import { ContractAdapter } from "@ton-api/ton-adapter";
import { useWallet } from "../WalletContext";
import {
  toUnits,
  fromUnits,
  buildLiquidityTxParams,
  buildBurnLpTxParams,
  type SwapAsset,
  type LiquidityProvisionResult,
} from "@/lib/stonfi";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { addLiquiditySchema, removeLiquiditySchema } from "@/lib/validations";
import { useSwapAssetsQuery, useLPPositionsQuery, type LPPosition } from "@/app/(hooks)/queries/use-liquidity";
import { useQueryClient } from "@tanstack/react-query";
import { StonApiClient } from "@ston-fi/api";

// Format large numbers with K, M, B suffixes
const formatCompactNumber = (num: number): string => {
  if (num === 0) return "0";
  if (Math.abs(num) < 0.0001) return num.toExponential(2);
  if (Math.abs(num) < 1000) return num.toFixed(4).replace(/\.?0+$/, "");
  if (Math.abs(num) < 1000000)
    return (num / 1000).toFixed(2).replace(/\.?0+$/, "") + "K";
  if (Math.abs(num) < 1000000000)
    return (num / 1000000).toFixed(2).replace(/\.?0+$/, "") + "M";
  return (num / 1000000000).toFixed(2).replace(/\.?0+$/, "") + "B";
};

// Format balance string with compact notation
const formatBalance = (balance: string): string => {
  const num = parseFloat(balance) || 0;
  return formatCompactNumber(num);
};

// Provision type
type ProvisionType = "Balanced" | "Arbitrary" | "Initial";

export default function LiquidityPage() {
  useTelegramBackButton("/wallet");
  const { telegramId } = useUserContext();
  const router = useRouter();

  const {
    isOpen: isAuthOpen,
    requestAuth,
    handleSuccess: handleAuthSuccess,
    handleCancel: handleAuthCancel,
  } = useBiometricAuth();

  const {
    walletAddress,
    tonBalance,
    jettons,
    isLoadingAssets: isContextLoading,
    hasFetched,
    isTestnet,
  } = useWallet();

  useEffect(() => {
    router.prefetch("/wallet");
  }, [router]);

  // State
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(["add", "remove", "positions"] as const).withDefault("positions").withOptions({ history: "replace" }));
  const [step, setStep] = useState<
    "input" | "confirm" | "processing" | "success"
  >("input");
  const queryClient = useQueryClient();
  const { data: swapAssets, isLoading: isLoadingAssets } = useSwapAssetsQuery();
  const { data: positions = [], isLoading: isLoadingPositions } = useLPPositionsQuery(walletAddress, swapAssets);

  // Add liquidity state
  const [tokenA, setTokenA] = useState<SwapAsset | null>(null);
  const [tokenB, setTokenB] = useState<SwapAsset | null>(null);
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [isSingleSided, setIsSingleSided] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<{
    minLpUnits: string;
    tokenAUnits: string;
    tokenBUnits: string;
    provisionType: ProvisionType;
    poolAddress?: string;
    router?: {
      address: string;
      ptonMasterAddress: string;
      ptonVersion: string;
      majorVersion: number;
      minorVersion: number;
    };
  } | null>(null);

  // Remove liquidity state
  const [selectedPosition, setSelectedPosition] = useState<LPPosition | null>(
    null,
  );
  const [removePercent, setRemovePercent] = useState("50");
  const [isRemovingLiquidity, setIsRemovingLiquidity] = useState(false);
  const [removeStep, setRemoveStep] = useState<"input" | "processing" | "success">("input");

  // Processing state
  const [, setIsProcessing] = useState(false);

  // Redirect if no wallet
  useEffect(() => {
    const storedWallet = localStorage.getItem(
      `quantum_wallet_address_${telegramId}`,
    );
    if (!storedWallet) {
      router.push("/wallet");
    }
  }, [router, telegramId]);

  // Set default tokens when assets load
  useEffect(() => {
    if (!swapAssets || tokenA || tokenB) return;
    const tonAsset = swapAssets.find((a) => a.kind === "Ton");
    const firstJetton = swapAssets.find((a) => a.kind === "Jetton");
    if (tonAsset) setTokenA(tonAsset);
    if (firstJetton) setTokenB(firstJetton);
  }, [swapAssets, tokenA, tokenB]);


  // Get balance for asset
  const getAssetBalance = (asset: SwapAsset | null): string => {
      if (!asset) return "0";

      if (asset.kind === "Ton") {
        return tonBalance;
      }

      const jetton = jettons.find((j) => {
        if (!j.jettonAddress) return false;
        try {
          const assetAddr = Address.parse(asset.contractAddress)
            .toRawString()
            .toLowerCase();
          const jettonAddr = Address.parse(j.jettonAddress)
            .toRawString()
            .toLowerCase();
          return assetAddr === jettonAddr;
        } catch {
          return false;
        }
      });

      if (jetton) {
        return (
          parseFloat(jetton.balance) / Math.pow(10, jetton.decimals)
        ).toFixed(4);
      }

      return "0";
    };

  // Debounce simulation
  useEffect(() => {
    if (!tokenA || !tokenB || !amountA || parseFloat(amountA) <= 0) {
      setSimulationResult(null);
      return;
    }

    const simulateProvision = async () => {
      setIsSimulating(true);
      try {
        const client = new StonApiClient();

        // Check for existing pool
        let pools: any[] = [];
        try {
          pools = await client.getPoolsByAssetPair({
            asset0Address: tokenA.contractAddress,
            asset1Address: tokenB.contractAddress,
          });
        } catch (poolError) {
          console.warn("Failed to fetch pools:", poolError);
          pools = [];
        }

        const pool = pools?.[0];

        // Determine provision type:
        // - Initial: No pool exists, creating new pool
        // - Balanced: Pool exists, adding liquidity in balanced ratio
        // - Arbitrary: Pool exists but single-sided deposit (only one token)
        const provisionType: ProvisionType = pool
          ? isSingleSided
            ? "Arbitrary"
            : "Balanced"
          : "Initial";

        if (!pool && provisionType !== "Initial") {
          throw new Error(
            "No liquidity pool found for this token pair. Initial liquidity provision is required.",
          );
        }

        // Build simulation input based on provision type
        let result;

        if (provisionType === "Initial") {
          // Initial provision requires both tokens
          if (!amountB || parseFloat(amountB) <= 0) {
            throw new Error(
              "Initial liquidity provision requires amounts for both tokens.",
            );
          }
          result = await client.simulateLiquidityProvision({
            tokenA: tokenA.contractAddress,
            tokenB: tokenB.contractAddress,
            provisionType: "Initial",
            slippageTolerance: "0.01",
            walletAddress: walletAddress || undefined,
            tokenAUnits: toUnits(amountA, tokenA.decimals),
            tokenBUnits: toUnits(amountB, tokenB.decimals),
          });
        } else if (provisionType === "Balanced") {
          // Balanced provision - only provide tokenA, tokenB is calculated
          result = await client.simulateLiquidityProvision({
            tokenA: tokenA.contractAddress,
            tokenB: tokenB.contractAddress,
            provisionType: "Balanced",
            slippageTolerance: "0.01",
            walletAddress: walletAddress || undefined,
            poolAddress: pool?.address || "",
            tokenAUnits: toUnits(amountA, tokenA.decimals),
          });
        } else {
          // Arbitrary (single-sided) - provide only one token
          // Note: Single-sided liquidity provision may not be supported by all pools
          // The SDK will handle the conversion internally
          try {
            // For single-sided, we only provide tokenA
            result = await client.simulateLiquidityProvision({
              tokenA: tokenA.contractAddress,
              tokenB: tokenB.contractAddress,
              provisionType: "Arbitrary",
              slippageTolerance: "0.05", // Higher slippage for single-sided
              walletAddress: walletAddress || undefined,
              poolAddress: pool?.address || "",
              tokenAUnits: toUnits(amountA, tokenA.decimals),
              tokenBUnits: "0", // Explicitly zero for single-sided
            });
          } catch (singleSidedError) {
            // Single-sided might not be supported, try balanced approach
            console.warn(
              "Single-sided provision failed, trying balanced approach:",
              singleSidedError,
            );
            toast.error("Single-sided deposit not supported for this pool", {
              description: "Please use balanced deposit or try a different pool.",
            });
            throw singleSidedError;
          }
        }

        setSimulationResult({
          minLpUnits: result.minLpUnits,
          tokenAUnits: result.tokenAUnits,
          tokenBUnits: result.tokenBUnits,
          provisionType: result.provisionType as ProvisionType,
          poolAddress: pool?.address,
          // Store router info from simulation result (per STON.fi docs)
          router: result.router,
        });

        // If balanced, update tokenB amount with raw numeric value (not formatted)
        // The display formatting happens in the Input value prop
        if (provisionType === "Balanced" && result.tokenBUnits) {
          const rawAmount = fromUnits(result.tokenBUnits, tokenB.decimals);
          setAmountB(rawAmount);
        }
      } catch (error) {
        console.error("Failed to simulate provision:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        // Provide more specific error messages
        if (errorMessage.includes("pool") || errorMessage.includes("Pool")) {
          toast.error("Pool not found", {
            description: "This token pair may not have a liquidity pool yet.",
          });
        } else if (
          errorMessage.includes("single-sided") ||
          errorMessage.includes("Single")
        ) {
          toast.error("Single-sided deposit failed", {
            description: "Try using balanced deposit mode instead.",
          });
        } else {
          toast.error("Failed to simulate liquidity provision", {
            description: errorMessage.substring(0, 100),
          });
        }
        setSimulationResult(null);
      } finally {
        setIsSimulating(false);
      }
    };

    const timer = setTimeout(() => {
      simulateProvision();
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenA, tokenB, amountA, isSingleSided]);

  // Clear amountB when single-sided mode is enabled (user only provides tokenA)
  useEffect(() => {
    if (isSingleSided) {
      setAmountB("");
    }
  }, [isSingleSided]);

  // Validation
  const canAddLiquidity = (() => {
    if (!tokenA || !tokenB || !amountA || parseFloat(amountA) <= 0)
      return false;
    if (!simulationResult) return false;

    const balanceA = parseFloat(getAssetBalance(tokenA));
    if (parseFloat(amountA) > balanceA) return false;

    if (!isSingleSided && amountB && parseFloat(amountB) > 0) {
      const balanceB = parseFloat(getAssetBalance(tokenB));
      if (parseFloat(amountB) > balanceB) return false;
    }

    // Check TON for gas — account for TON being deposited
    const tonBal = parseFloat(tonBalance);
    let tonNeededForDeposit = 0;
    if (tokenA.kind === "Ton") tonNeededForDeposit += parseFloat(amountA);
    if (!isSingleSided && tokenB?.kind === "Ton" && amountB) tonNeededForDeposit += parseFloat(amountB);
    if (tonBal - tonNeededForDeposit < 0.5) return false;

    return true;
  })();

  // Handle add liquidity
  const handleAddLiquidity = async () => {
    // Zod schema validation at submit boundary
    const parsed = addLiquiditySchema.safeParse({
      tokenA: tokenA?.symbol || "",
      tokenB: tokenB?.symbol || "",
      amountA: amountA || "",
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    const authenticated = await requestAuth();
    if (!authenticated) {
      toast.error("Authentication required");
      return;
    }

    await executeAddLiquidity();
  };

  // Execute add liquidity
  const executeAddLiquidity = async () => {
    const storedMnemonic = await getSecureMnemonic(telegramId);
    if (
      !storedMnemonic ||
      !simulationResult ||
      !tokenA ||
      !tokenB ||
      !walletAddress
    ) {
      toast.error("Missing data for transaction");
      return;
    }

    setIsProcessing(true);
    setStep("processing");

    try {
      // Use router info from simulation result (per STON.fi docs)
      // The simulation result contains the correct router for the pool
      const routerInfo = simulationResult.router;
      
      // Fallback to default router if not provided in simulation
      const defaultRouter = {
        address: "EQCqX53C27YsoOqdEO6x_hMs0vT-gOMRtjG14kmqORvLLqbp", // STON.fi Router v2.1
        ptonMasterAddress: "EQBnGWMCf3-FZZq1W4IWcWiGAc3PHuZ0_H-7sad2oY00o83S",
        ptonVersion: "v2.1",
        majorVersion: 2,
        minorVersion: 1,
      };

      const lpSimulation: LiquidityProvisionResult = {
        provisionType: simulationResult.provisionType,
        router: routerInfo || defaultRouter,
        poolAddress: simulationResult.poolAddress || "",
        tokenA: tokenA.contractAddress,
        tokenB: tokenB.contractAddress,
        tokenAUnits: simulationResult.tokenAUnits,
        tokenBUnits: simulationResult.tokenBUnits,
        estimatedLpUnits: simulationResult.minLpUnits,
        minLpUnits: simulationResult.minLpUnits,
        minTokenAUnits: simulationResult.tokenAUnits,
        minTokenBUnits: simulationResult.tokenBUnits,
        priceImpact: "0",
      };

      // Build the transaction parameters
      const txParamsList = await buildLiquidityTxParams(
        lpSimulation,
        walletAddress,
      );

      if (txParamsList.length === 0) {
        throw new Error("Failed to build liquidity transactions");
      }

      // Initialize TonAPI client
      const tonApiClient = new TonApiClient({
        baseUrl: "https://tonapi.io",
      });
      const contractAdapter = new ContractAdapter(tonApiClient);

      // Create wallet from mnemonic
      const mnemonic = storedMnemonic.split(" ");
      const keyPair = await mnemonicToPrivateKey(mnemonic);
      const wallet = WalletContractV5R1.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
      });
      const contract = contractAdapter.open(wallet);

      // Get current seqno
      const seqno = await contract.getSeqno();

      // Build and send messages for each transaction
      const messages = txParamsList.map((txParams) =>
        internal({
          to: txParams.to,
          value: txParams.value,
          body: txParams.body ? Cell.fromBoc(txParams.body)[0] : undefined,
        }),
      );

      // Send the transaction
      await contract.sendTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        messages,
      });

      haptics.success();
      toast.success("Liquidity added successfully!", {
        description: `Added liquidity to ${tokenA.symbol}/${tokenB.symbol} pool`,
      });

      setStep("success");

      // Refresh positions after a delay
      setTimeout(() => {
        setStep("input");
        setTab("positions");
        setAmountA("");
        setAmountB("");
        setSimulationResult(null);
      }, 3000);
    } catch (error) {
      console.error("Add liquidity failed:", error);
      haptics.error();
      toast.error("Failed to add liquidity", {
        description:
          error instanceof Error ? error.message : "Transaction failed",
      });
      setStep("input");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle remove liquidity
  const handleRemoveLiquidity = async () => {
    // Zod schema validation at submit boundary
    const parsed = removeLiquiditySchema.safeParse({
      position: selectedPosition?.poolAddress || "",
      percent: removePercent || "",
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    const authenticated = await requestAuth();
    if (!authenticated) {
      toast.error("Authentication required");
      return;
    }

    await executeRemoveLiquidity();
  };

  // Execute remove liquidity (burn LP tokens)
  const executeRemoveLiquidity = async () => {
    if (!selectedPosition || !walletAddress) {
      toast.error("Please select a position to remove");
      return;
    }

    const storedMnemonic = await getSecureMnemonic(telegramId);
    if (!storedMnemonic) {
      toast.error("Wallet not found");
      return;
    }

    setIsRemovingLiquidity(true);
    setRemoveStep("processing");

    try {
      // Calculate the amount of LP tokens to burn based on percentage
      const percent = parseInt(removePercent);
      const fullBalance = BigInt(selectedPosition.lpBalance);
      const burnAmount = (fullBalance * BigInt(percent)) / BigInt(100);

      if (burnAmount <= BigInt(0)) {
        throw new Error("Invalid burn amount");
      }

      // Build burn LP transaction
      const txParams = await buildBurnLpTxParams({
        poolAddress: selectedPosition.poolAddress,
        lpBalance: burnAmount.toString(),
        userWalletAddress: walletAddress,
      });

      if (!txParams) {
        throw new Error("Failed to build burn transaction");
      }

      // Initialize TonAPI client
      const tonApiClient = new TonApiClient({
        baseUrl: "https://tonapi.io",
      });
      const contractAdapter = new ContractAdapter(tonApiClient);

      // Create wallet from mnemonic
      const mnemonic = storedMnemonic.split(" ");
      const keyPair = await mnemonicToPrivateKey(mnemonic);
      const wallet = WalletContractV5R1.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
      });
      const contract = contractAdapter.open(wallet);

      // Get current seqno
      const seqno = await contract.getSeqno();

      // Build message
      const message = internal({
        to: txParams.to,
        value: txParams.value,
        body: txParams.body ? Cell.fromBoc(txParams.body)[0] : undefined,
      });

      // Send the transaction
      await contract.sendTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        messages: [message],
      });

      haptics.success();
      toast.success("Liquidity removed successfully!", {
        description: `Removed ${percent}% from ${selectedPosition.token0?.symbol}/${selectedPosition.token1?.symbol} pool`,
      });

      setRemoveStep("success");

      // Refresh positions after a delay
      setTimeout(() => {
        setRemoveStep("input");
        setTab("positions");
        setSelectedPosition(null);
        setRemovePercent("50");
        queryClient.invalidateQueries({ queryKey: ["lp-positions"] });
      }, 3000);
    } catch (error) {
      console.error("Remove liquidity failed:", error);
      haptics.error();
      toast.error("Failed to remove liquidity", {
        description:
          error instanceof Error ? error.message : "Transaction failed",
      });
      setRemoveStep("input");
    } finally {
      setIsRemovingLiquidity(false);
    }
  };

  // Loading state
  if (isLoadingAssets || (isContextLoading && !hasFetched)) {
    return <Loader />;
  }

  // Testnet warning
  if (isTestnet) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4 pt-6">
        <div className="max-w-md mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-foreground">
              Liquidity Pools
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Powered by{" "}
              <span className="font-semibold text-foreground">STON.fi</span>
            </p>
          </div>

          <div className="text-center py-16 space-y-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Icon icon="lucide:alert-triangle" className="w-10 h-10 text-primary"/>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">
                Not Available in Testnet
              </h2>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Liquidity pools are only available on mainnet.
              </p>
            </div>
            <Button
              className="bg-card border border-border text-foreground hover:bg-accent h-12 px-8 rounded-xl"
              asChild
            >
              <Link href="/wallet">Back to Wallet</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 pt-6 pb-24">
      <div className="max-w-md mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">
            Liquidity Pools
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Powered by{" "}
            <span className="font-semibold text-foreground">STON.fi</span>
          </p>
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as typeof tab)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger
              value="positions"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Icon icon="lucide:droplets" className="w-4 h-4 mr-2"/>
              Positions
            </TabsTrigger>
            <TabsTrigger
              value="add"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Icon icon="lucide:plus" className="w-4 h-4 mr-2"/>
              Add
            </TabsTrigger>
            <TabsTrigger
              value="remove"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Icon icon="lucide:minus" className="w-4 h-4 mr-2"/>
              Remove
            </TabsTrigger>
          </TabsList>

          {/* Positions Tab */}
          <TabsContent value="positions" className="space-y-4">
            {isLoadingPositions ? (
              <div className="flex justify-center py-12">
                <ButtonLoader />
              </div>
            ) : positions.length === 0 ? (
              <Card className="bg-card/80 border-border rounded-2xl">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                    <Icon icon="lucide:droplets" className="w-8 h-8 text-muted-foreground"/>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">No LP Positions</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      Add liquidity to start earning fees
                    </p>
                  </div>
                  <Button
                    onClick={() => setTab("add")}
                    className="bg-primary text-primary-foreground"
                  >
                    <Icon icon="lucide:plus" className="w-4 h-4 mr-2"/>
                    Add Liquidity
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {positions.map((position, idx) => (
                  <Card
                    key={idx}
                    className="bg-card/80 border-border rounded-2xl"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {position.token0?.imageUrl && (
                              <Image
                                src={position.token0.imageUrl}
                                alt={position.token0.symbol}
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded-full border-2 border-card"
                                unoptimized
                              />
                            )}
                            {position.token1?.imageUrl && (
                              <Image
                                src={position.token1.imageUrl}
                                alt={position.token1.symbol}
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded-full border-2 border-card"
                                unoptimized
                              />
                            )}
                          </div>
                          <div>
                            <p className="font-bold">
                              {position.token0?.symbol}/
                              {position.token1?.symbol}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {position.sharePercent}% share
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPosition(position);
                            setTab("remove");
                          }}
                        >
                          Manage
                          <Icon icon="lucide:arrow-right" className="w-4 h-4 ml-1"/>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Add Liquidity Tab */}
          <TabsContent value="add" className="space-y-4">
            <AnimatePresence mode="wait">
              {step === "input" && (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {/* Token A */}
                  <Card className="bg-card/80 border-border rounded-2xl">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">
                          Token A
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Balance:{" "}
                          {tokenA
                            ? formatBalance(getAssetBalance(tokenA))
                            : "0"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="bg-accent/50 border border-border h-11 rounded-xl px-3 gap-2"
                            >
                              {tokenA?.imageUrl ? (
                                <Image
                                  src={tokenA.imageUrl}
                                  alt={tokenA.symbol}
                                  width={24}
                                  height={24}
                                  className="w-6 h-6 rounded-full"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-6 h-6 bg-primary rounded-full" />
                              )}
                              <span className="font-bold">
                                {tokenA?.symbol || "Select"}
                              </span>
                              <Icon icon="lucide:chevron-down" className="w-4 h-4"/>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-64 bg-popover border-border max-h-80 overflow-y-auto scrollbar-hide">
                            <DropdownMenuLabel>Select token</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {swapAssets?.map((asset) => (
                              <DropdownMenuItem
                                key={asset.contractAddress}
                                onClick={() => {
                                  if (
                                    asset.contractAddress !==
                                    tokenB?.contractAddress
                                  ) {
                                    setTokenA(asset);
                                    setAmountB("");
                                    setSimulationResult(null);
                                  }
                                }}
                                className="flex items-center gap-3 p-3"
                              >
                                {asset.imageUrl ? (
                                  <Image
                                    src={asset.imageUrl}
                                    alt={asset.symbol}
                                    width={32}
                                    height={32}
                                    className="w-8 h-8 rounded-full"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="w-8 h-8 bg-primary rounded-full" />
                                )}
                                <div className="flex-1">
                                  <div className="font-bold">
                                    {asset.symbol}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {asset.displayName}
                                  </div>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {formatBalance(getAssetBalance(asset))}
                                </div>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.0"
                          value={amountA}
                          onChange={(e) => {
                            const value = e.target.value.replace(",", ".");
                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                              setAmountA(value);
                            }
                          }}
                          className="flex-1 bg-transparent border-0 text-2xl font-bold text-right h-11 focus-visible:ring-0 p-0"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Plus Icon */}
                  <div className="flex justify-center -my-2 relative z-10">
                    <div className="w-10 h-10 bg-card border-4 border-background rounded-xl flex items-center justify-center">
                      <Icon icon="lucide:plus" className="w-5 h-5 text-muted-foreground"/>
                    </div>
                  </div>

                  {/* Token B */}
                  <Card className="bg-card/80 border-border rounded-2xl">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">
                          Token B
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Balance:{" "}
                          {tokenB
                            ? formatBalance(getAssetBalance(tokenB))
                            : "0"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="bg-accent/50 border border-border h-11 rounded-xl px-3 gap-2"
                            >
                              {tokenB?.imageUrl ? (
                                <Image
                                  src={tokenB.imageUrl}
                                  alt={tokenB.symbol}
                                  width={24}
                                  height={24}
                                  className="w-6 h-6 rounded-full"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-6 h-6 bg-primary rounded-full" />
                              )}
                              <span className="font-bold">
                                {tokenB?.symbol || "Select"}
                              </span>
                              <Icon icon="lucide:chevron-down" className="w-4 h-4"/>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-64 bg-popover border-border max-h-80 overflow-y-auto scrollbar-hide">
                            <DropdownMenuLabel>Select token</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {swapAssets?.map((asset) => (
                              <DropdownMenuItem
                                key={asset.contractAddress}
                                onClick={() => {
                                  if (
                                    asset.contractAddress !==
                                    tokenA?.contractAddress
                                  ) {
                                    setTokenB(asset);
                                    setAmountB("");
                                    setSimulationResult(null);
                                  }
                                }}
                                className="flex items-center gap-3 p-3"
                              >
                                {asset.imageUrl ? (
                                  <Image
                                    src={asset.imageUrl}
                                    alt={asset.symbol}
                                    width={32}
                                    height={32}
                                    className="w-8 h-8 rounded-full"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="w-8 h-8 bg-primary rounded-full" />
                                )}
                                <div className="flex-1">
                                  <div className="font-bold">
                                    {asset.symbol}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {asset.displayName}
                                  </div>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {formatBalance(getAssetBalance(asset))}
                                </div>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder={isSingleSided ? "N/A" : "0.0"}
                          value={
                            // In single-sided mode, show "Auto" or empty
                            isSingleSided
                              ? ""
                              : // Format display for large calculated amounts
                                simulationResult && amountB
                                ? (() => {
                                    const num = parseFloat(amountB);
                                    if (isNaN(num)) return amountB;
                                    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + "B";
                                    if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
                                    if (num >= 1000) return (num / 1000).toFixed(2) + "K";
                                    if (num >= 1) return num.toFixed(4).replace(/\.?0+$/, '');
                                    return num.toPrecision(4);
                                  })()
                                : amountB
                          }
                          onChange={(e) => {
                            // Only allow editing in Initial provision mode (no pool exists yet)
                            if (isSingleSided || simulationResult) return;
                            const value = e.target.value.replace(",", ".");
                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                              setAmountB(value);
                            }
                          }}
                          disabled={isSingleSided || !!simulationResult}
                          className="flex-1 bg-transparent border-0 text-2xl font-bold text-right h-11 focus-visible:ring-0 p-0 disabled:opacity-50"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Single-sided toggle */}
                  <Card className="bg-muted/50 border-border rounded-xl">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="single-sided" className="text-sm">
                            Single-sided deposit
                          </Label>
                          <Icon icon="lucide:info" className="w-3 h-3 text-muted-foreground"/>
                        </div>
                        <Switch
                          id="single-sided"
                          checked={isSingleSided}
                          onCheckedChange={setIsSingleSided}
                        />
                      </div>
                      {isSingleSided && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Deposit only one token. The protocol will handle the
                          conversion automatically.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Simulation result */}
                  {isSimulating ? (
                    <div className="flex justify-center py-4">
                      <ButtonLoader />
                    </div>
                  ) : (
                    simulationResult && (
                      <Card className="bg-muted/50 border-border rounded-xl">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Provision type
                            </span>
                            <Badge variant="secondary">
                              {simulationResult.provisionType}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Min LP tokens
                            </span>
                            <span className="font-medium">
                              {formatCompactNumber(
                                parseFloat(simulationResult.minLpUnits) / 1e9,
                              )}{" "}
                              LP
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  )}

                  {/* Add button */}
                  <Button
                    onClick={handleAddLiquidity}
                    disabled={!canAddLiquidity || isSimulating}
                    className="w-full bg-primary text-primary-foreground h-14 rounded-xl font-bold text-lg"
                  >
                    {isSimulating ? (
                      <ButtonLoader />
                    ) : !tokenA || !tokenB ? (
                      "Select tokens"
                    ) : !amountA || parseFloat(amountA) <= 0 ? (
                      "Enter amount"
                    ) : (() => {
                      const tonBal = parseFloat(tonBalance);
                      let tonForDeposit = 0;
                      if (tokenA?.kind === "Ton") tonForDeposit += parseFloat(amountA || "0");
                      if (!isSingleSided && tokenB?.kind === "Ton" && amountB) tonForDeposit += parseFloat(amountB);
                      return tonBal - tonForDeposit < 0.5;
                    })() ? (
                      "Insufficient TON for gas"
                    ) : !simulationResult ? (
                      "Calculating..."
                    ) : (
                      "Add Liquidity"
                    )}
                  </Button>
                </motion.div>
              )}

              {step === "processing" && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16 space-y-4"
                >
                  <div className="relative mx-auto w-20 h-20">
                    <Loader />
                  </div>
                  <h2 className="text-xl font-bold">Adding Liquidity...</h2>
                  <p className="text-muted-foreground text-sm">
                    Please wait while your transaction is processed
                  </p>
                </motion.div>
              )}

              {step === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16 space-y-4"
                >
                  <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                    <Icon icon="lucide:check" className="w-10 h-10 text-green-500"/>
                  </div>
                  <h2 className="text-xl font-bold text-green-500">
                    Liquidity Added!
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Your tokens have been added to the pool
                  </p>
                  {tokenA && tokenB && (
                    <p className="text-sm font-medium">
                      {amountA} {tokenA.symbol} + {amountB || "auto"}{" "}
                      {tokenB.symbol}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* Remove Liquidity Tab */}
          <TabsContent value="remove" className="space-y-4">
            <AnimatePresence mode="wait">
              {removeStep === "processing" && (
                <motion.div
                  key="remove-processing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16 space-y-4"
                >
                  <div className="relative mx-auto w-20 h-20">
                    <Loader />
                  </div>
                  <h2 className="text-xl font-bold">Removing Liquidity...</h2>
                  <p className="text-muted-foreground text-sm">
                    Please wait while your transaction is processed
                  </p>
                </motion.div>
              )}

              {removeStep === "success" && (
                <motion.div
                  key="remove-success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16 space-y-4"
                >
                  <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                    <Icon icon="lucide:check" className="w-10 h-10 text-green-500"/>
                  </div>
                  <h2 className="text-xl font-bold text-green-500">
                    Liquidity Removed!
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Your LP tokens have been burned and tokens returned
                  </p>
                  {selectedPosition && (
                    <p className="text-sm font-medium">
                      Removed {removePercent}% from {selectedPosition.token0?.symbol}/{selectedPosition.token1?.symbol}
                    </p>
                  )}
                </motion.div>
              )}

              {removeStep === "input" && positions.length === 0 && (
                <motion.div
                  key="remove-empty"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="bg-card/80 border-border rounded-2xl">
                    <CardContent className="p-8 text-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                        <Icon icon="lucide:minus" className="w-8 h-8 text-muted-foreground"/>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">
                          No Positions to Remove
                        </h3>
                        <p className="text-muted-foreground text-sm mt-1">
                          You need to add liquidity first
                        </p>
                      </div>
                      <Button onClick={() => setTab("add")} variant="outline">
                        Add Liquidity
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {removeStep === "input" && positions.length > 0 && (
                <motion.div
                  key="remove-input"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Position selector */}
                  <Card className="bg-card/80 border-border rounded-2xl">
                    <CardContent className="p-4">
                      <Label className="text-sm text-muted-foreground mb-2 block">
                        Select Position
                      </Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-between h-12"
                          >
                            {selectedPosition ? (
                              <div className="flex items-center gap-2">
                                <div className="flex -space-x-1">
                                  {selectedPosition.token0?.imageUrl && (
                                    <Image
                                      src={selectedPosition.token0.imageUrl}
                                      alt={selectedPosition.token0.symbol}
                                      width={20}
                                      height={20}
                                      className="w-5 h-5 rounded-full border border-card"
                                      unoptimized
                                    />
                                  )}
                                  {selectedPosition.token1?.imageUrl && (
                                    <Image
                                      src={selectedPosition.token1.imageUrl}
                                      alt={selectedPosition.token1.symbol}
                                      width={20}
                                      height={20}
                                      className="w-5 h-5 rounded-full border border-card"
                                      unoptimized
                                    />
                                  )}
                                </div>
                                <span>
                                  {selectedPosition.token0?.symbol}/
                                  {selectedPosition.token1?.symbol}
                                </span>
                              </div>
                            ) : (
                              "Select a position"
                            )}
                            <Icon icon="lucide:chevron-down" className="w-4 h-4"/>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-full">
                          {positions.map((pos, idx) => (
                            <DropdownMenuItem
                              key={idx}
                              onClick={() => setSelectedPosition(pos)}
                              className="flex items-center gap-2"
                            >
                              <div className="flex -space-x-1">
                                {pos.token0?.imageUrl && (
                                  <Image
                                    src={pos.token0.imageUrl}
                                    alt={pos.token0.symbol}
                                    width={20}
                                    height={20}
                                    className="w-5 h-5 rounded-full"
                                    unoptimized
                                  />
                                )}
                                {pos.token1?.imageUrl && (
                                  <Image
                                    src={pos.token1.imageUrl}
                                    alt={pos.token1.symbol}
                                    width={20}
                                    height={20}
                                    className="w-5 h-5 rounded-full"
                                    unoptimized
                                  />
                                )}
                              </div>
                              {pos.token0?.symbol}/{pos.token1?.symbol}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardContent>
                  </Card>

                  {selectedPosition && (
                    <>
                      {/* Position details */}
                      <Card className="bg-muted/50 border-border rounded-xl">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Your share
                            </span>
                            <span className="font-medium">
                              {selectedPosition.sharePercent}%
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {selectedPosition.token0?.symbol}
                            </span>
                            <span className="font-medium">
                              {formatCompactNumber(parseFloat(selectedPosition.token0Amount) || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {selectedPosition.token1?.symbol}
                            </span>
                            <span className="font-medium">
                              {formatCompactNumber(parseFloat(selectedPosition.token1Amount) || 0)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Amount slider */}
                      <Card className="bg-card/80 border-border rounded-2xl">
                        <CardContent className="p-4 space-y-4">
                          <Label className="text-sm text-muted-foreground">
                            Amount to Remove
                          </Label>
                          <div className="grid grid-cols-4 gap-2">
                            {["25", "50", "75", "100"].map((pct) => (
                              <Button
                                key={pct}
                                variant={
                                  removePercent === pct ? "default" : "outline"
                                }
                                size="sm"
                                onClick={() => setRemovePercent(pct)}
                                className="w-full"
                              >
                                {pct}%
                              </Button>
                            ))}
                          </div>

                          {/* Estimated return */}
                          <div className="pt-2 border-t border-border space-y-1">
                            <p className="text-xs text-muted-foreground">You will receive approximately:</p>
                            <div className="flex justify-between text-sm">
                              <span>{selectedPosition.token0?.symbol}</span>
                              <span className="font-medium">
                                {formatCompactNumber((parseFloat(selectedPosition.token0Amount) || 0) * parseInt(removePercent) / 100)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>{selectedPosition.token1?.symbol}</span>
                              <span className="font-medium">
                                {formatCompactNumber((parseFloat(selectedPosition.token1Amount) || 0) * parseInt(removePercent) / 100)}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Button 
                        onClick={handleRemoveLiquidity}
                        disabled={isRemovingLiquidity || parseFloat(tonBalance) < 0.1}
                        className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 h-14 rounded-xl font-bold text-lg"
                      >
                        {isRemovingLiquidity ? (
                          <ButtonLoader />
                        ) : parseFloat(tonBalance) < 0.1 ? (
                          "Insufficient TON for gas"
                        ) : (
                          `Remove ${removePercent}% Liquidity`
                        )}
                      </Button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </div>

      {/* Biometric Auth */}
      <BiometricAuth
        isOpen={isAuthOpen}
        onSuccess={handleAuthSuccess}
        onCancel={handleAuthCancel}
        title="Confirm Liquidity"
        description="Authenticate to add liquidity"
      />
    </div>
  );
}
