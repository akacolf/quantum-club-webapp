import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TabsSwitchProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function TabsSwitch({ activeTab, onTabChange }: TabsSwitchProps) {
  return (
    <div className="w-full flex justify-center mt-2 mb-4">
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-auto">
        <TabsList className="h-11 bg-[#111] border border-[#333] rounded-xl p-1 gap-1">
          <TabsTrigger 
            value="platform" 
            className="rounded-lg px-8 data-[state=active]:bg-[#222] data-[state=active]:text-white text-gray-500 hover:text-gray-300 cursor-pointer"
          >
            Platform
          </TabsTrigger>
          <TabsTrigger 
            value="wallet" 
            disabled
            className="rounded-lg px-8 data-[state=active]:bg-[#222] data-[state=active]:text-white text-gray-500 hover:text-gray-300 cursor-not-allowed opacity-50"
          >
            Wallet
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
