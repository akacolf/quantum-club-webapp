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
        <Icon icon="lucide:file-question" className="w-16 h-16 text-blue-500" />

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Page not found</h1>
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
            Back home
            </Button>
        </Link>
      </div>
    </div>
  );
}
