"use client";
import { createContext, useContext, useState } from "react";

const TabContext = createContext<{ loadingTab: boolean; setLoadingTab: React.Dispatch<React.SetStateAction<boolean>> } | undefined>(undefined);

export function TabProvider({ children }: { children: React.ReactNode }) {
  const [loadingTab, setLoadingTab] = useState(false);

  return (
    <TabContext.Provider value={{ loadingTab, setLoadingTab }}>
      {children}
    </TabContext.Provider>
  );
}

export function useTab() {
  const context = useContext(TabContext);
  if (context === undefined) {
    throw new Error("");
  }
  return context;
}
