"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import CommandPalette from "@/components/CommandPalette";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route changes automatically
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Support hotkey '[' or 'Escape' to toggle/close sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "[" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setIsSidebarOpen(prev => !prev);
      }
      if (e.key === "Escape" && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarOpen]);

  return (
    <div className={`shell ${isSidebarOpen ? "sidebar-open" : ""}`}>
      {/* Backdrop overlay for on-demand drawer */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? "open" : ""}`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Off-canvas collapsible sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {/* Main Topbar with Menu toggle trigger */}
      <Topbar 
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} 
        isSidebarOpen={isSidebarOpen} 
      />

      {/* Full-width Main Content */}
      <main className="content">
        {children}
      </main>

      <CommandPalette />
    </div>
  );
}
