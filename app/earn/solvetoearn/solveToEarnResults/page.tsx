import SolveToEarnResults from "./Content";

export default async function SolveToEarnResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await searchParams;
  return <SolveToEarnResults key={s ?? "initial"} />;
}
