"use server";

import { z } from "zod";
import { env } from "@/env";
import { actionClient } from "@/lib/safe-action";

const tonApiRateSchema = z.object({
  prices: z.record(z.string(), z.number()).optional(),
  diff_24h: z.record(z.string(), z.string()).optional(),
});

const tonApiRatesSchema = z.object({
  rates: z.record(z.string(), tonApiRateSchema).optional(),
});

const cryptoGlobalSchema = z.object({
  data: z.object({
    total_market_cap: z.object({
      usd: z.number().optional(),
    }),
    market_cap_change_percentage_24h_usd: z.number().optional(),
  }),
});

const fearGreedSchema = z.object({
  data: z
    .array(
      z.object({
        value: z.string().optional(),
        value_classification: z.string().optional(),
      })
    )
    .optional(),
});

const marketPulseSchema = z.object({
  ton: z.object({
    symbol: z.literal("TON"),
    price: z.number(),
    change24h: z.string(),
  }),
  totalMarketCapUsd: z.number().nullable(),
  totalMarketCapChange24h: z.number().nullable(),
  fearGreed: z
    .object({
      value: z.number(),
      classification: z.string(),
    })
    .nullable(),
});

export type MarketPulseData = z.infer<typeof marketPulseSchema>;

function getRate(
  rates: z.infer<typeof tonApiRatesSchema>["rates"],
  symbol: string
) {
  return rates?.[symbol] ?? rates?.[symbol.toUpperCase()];
}

export const fetchMarketPulse = actionClient.action(async () => {
  const [ratesRes, globalRes, fearGreedRes] = await Promise.all([
    fetch(
      "https://tonapi.io/v2/rates?tokens=ton&currencies=usd",
      {
        headers: env.TONAPI_KEY
          ? { Authorization: `Bearer ${env.TONAPI_KEY}` }
          : undefined,
        next: { revalidate: 60 },
      }
    ),
    fetch("https://api.coingecko.com/api/v3/global", {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    }),
    fetch("https://api.alternative.me/fng/?limit=1&format=json", {
      next: { revalidate: 60 },
    }),
  ]);

  if (!ratesRes.ok) {
    throw new Error(`TonAPI rates failed with ${ratesRes.status}`);
  }

  const ratesJson = tonApiRatesSchema.parse(await ratesRes.json());
  const globalJson = globalRes.ok
    ? cryptoGlobalSchema.parse(await globalRes.json())
    : null;
  const fearGreedJson = fearGreedRes.ok
    ? fearGreedSchema.parse(await fearGreedRes.json())
    : null;

  const tonRate = getRate(ratesJson.rates, "ton");

  const fearGreed = fearGreedJson?.data?.[0];

  return marketPulseSchema.parse({
    ton: {
      symbol: "TON",
      price: tonRate?.prices?.USD ?? 0,
      change24h: tonRate?.diff_24h?.USD ?? "0%",
    },
    totalMarketCapUsd: globalJson?.data.total_market_cap.usd ?? null,
    totalMarketCapChange24h:
      globalJson?.data.market_cap_change_percentage_24h_usd ?? null,
    fearGreed: fearGreed?.value
      ? {
          value: Number(fearGreed.value),
          classification: fearGreed.value_classification ?? "Neutral",
        }
      : null,
  });
});
