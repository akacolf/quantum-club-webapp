import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TabsSwitch() {
  const pathname = usePathname();
  const currentTab = pathname.includes("/web3") ? "web3" : "platform";

  return (
    <div className="w-full flex justify-center mt-2 mb-4">
      <Tabs value={currentTab} className="w-auto">
        <TabsList className="h-11 bg-[#111] border border-[#333] rounded-xl p-1 gap-1">
          <TabsTrigger 
            value="platform" 
            asChild
            className="rounded-lg px-8 data-[state=active]:bg-[#222] data-[state=active]:text-white text-gray-500 hover:text-gray-300 cursor-pointer"
          >
            <Link href="/home">Platform</Link>
          </TabsTrigger>
          <TabsTrigger 
            value="web3" 
            asChild
            className="rounded-lg px-8 data-[state=active]:bg-[#222] data-[state=active]:text-white text-gray-500 hover:text-gray-300 cursor-pointer"
          >
            <Link href="/web3/wallet">Web3</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
