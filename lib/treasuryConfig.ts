/**
 * Quantum Club Treasury Configuration
 * 
 * This file contains the treasury addresses and fee configurations
 * for the QC Wallet service.
 * 
 * FEE COLLECTION: Uses a smart contract (Fee Router) that:
 * 1. Receives the full transfer amount
 * 2. Deducts 0.5% service fee (kept in contract)
 * 3. Forwards remainder to recipient
 * 
 * This is more secure than multi-message transfers which get flagged.
 */

import { Address } from "@ton/core";

// QC Treasury address (quantumclub.ton)
// This is the OWNER of the Fee Router contract and receives withdrawn fees
export const QC_TREASURY_ADDRESS = "UQBUSXMd54HOJlmmh4TsuMvIcwB91kkIlz6HTgj62dN43S3U";
export const QC_TREASURY_ADDRESS_PARSED = Address.parse(QC_TREASURY_ADDRESS);

// Service fee percentage (0.5%)
export const QC_SERVICE_FEE_PERCENT = 0.5;

// Minimum service fee amount in TON (to avoid dust transactions)
export const MIN_SERVICE_FEE_TON = 0.000001;

/**
 * Calculate the QC service fee for a given amount
 * @param amount - The amount being transferred
 * @returns The service fee amount
 */
export function calculateServiceFee(amount: number): number {
  const fee = (amount * QC_SERVICE_FEE_PERCENT) / 100;
  return fee >= MIN_SERVICE_FEE_TON ? fee : 0;
}

/**
 * Calculate the recipient amount after fees
 * The Fee Router contract handles this, but we calculate for UI display
 * @param totalAmount - The total amount user wants to send
 * @param networkFee - Estimated network fee
 * @returns The amount the recipient will receive
 */
export function calculateRecipientAmount(totalAmount: number, networkFee: number = 0): number {
  const serviceFee = calculateServiceFee(totalAmount);
  const routerGas = 0.01; // Router reserves 0.01 TON for forwarding
  return totalAmount - serviceFee - networkFee - routerGas;
}

/**
 * Fee Router Smart Contract Addresses
 * 
 * The contract address is deterministically calculated from:
 * - The compiled contract code
 * - The initial data (owner = QC_TREASURY_ADDRESS, fee = 50 bps)
 * 
 * To deploy: Use ANY wallet with TON to pay gas.
 * The treasury will still be the owner who can withdraw fees.
 * 
 * Commands:
 *   npm run contract:compile
 *   npm run contract:deploy:testnet
 *   npm run contract:deploy:mainnet
 */

// Fee Router contract addresses (update after deployment)
export const FEE_ROUTER_ADDRESS_TESTNET = "EQCSl2odEWIwf6GdKuVHcacsrkPJJ3LnzvcX8dcO9QmgEveG";
export const FEE_ROUTER_ADDRESS_MAINNET = ""; // Deploy with: npm run contract:deploy:mainnet

export function getFeeRouterAddress(isTestnet: boolean): string {
  const address = isTestnet ? FEE_ROUTER_ADDRESS_TESTNET : FEE_ROUTER_ADDRESS_MAINNET;
  if (!address) {
    throw new Error(`Fee Router not deployed on ${isTestnet ? "testnet" : "mainnet"}. Run: npm run contract:deploy:${isTestnet ? "testnet" : "mainnet"}`);
  }
  return address;
}

export function isFeeRouterDeployed(isTestnet: boolean): boolean {
  const address = isTestnet ? FEE_ROUTER_ADDRESS_TESTNET : FEE_ROUTER_ADDRESS_MAINNET;
  return !!address && address.length > 10;
}
