import { useQuery } from "@tanstack/react-query";
import { dbfs } from "@/app/(firebase)/client";
import { doc, getDoc } from "firebase/firestore";

export interface UserProfile {
  displayName: string;
  memberSince: string | null;
}

function parseCreatedAt(userArray: string | undefined): string | null {
  if (!userArray) return null;
  const match = userArray.match(/createdAt=([^&]+)/);
  return match ? match[1] : null;
}

async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const userDoc = await getDoc(doc(dbfs, "user", userId));
  if (!userDoc.exists()) return null;

  const data = userDoc.data();
  const displayName = data.qcUsername || data.username || "Quantum User";

  let memberSince: string | null = null;
  const createdAt = parseCreatedAt(data.userArray);
  if (createdAt) {
    const date = new Date(isNaN(Number(createdAt)) ? createdAt : Number(createdAt));
    memberSince = date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }

  return { displayName, memberSince };
}

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-profile", userId],
    queryFn: () => fetchUserProfile(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
