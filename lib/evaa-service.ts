import { Address, beginCell, type OpenedContract } from '@ton/core';
import { TonClient } from '@ton/ton';
import {
  EvaaMasterClassic,
  MAINNET_POOL_CONFIG,
  MAINNET_POOL_ASSETS_CONFIG,
  TON_MAINNET,
  type PoolAssetConfig,
  type ClassicSupplyWithdrawParameters,
} from '@evaafi/sdk';

const TONCENTER_ENDPOINT = 'https://toncenter.com/api/v2/jsonRPC';

const DECIMALS_MAP: Record<string, number> = {
  TON: 9,
  USDT: 6,
  jUSDT: 6,
  jUSDC: 6,
  stTON: 9,
  tsTON: 9,
  USDe: 18,
  tsUSDe: 18,
};

export interface LendingAsset {
  name: string;
  symbol: string;
  assetId: bigint;
  supplyApy: number;
  borrowApy: number;
  totalSupply: string;
  totalBorrow: string;
  availableLiquidity: string;
  decimals: number;
}

export interface UserPosition {
  assetName: string;
  supplied: string;
  borrowed: string;
  suppliedUsd: string;
  borrowedUsd: string;
}

export interface UserLendingData {
  positions: UserPosition[];
  healthFactor: number;
  totalSuppliedUsd: string;
  totalBorrowedUsd: string;
  netApy: number;
}

function getTonClient(): TonClient {
  return new TonClient({ endpoint: TONCENTER_ENDPOINT });
}

function getDecimals(name: string): number {
  return DECIMALS_MAP[name] ?? 9;
}

