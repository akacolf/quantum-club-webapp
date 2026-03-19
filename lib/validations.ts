import { z } from "zod";

/** Reusable email field */
export const emailSchema = z
  .string()
  .min(1, "Please enter your email")
  .email("Please enter a valid email");

/** Reusable password field (login — any non-empty) */
export const passwordSchema = z.string().min(1, "Please enter your password");

/** Reusable new password field (signup — min 6 chars) */
export const newPasswordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters");

// ---- Form schemas ----

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type LoginFormData = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    email: emailSchema,
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type SignupFormData = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const createGroupSchema = z.object({
  name: z
    .string()
    .min(1, "Please enter a group name")
    .max(30, "Group name must be 30 characters or less"),
  description: z
    .string()
    .max(100, "Description must be 100 characters or less"),
  nftGated: z.boolean(),
  nftCollection: z.string(),
  nftCollectionName: z.string(),
}).refine(
  (data) => !data.nftGated || (data.nftCollection && data.nftCollection.length > 0),
  { message: "Please select a collection for NFT gating", path: ["nftCollection"] },
);
export type CreateGroupFormData = z.infer<typeof createGroupSchema>;

export const pollSchema = z.object({
  question: z.string().min(1, "Question is required").max(200),
  options: z
    .array(z.object({ value: z.string().max(100), id: z.string() }))
    .min(2)
    .max(4),
});
export type PollFormData = z.infer<typeof pollSchema>;

export const addressBookSchema = z.object({
  name: z.string().min(1, "Please enter a name"),
  address: z.string().min(1, "Please enter an address"),
});
export type AddressBookFormData = z.infer<typeof addressBookSchema>;

export const createTokenSchema = z.object({
  name: z
    .string()
    .min(1, "Token name is required")
    .max(32, "Token name must be 32 characters or less"),
  symbol: z
    .string()
    .min(1, "Token symbol is required")
    .max(10, "Token symbol must be 10 characters or less")
    .regex(/^[A-Za-z0-9]+$/, "Token symbol can only contain letters and numbers"),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less"),
  initialBuyAmount: z
    .string()
    .refine(
      (v) => !v || v === "" || v === "0" || (!isNaN(Number(v)) && Number(v) >= 0.1),
      "Minimum initial buy is 0.1 TON",
    )
    .refine(
      (v) => !v || v === "" || v === "0" || (!isNaN(Number(v)) && Number(v) <= 100),
      "Maximum initial buy is 100 TON",
    ),
});
export type CreateTokenFormData = z.infer<typeof createTokenSchema>;

// ---- Shared username constants & schema ----

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const USERNAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/;
export const RESERVED_USERNAMES = [
  "admin", "support", "help", "quantum", "quantumclub", "qc", "system",
  "root", "official", "team", "mod", "moderator", "bot", "wallet",
  "send", "receive", "swap", "trade", "stake", "earn", "null", "undefined",
];

export const usernameSchema = z
  .string()
  .min(USERNAME_MIN_LENGTH, `Minimum ${USERNAME_MIN_LENGTH} characters`)
  .max(USERNAME_MAX_LENGTH, `Maximum ${USERNAME_MAX_LENGTH} characters`)
  .regex(USERNAME_REGEX, "Letters, numbers, dots, underscores & hyphens only")
  .refine((val) => !RESERVED_USERNAMES.includes(val.toLowerCase()), {
    message: "This username is reserved",
  });

// ---- Form schemas ----

export const sendQntmSchema = z.object({
  recipientQcId: z.string().min(1, "Please enter a QC ID"),
  amount: z
    .string()
    .min(1, "Please enter an amount")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Amount must be greater than 0"),
});
export type SendQntmFormData = z.infer<typeof sendQntmSchema>;

export const sendNftSchema = z.object({
  recipient: z
    .string()
    .min(1, "Please enter a recipient address"),
});
export type SendNftFormData = z.infer<typeof sendNftSchema>;

export const linkEmailSchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
});
export type LinkEmailFormData = z.infer<typeof linkEmailSchema>;

export const stakeAmountSchema = z.object({
  amount: z
    .string()
    .min(1, "Please enter an amount")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Amount must be greater than 0"),
});
export type StakeAmountFormData = z.infer<typeof stakeAmountSchema>;

export const walletRenameSchema = z.object({
  name: z.string().min(1, "Please enter a wallet name").max(30, "Name must be 30 characters or less"),
});
export type WalletRenameFormData = z.infer<typeof walletRenameSchema>;

export const nftLaunchSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less"),
  price: z.string(),
  royalty: z.string(),
});
export type NftLaunchFormData = z.infer<typeof nftLaunchSchema>;

export const nftListingPriceSchema = z.object({
  price: z
    .string()
    .min(1, "Please enter a price")
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 0.1, "Minimum price is 0.1 TON"),
});
export type NftListingPriceFormData = z.infer<typeof nftListingPriceSchema>;

export const priceAlertSchema = z.object({
  symbol: z.string().min(1, "Please select a token"),
  targetPrice: z
    .string()
    .min(1, "Please enter a target price")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Price must be greater than 0"),
  direction: z.enum(["above", "below"]),
});
export type PriceAlertFormData = z.infer<typeof priceAlertSchema>;

