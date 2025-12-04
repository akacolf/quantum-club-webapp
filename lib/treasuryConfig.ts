/**
 * Quantum Club Treasury Configuration
 * 
 * This file contains the treasury addresses and fee configurations
 * for the QC Wallet service.
 */

import { Address } from "@ton/core";

// QC Treasury address (quantumclub.ton)
// This is where all service fees are sent
export const QC_TREASURY_ADDRESS = "UQBUSXMd54HOJlmmh4TsuMvIcwB91kkIlz6HTgj62dN43S3U";
export const QC_TREASURY_ADDRESS_PARSED = Address.parse(QC_TREASURY_ADDRESS);

// Service fee percentage (0.5%)
export const QC_SERVICE_FEE_PERCENT = 0.5;

// Minimum service fee amount in TON (to avoid dust transactions)
export const MIN_SERVICE_FEE_TON = 0.000001;

// Service fee comment for tracking
export const SERVICE_FEE_COMMENT = "QC Service Fee";

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
 * Check if service fee should be applied
 * @param fee - The calculated fee
 * @returns Whether the fee should be applied
 */
export function shouldApplyServiceFee(fee: number): boolean {
  return fee > MIN_SERVICE_FEE_TON;
}

/**
 * Calculate the recipient amount after fees
 * @param amount - The total amount
 * @param serviceFee - The service fee
 * @param networkFee - The network fee (for TON transfers)
 * @returns The amount the recipient will receive
 */
export function calculateRecipientAmount(
  amount: number, 
  serviceFee: number, 
  networkFee: number = 0
): number {
  return amount - serviceFee - networkFee;
}
