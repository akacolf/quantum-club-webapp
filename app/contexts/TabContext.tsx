"use client";
import { createContext, useContext, useState } from "react";

const TabContext = createContext<{ popupOpener: boolean; setPopupOpener: React.Dispatch<React.SetStateAction<boolean>> } | undefined>(undefined);

export function TabProvider({ children }: { children: React.ReactNode }) {
  const [popupOpener, setPopupOpener] = useState(false);

  return (
    <TabContext.Provider value={{ popupOpener, setPopupOpener }}>
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
