import SolveToEarnContent from "./Content";

export default async function SolveToEarn({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await searchParams;
  return <SolveToEarnContent key={s ?? "initial"} />;
}