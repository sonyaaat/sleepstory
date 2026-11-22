"use client";

// The app's own (demo) layout (src/app/(demo)/layout.tsx), which puts the tester bar above every patient
// and provider page.

import { createContext, useContext, type ReactNode } from "react";
import { useAppElement } from "./real-page";

// The page goes in through context, so moving between pages doesn't re-run the layout.
const PageSlot = createContext<ReactNode>(null);

function CurrentPage() {
  return <>{useContext(PageSlot)}</>;
}

const currentPage = <CurrentPage />;

export function DemoLayout({ children }: { children: ReactNode }) {
  const layout = useAppElement(async () => (await import("@/app/(demo)/layout")).default({ children: currentPage }), []);
  return <PageSlot.Provider value={children}>{layout}</PageSlot.Provider>;
}
