import { DemoLayout } from "@demo/lib/demo-layout";

/** Tester bar above every patient and provider page: src/app/(demo)/layout.tsx. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <DemoLayout>{children}</DemoLayout>;
}
