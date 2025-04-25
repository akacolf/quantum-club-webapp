"use server"
import { doc, getDoc } from "firebase/firestore";
import { dbfs } from "@/app/firebase/firebaseConfig";

export async function getMaintenance() {
    const setRef = doc(dbfs, "set","settings");
      const snapshotSet = await getDoc(setRef);
      const maintenance = snapshotSet?.data()?.maintenance_mode;
      return maintenance;
}