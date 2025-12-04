/**
 * Quantum Club Fee Router Contract Wrapper
 * 
 * This module provides TypeScript interfaces for interacting with
 * the QC Fee Router smart contract on TON blockchain.
 * 
 * The contract handles fee collection in a single transaction:
 * 1. User sends TON to the router with recipient address
 * 2. Router deducts 0.5% fee
 * 3. Router forwards the remainder to recipient
 * 
 * This avoids the "suspicious" multi-message pattern that explorers flag.
 */

import { Address, beginCell, Cell, Contract, ContractProvider, Sender, SendMode, toNano, contractAddress } from "@ton/core";

// Operation codes matching the smart contract
export const FeeRouterOpcodes = {
  route: 0x526f7574,        // "Rout" - route payment
  withdrawFees: 0x57647261, // "Wdra" - owner withdraw fees
  updateFee: 0x55706466,    // "Updf" - owner update fee %
  updateOwner: 0x55706f77,  // "Upow" - transfer ownership
} as const;

export interface FeeRouterConfig {
  ownerAddress: Address;
  feeBps: number; // Basis points (50 = 0.5%)
}

export function feeRouterConfigToCell(config: FeeRouterConfig): Cell {
  return beginCell()
    .storeAddress(config.ownerAddress)
    .storeUint(config.feeBps, 16)
    .storeUint(0, 128) // initial total_fees_collected = 0
    .endCell();
}

export class FeeRouter implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  static createFromAddress(address: Address) {
    return new FeeRouter(address);
  }

  static createFromConfig(config: FeeRouterConfig, code: Cell, workchain = 0) {
    const data = feeRouterConfigToCell(config);
    const init = { code, data };
    return new FeeRouter(contractAddress(workchain, init), init);
  }

  /**
   * Route a payment through the fee router
   * @param provider - Contract provider
   * @param via - Sender wallet
   * @param recipient - Final recipient address
   * @param amount - Amount to send (fee will be deducted from this)
   * @param comment - Optional comment to forward
   */
  async sendRoute(
    provider: ContractProvider,
    via: Sender,
    recipient: Address,
    amount: bigint,
    comment?: string
  ) {
    let body = beginCell()
      .storeUint(FeeRouterOpcodes.route, 32)
      .storeAddress(recipient);
    
    if (comment && comment.length > 0) {
      // Add comment as text cell
      body = body.storeUint(0, 32).storeStringTail(comment);
    }

    await provider.internal(via, {
      value: amount,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: body.endCell(),
    });
  }

  /**
   * Owner withdraws collected fees
   */
  async sendWithdrawFees(provider: ContractProvider, via: Sender) {
    await provider.internal(via, {
      value: toNano("0.01"),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(FeeRouterOpcodes.withdrawFees, 32)
        .endCell(),
    });
  }

  /**
   * Owner updates the fee percentage
   * @param newFeeBps - New fee in basis points (50 = 0.5%, max 500 = 5%)
   */
  async sendUpdateFee(provider: ContractProvider, via: Sender, newFeeBps: number) {
    if (newFeeBps > 500) throw new Error("Fee cannot exceed 5% (500 bps)");
    
    await provider.internal(via, {
      value: toNano("0.01"),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(FeeRouterOpcodes.updateFee, 32)
        .storeUint(newFeeBps, 16)
        .endCell(),
    });
  }

  /**
   * Owner transfers contract ownership
   */
  async sendUpdateOwner(provider: ContractProvider, via: Sender, newOwner: Address) {
    await provider.internal(via, {
      value: toNano("0.01"),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(FeeRouterOpcodes.updateOwner, 32)
        .storeAddress(newOwner)
        .endCell(),
    });
  }

  // Getters

  async getFeeBps(provider: ContractProvider): Promise<number> {
    const result = await provider.get("get_fee_bps", []);
    return result.stack.readNumber();
  }

  async getTotalFeesCollected(provider: ContractProvider): Promise<bigint> {
    const result = await provider.get("get_total_fees_collected", []);
    return result.stack.readBigNumber();
  }

  async getOwner(provider: ContractProvider): Promise<Address> {
    const result = await provider.get("get_owner", []);
    return result.stack.readAddress();
  }

  async calculateFee(provider: ContractProvider, amount: bigint): Promise<bigint> {
    const result = await provider.get("calculate_fee", [
      { type: "int", value: amount },
    ]);
    return result.stack.readBigNumber();
  }
}

/**
 * Build a route message body for manual transaction building
 */
export function buildRouteMessageBody(recipient: Address, comment?: string): Cell {
  let body = beginCell()
    .storeUint(FeeRouterOpcodes.route, 32)
    .storeAddress(recipient);
  
  if (comment && comment.length > 0) {
    body = body.storeUint(0, 32).storeStringTail(comment);
  }

  return body.endCell();
}

/**
 * Calculate the expected recipient amount after fees
 * @param amount - Total amount being sent (in nanoTON)
 * @param feeBps - Fee in basis points (default 50 = 0.5%)
 * @returns Object with fee and recipient amounts
 */
export function calculateRouterAmounts(amount: bigint, feeBps: number = 50) {
  const fee = (amount * BigInt(feeBps)) / BigInt(10000);
  const gasReserve = toNano("0.01"); // 0.01 TON for gas
  const recipientAmount = amount - fee - gasReserve;
  
  return {
    fee,
    gasReserve,
    recipientAmount: recipientAmount > BigInt(0) ? recipientAmount : BigInt(0),
    totalDeducted: fee + gasReserve,
  };
}
