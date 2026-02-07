import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";

export default function NotFound() {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-black text-white overflow-hidden">
       {/* Background Gradients */}
       <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-md w-full">
        <div className="w-24 h-24 bg-blue-500/10 rounded-3xl flex items-center justify-center border border-blue-500/20 shadow-[0_0_30px_-10px_rgba(59,130,246,0.3)]">
          <Icon icon="lucide:file-question" className="w-12 h-12 text-blue-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Page Not Found</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            The page you are looking for doesn&apos;t exist <br />
            or has been moved.
          </p>
        </div>

        <Link href="/" className="w-full">
            <Button 
            className="w-full bg-white text-black hover:bg-gray-200 font-medium h-12 rounded-xl transition-all duration-200"
            >
            <Icon icon="lucide:home" className="w-4 h-4 mr-2" />
            Back Home
            </Button>
        </Link>
      </div>
    </div>
  );
}