function formatUnits(value: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  if (fraction === 0n) return whole.toString();
  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole}.${fractionStr}`;
}

function findPoolAsset(assetName: string): PoolAssetConfig {
  const asset = MAINNET_POOL_ASSETS_CONFIG.find(
    (a) => a.name.toLowerCase() === assetName.toLowerCase()
  );
  if (!asset) {
    throw new Error(`Asset "${assetName}" not found in EVAA main pool`);
  }
  return asset;
}

export async function initEvaaMaster(): Promise<OpenedContract<EvaaMasterClassic>> {
  const client = getTonClient();
  const master = client.open(
    new EvaaMasterClassic({ poolConfig: MAINNET_POOL_CONFIG })
  );
  await master.getSync();
  return master;
}

export async function fetchLendingMarkets(): Promise<LendingAsset[]> {
  const master = await initEvaaMaster();
  const data = master.data;
  if (!data) {
    throw new Error('Failed to sync EVAA master contract data');
  }

  const { assetsData, assetsConfig, apy } = data;
  const assets: LendingAsset[] = [];

  for (const poolAsset of MAINNET_POOL_ASSETS_CONFIG) {
    const assetData = assetsData.get(poolAsset.assetId);
    const assetConfig = assetsConfig.get(poolAsset.assetId);
    if (!assetData || !assetConfig) continue;

    const decimals = getDecimals(poolAsset.name);
    const supplyApy = apy.supply.get(poolAsset.assetId) ?? assetData.supplyApy ?? 0;
    const borrowApy = apy.borrow.get(poolAsset.assetId) ?? assetData.borrowApy ?? 0;

    const totalSupplyRaw = assetData.totalSupply;
    const totalBorrowRaw = assetData.totalBorrow;
    const availableLiquidity = totalSupplyRaw > totalBorrowRaw
      ? totalSupplyRaw - totalBorrowRaw
      : 0n;

    assets.push({
      name: poolAsset.name,
      symbol: poolAsset.name,
      assetId: poolAsset.assetId,
      supplyApy,
      borrowApy,
      totalSupply: formatUnits(totalSupplyRaw, decimals),
      totalBorrow: formatUnits(totalBorrowRaw, decimals),
      availableLiquidity: formatUnits(availableLiquidity, decimals),
      decimals,
    });
  }

  return assets;
}

export async function fetchUserPositions(userAddress: string): Promise<UserLendingData> {
  const client = getTonClient();
  const master = client.open(
    new EvaaMasterClassic({ poolConfig: MAINNET_POOL_CONFIG })
  );
  await master.getSync();

  const data = master.data;
  if (!data) {
    throw new Error('Failed to sync EVAA master contract data');
  }

  const { assetsData, assetsConfig } = data;
  const prices = MAINNET_POOL_CONFIG.collector;
  const priceResult = await prices.getPrices(MAINNET_POOL_ASSETS_CONFIG);
  const pricesDict = priceResult.dict;

  const userContract = master.openUserContract(Address.parse(userAddress));
  const openedUser = client.open(userContract);

  await openedUser.getSync(assetsData, assetsConfig, pricesDict);

  const userData = openedUser.data;
  if (!userData || userData.type === 'inactive') {
    return {
      positions: [],
      healthFactor: Infinity,
      totalSuppliedUsd: '0',
      totalBorrowedUsd: '0',
      netApy: 0,
    };
  }

  const positions: UserPosition[] = [];
  let totalSuppliedUsd = 0n;
  let totalBorrowedUsd = 0n;
  let weightedSupplyApy = 0;
  let weightedBorrowApy = 0;

  const priceScale = MAINNET_POOL_CONFIG.masterConstants.ASSET_PRICE_SCALE;

  for (const poolAsset of MAINNET_POOL_ASSETS_CONFIG) {
    const balance = userData.balances.get(poolAsset.assetId);
    if (!balance) continue;

    const decimals = getDecimals(poolAsset.name);
    const price = pricesDict.get(poolAsset.assetId) ?? 0n;
    const assetDataEntry = assetsData.get(poolAsset.assetId);

    const supplied = balance.type === 'supply' ? balance.amount : 0n;
    const borrowed = balance.type === 'borrow' ? balance.amount : 0n;

    if (supplied === 0n && borrowed === 0n) continue;

    const suppliedUsd = price > 0n ? (supplied * price) / priceScale : 0n;
    const borrowedUsd = price > 0n ? (borrowed * price) / priceScale : 0n;

    totalSuppliedUsd += suppliedUsd;
    totalBorrowedUsd += borrowedUsd;

    if (assetDataEntry) {
      const supplyApy = data.apy.supply.get(poolAsset.assetId) ?? assetDataEntry.supplyApy ?? 0;
      const borrowApy = data.apy.borrow.get(poolAsset.assetId) ?? assetDataEntry.borrowApy ?? 0;
      weightedSupplyApy += supplyApy * Number(suppliedUsd);
      weightedBorrowApy += borrowApy * Number(borrowedUsd);
    }

    positions.push({
      assetName: poolAsset.name,
      supplied: formatUnits(supplied, decimals),
      borrowed: formatUnits(borrowed, decimals),
      suppliedUsd: formatUnits(suppliedUsd, decimals),
      borrowedUsd: formatUnits(borrowedUsd, decimals),
    });
  }

  const totalSupNum = Number(totalSuppliedUsd);
  const totalBorNum = Number(totalBorrowedUsd);
  const netApy = totalSupNum > 0
    ? (weightedSupplyApy / totalSupNum) - (totalBorNum > 0 ? weightedBorrowApy / totalBorNum : 0)
    : 0;

  return {
    positions,
    healthFactor: userData.healthFactor,
    totalSuppliedUsd: formatUnits(totalSuppliedUsd, 9),
    totalBorrowedUsd: formatUnits(totalBorrowedUsd, 9),
    netApy,
  };
}

export function buildSupplyParams(
  assetName: string,
  amount: bigint,
  userAddress: string
) {
  const asset = findPoolAsset(assetName);
  const payload = beginCell().endCell();

  return {
    asset,
    amount,
    queryID: BigInt(Date.now()),
    includeUserCode: true,
    userAddress: Address.parse(userAddress),
    payload,
  };
}

export function buildWithdrawParams(
  assetName: string,
  amount: bigint,
  userAddress: string
): ClassicSupplyWithdrawParameters {
  const withdrawAsset = findPoolAsset(assetName);
  const payload = beginCell().endCell();
  const addr = Address.parse(userAddress);

  return {
    queryID: BigInt(Date.now()),
    supplyAmount: 0n,
    supplyAsset: TON_MAINNET,
    withdrawAmount: amount,
    withdrawAsset,
    withdrawRecipient: addr,
    includeUserCode: true,
    payload,
  };
}
