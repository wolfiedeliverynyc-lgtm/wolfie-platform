"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import CommandPalette from "@/components/CommandPalette";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();
  const isMenuPage = pathname === "/menu";

  if (isMenuPage) {
    return <div className="menu-dark-theme min-h-screen bg-[#0b0b0c] text-white overflow-x-hidden">{children}</div>;
  }

  return (
    <div className="shell">
      <Sidebar />
      <Topbar />
      <main className="content">{children}</main>
      <CommandPalette />
    </div>
  );
}
