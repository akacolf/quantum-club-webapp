import { Tabs, TabsList } from "@/components/ui/tabs";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TabsSwitch() {
  const pathname = usePathname();

  return (
<div className="w-full flex justify-center">
    <Tabs className="w-5/10">
      <TabsList className="flex bg-base-200 border border-white/10 rounded-lg mt-4 mb-5 mx-auto">
        <Link href="/home" className={`px-4 py-1 rounded-lg transition-all duration-300
            ${pathname === "/home" ? "border border-white/20 bg-base-200 text-white" : "bg-transparent text-white"}`}>Platform</Link>
        <Link href="/web3/wallet" className={`px-4 py-1 rounded-lg transition-all duration-300
            ${pathname === "/web3/wallet" ? "border border-white/20 bg-base-200 text-white" : "bg-transparent text-white"}`}>Web3</Link>
      </TabsList>
    </Tabs>
</div>
  );
}
