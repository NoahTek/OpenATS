"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useCompany } from "@/hooks/queries/use-company";

const ALLOWED_WITHOUT_SETUP = /^\/settings\/general(\/|$)/;

export function SetupCompanyGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: companyData, isSuccess: companyReady } = useCompany();

  const hasCompany = companyData?.data != null;
  const needsSetup = companyReady && !hasCompany;

  useEffect(() => {
    if (!needsSetup) return;
    if (pathname && ALLOWED_WITHOUT_SETUP.test(pathname)) return;
    router.replace("/settings/general");
  }, [needsSetup, pathname, router]);

  return <>{children}</>;
}
