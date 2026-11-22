"use client";

// Renders the app's own page files (src/app/...) in the browser. On the server they are async components
// that load data; here the same functions run against the phone's copy of the data, and run again whenever
// it changes (the browser's stand-in for revalidatePath).

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { installExtractRoute } from "./extract";
import { setRouter } from "./navigation";
import { getVersion, subscribe } from "./store";

const load = {
  start: () => import("@/app/page"),
  patient: () => import("@/app/(demo)/patient/page"),
  checkin: () => import("@/app/(demo)/patient/checkin/page"),
  onboarding: () => import("@/app/(demo)/patient/onboarding/page"),
  provider: () => import("@/app/(demo)/provider/page"),
  snapshot: () => import("@/app/(demo)/provider/snapshot/[id]/page"),
};

export type PageName = keyof typeof load;

async function render(page: PageName, query: URLSearchParams, id: string | undefined): Promise<ReactNode> {
  switch (page) {
    case "start":
      return (await load.start()).default();
    case "patient":
      return (await load.patient()).default();
    case "checkin":
      return (await load.checkin()).default({ searchParams: Promise.resolve({ mode: query.get("mode") ?? undefined }) });
    case "onboarding":
      return (await load.onboarding()).default();
    case "provider":
      return (await load.provider()).default();
    case "snapshot":
      return (await load.snapshot()).default({
        params: Promise.resolve({ id: id ?? "" }),
        searchParams: Promise.resolve({ view: query.get("view") ?? undefined }),
      });
  }
}

/** Runs one of the app's async server components in the browser, and again whenever the demo data changes. */
export function useAppElement(run: () => Promise<ReactNode>, deps: unknown[]): ReactNode {
  const version = useSyncExternalStore(subscribe, getVersion, getVersion);
  const router = useRouter();
  const [result, setResult] = useState<{ node: ReactNode } | { error: unknown } | null>(null);

  useEffect(() => {
    setRouter(router);
    installExtractRoute();
  }, [router]);

  useEffect(() => {
    let current = true;
    run().then(
      (node) => current && setResult({ node }),
      (error) => current && setResult({ error }),
    );
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run when the data or the page changes
  }, [version, ...deps]);

  // notFound() and redirect() from the app's pages end up here; Next.js handles them as usual.
  if (result && "error" in result) throw result.error;
  return result ? result.node : null;
}

export function RealPage({ page, id }: { page: PageName; id?: string }) {
  const query = useSearchParams().toString();

  // Fetch the other pages' code in the background, so moving between pages is instant.
  useEffect(() => {
    const t = setTimeout(() => Object.values(load).forEach((l) => l().catch(() => {})), 1500);
    return () => clearTimeout(t);
  }, []);

  return useAppElement(() => render(page, new URLSearchParams(query), id), [page, query, id]);
}
