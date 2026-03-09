import type { Metadata } from "next";
import { firestore } from "@/app/(firebase)/server";
import UserProfileClient from "./UserProfileClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;

  try {
    const userDoc = await firestore.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return {
        title: "User Not Found | Quantum Club",
        description: "This user could not be found on Quantum Club.",
      };
    }

    const user = userDoc.data()!;
    const displayName = user.qcUsername || user.username || "Quantum User";
    const title = `@${displayName} | Quantum Club`;
    const description = `View ${displayName}'s profile on Quantum Club`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
      },
    };
  } catch (error) {
    console.error("Failed to fetch user metadata:", error);
    return {
      title: "Profile | Quantum Club",
      description: "View user profiles on Quantum Club.",
    };
  }
}

export default function UserProfilePage() {
  return <UserProfileClient />;
}
