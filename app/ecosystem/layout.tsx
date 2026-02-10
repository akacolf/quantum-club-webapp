"use client";

import EcosystemNavigation from "./(navigation)/EcosystemNavigation";

export default function EcosystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="ecosystem-app">
      {children}
      <EcosystemNavigation />
    </div>
  );
}
