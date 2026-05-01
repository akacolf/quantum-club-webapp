import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function TasksSkeleton() {
    return (
    <div className="space-y-3 pr-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="bg-[#111] border-[#333]">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-6 rounded-full bg-[#222]" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-32 bg-[#222] rounded-md" />
                <Skeleton className="h-3 w-20 bg-[#222] rounded-md" />
              </div>
            </div>
            <div className="text-right">
              <Skeleton className="h-5 w-20 bg-[#222] rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
    )
}
