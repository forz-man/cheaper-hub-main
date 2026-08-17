"use client";

import { usePathname } from "next/navigation";

// List the routes where you DO NOT want the Navbar or Footer to appear
const hideOnRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];

export function NavbarWrapper() {
  const pathname = usePathname();
  
  if (hideOnRoutes.includes(pathname)) return null;

  return (
    <header className="p-4 bg-gray-100 border-b">
      {/* TODO: Import and render your actual Navbar component here */}
      <nav className="font-bold">Cheaper Navbar placeholder</nav>
    </header>
  );
}

export function FooterWrapper() {
  const pathname = usePathname();
  
  if (hideOnRoutes.includes(pathname)) return null;

  return (
    <footer className="p-4 bg-gray-100 border-t mt-auto">
      {/* TODO: Import and render your actual Footer component here */}
      <p className="text-sm">Cheaper Footer placeholder</p>
    </footer>
  );
}
