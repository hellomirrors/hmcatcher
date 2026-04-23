"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Pages where the back-to-Admin link should NOT appear.
const HIDDEN_PREFIXES = [
  "/admin",
  "/login",
  "/competition",
  "/c/",
  "/api/",
  "/slotmachine",
];

function shouldHide(pathname: string | null): boolean {
  if (!pathname || pathname === "/") {
    return true;
  }
  return HIDDEN_PREFIXES.some(
    (p) =>
      pathname === p || pathname.startsWith(`${p}/`) || pathname.startsWith(p)
  );
}

export function AdminCrumb() {
  const pathname = usePathname();
  if (shouldHide(pathname)) {
    return null;
  }
  return (
    <div className="border-b bg-background/80 px-4 py-2">
      <Link
        className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
        href="/admin"
      >
        <ChevronLeft className="size-4" />
        Admin
      </Link>
    </div>
  );
}