export const chatTransferSchema = z.object({
  amount: z
    .string()
    .min(1, "Please enter an amount")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Amount must be greater than 0"),
  address: z.string(),
});
export type ChatTransferFormData = z.infer<typeof chatTransferSchema>;

export const walletImportSchema = z.object({
  seedPhrase: z.array(z.string().min(1, "Word is required")).length(24, "All 24 words are required"),
  walletVersion: z.enum(["v5r1", "v4r2", "v3r2"]),
});
export type WalletImportFormData = z.infer<typeof walletImportSchema>;

export const walletVerifySchema = z.object({
  word0: z.string().min(1, "Please enter the word"),
  word1: z.string().min(1, "Please enter the word"),
  word2: z.string().min(1, "Please enter the word"),
});
export type WalletVerifyFormData = z.infer<typeof walletVerifySchema>;

// ---- API route schemas ----

export const checkExistingUserSchema = z.object({
  email: z.string().email().optional(),
  qcId: z.string().min(1).max(100).optional(),
}).refine((d) => d.email || d.qcId, { message: "Provide email or qcId" });

export const graduateSchema = z.object({
  tokenId: z.string().min(1, "Token ID is required"),
  dexPoolAddress: z.string().optional(),
  jettonMasterAddress: z.string().optional(),
});

export const checkSymbolSchema = z.object({
  symbol: z.string().min(1).max(10),
});

export const uploadImageSchema = z.object({
  tokenId: z.string().min(1, "Token ID is required"),
  imageData: z.string().min(1, "Image data is required"),
});

export const analyzeTokenSchema = z.object({
  tokenAddress: z.string().min(1, "Token address is required"),
  tokenData: z.object({
    name: z.string().optional(),
    symbol: z.string().optional(),
    price: z.union([z.string(), z.number()]).optional(),
    marketCap: z.union([z.string(), z.number()]).optional(),
    volume24h: z.union([z.string(), z.number()]).optional(),
    holders: z.union([z.string(), z.number()]).optional(),
    createdAt: z.string().optional(),
  }).optional(),
});

export const explainTransactionSchema = z.object({
  hash: z.string().min(1, "Transaction hash is required"),
  type: z.string().optional().default(""),
  amount: z.string().optional().default(""),
  from: z.string().optional().default(""),
  to: z.string().optional().default(""),
});

export const portfolioHealthSchema = z.object({
  assets: z.array(z.object({
    symbol: z.string(),
    balance: z.union([z.string(), z.number()]),
    value: z.union([z.string(), z.number()]).optional(),
  })).min(1, "Portfolio assets are required"),
  totalValue: z.union([z.string(), z.number()]).optional(),
  stakedAmount: z.union([z.string(), z.number()]).optional(),
});

// ---- Submit-boundary schemas for complex forms ----

/** TON send validation */
export const tonSendSchema = z.object({
  recipient: z.string().min(1, "Please enter a recipient address or .ton domain"),
  resolvedAddress: z.string().min(1, "Invalid recipient address"),
  amount: z
    .string()
    .min(1, "Please enter a valid amount")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Please enter a valid amount"),
});

/** Multi-chain send validation */
export const multiChainSendSchema = z.object({
  recipient: z.string().min(1, "Please enter a recipient address"),
  amount: z
    .string()
    .min(1, "Please enter a valid amount")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Please enter a valid amount"),
});

/** Swap validation */
export const swapSchema = z.object({
  amount: z
    .string()
    .min(1, "Please enter an amount")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Please enter a valid amount"),
  fromAsset: z.string().min(1, "Please select a source asset"),
  toAsset: z.string().min(1, "Please select a destination asset"),
});

/** Liquidity add validation */
export const addLiquiditySchema = z.object({
  tokenA: z.string().min(1, "Please select token A"),
  tokenB: z.string().min(1, "Please select token B"),
  amountA: z
    .string()
    .min(1, "Please enter an amount for token A")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Amount A must be greater than 0"),
});

/** Liquidity remove validation */
export const removeLiquiditySchema = z.object({
  position: z.string().min(1, "Please select a position to remove"),
  percent: z
    .string()
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0 && Number(v) <= 100, "Select a valid percentage"),
});

/** Farming stake validation */
export const farmStakeSchema = z.object({
  amount: z
    .string()
    .min(1, "Please enter an amount")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Amount must be greater than 0"),
});

/** Lending supply/withdraw validation */
export const lendingSchema = z.object({
  asset: z.string().min(1, "Please select an asset"),
  amount: z
    .string()
    .min(1, "Please enter an amount")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Amount must be greater than 0"),
});

/** Trade (buy/sell) validation */
export const tradeAmountSchema = z.object({
  amount: z
    .string()
    .min(1, "Please enter an amount")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Please enter a valid amount"),
});

/** Chat DM validation */
export const chatDmSchema = z.object({
  username: z.string().min(1, "Enter a QC username"),
});

/** Chat group creation validation */
export const chatGroupSchema = z.object({
  name: z.string().min(1, "Group name required").max(50, "Group name must be 50 characters or less"),
});

/** Chat join group validation */
export const chatJoinSchema = z.object({
  code: z.string().length(6, "Enter 6-character code"),
});

/** Token community chat creation */
export const createTokenCommunityChatSchema = z.object({
  tokenId: z.string().min(1, "Token ID is required"),
  tokenSymbol: z.string().min(1, "Token symbol is required"),
  tokenName: z.string().min(1, "Token name is required"),
});
