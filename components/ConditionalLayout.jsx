"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";

/**
 * Routes that manage their own navigation (sidebar, inline nav, or focused
 * checkout flow).  The global Navbar and Footer are suppressed for these.
 */
function isSuppressed(pathname) {
  return (
    pathname === "/checkout" ||
    pathname === "/order-success" ||
    pathname.startsWith("/order-success/") ||
    pathname.startsWith("/products/")   // detail pages have their own inline nav
  );
}

export function NavbarWrapper() {
  const pathname = usePathname();
  if (isSuppressed(pathname)) return null;
  return <Navbar />;
}

export function FooterWrapper() {
  const pathname = usePathname();
  if (isSuppressed(pathname)) return null;
  return <Footer />;
}
