import type { Metadata } from "next";
import UserProfileClient from "./UserProfileClient";

export const metadata: Metadata = {
  title: "Profile | Quantum Club",
  description: "View user profiles on Quantum Club.",
};

export default function UserProfilePage() {
  return <UserProfileClient />;
}
