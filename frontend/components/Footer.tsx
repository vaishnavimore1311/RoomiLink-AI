"use client";

import React from "react";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  // Hide public footer when inside admin operations
  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
      <p>&copy; 2026 RoomiLink AI. Beyond Finding a Room, Building Compatible Shared Living.</p>
    </footer>
  );
}
