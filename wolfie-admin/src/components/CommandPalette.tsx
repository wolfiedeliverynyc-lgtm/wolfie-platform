"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDashboardStore } from "@/stores/dashboardStore";

interface CommandItem {
  id: string;
  category: "Navigation" | "Operations" | "System";
  label: string;
  shortcut?: string;
  action: () => void;
}

export default function CommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    retrainWapModel,
    toggleWapFallback,
    clearActivityFeed,
    alerts,
    acknowledgeAlert,
    addActivity
  } = useDashboardStore();

  const closePalette = () => {
    setIsOpen(false);
    setSearch("");
  };

  // Define commands list
  const commands = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [
      // Navigation
      {
        id: "nav-overview",
        category: "Navigation",
        label: "Go to Overview Dashboard",
        shortcut: "⌥O",
        action: () => {
          router.push("/");
          closePalette();
        }
      },
      {
        id: "nav-orders",
        category: "Navigation",
        label: "Go to Orders & Dispatch Queue",
        shortcut: "⌥D",
        action: () => {
          router.push("/admin/orders");
          closePalette();
        }
      },
      {
        id: "nav-drivers",
        category: "Navigation",
        label: "Go to Drivers Fleet Management",
        shortcut: "⌥V",
        action: () => {
          router.push("/drivers");
          closePalette();
        }
      },
      {
        id: "nav-map",
        category: "Navigation",
        label: "Go to Live Map Tracking",
        shortcut: "⌥M",
        action: () => {
          router.push("/admin/map");
          closePalette();
        }
      },
      {
        id: "nav-zones",
        category: "Navigation",
        label: "Go to Zone Demand Density",
        shortcut: "⌥Z",
        action: () => {
          router.push("/zones");
          closePalette();
        }
      },
      {
        id: "nav-merchants",
        category: "Navigation",
        label: "Go to Merchant Operations",
        shortcut: "⌥R",
        action: () => {
          router.push("/merchants");
          closePalette();
        }
      },
      {
        id: "nav-finance",
        category: "Navigation",
        label: "Go to Finance & Payout Ledger",
        shortcut: "⌥F",
        action: () => {
          router.push("/finance");
          closePalette();
        }
      },
      {
        id: "nav-analytics",
        category: "Navigation",
        label: "Go to Operations Analytics",
        shortcut: "⌥A",
        action: () => {
          router.push("/analytics");
          closePalette();
        }
      },
      {
        id: "nav-alerts",
        category: "Navigation",
        label: "Go to Incident Alerts Console",
        shortcut: "⌥L",
        action: () => {
          router.push("/alerts");
          closePalette();
        }
      },
      {
        id: "nav-ai",
        category: "Navigation",
        label: "Go to AI Monitor (WAP)",
        shortcut: "⌥I",
        action: () => {
          router.push("/ai-monitor");
          closePalette();
        }
      },
      {
        id: "nav-support",
        category: "Navigation",
        label: "Go to Support Operations",
        shortcut: "⌥S",
        action: () => {
          router.push("/admin/support");
          closePalette();
        }
      },
      // Operations Actions
      {
        id: "op-retrain",
        category: "Operations",
        label: "Trigger WAP AI Model Retraining",
        action: async () => {
          closePalette();
          const success = await retrainWapModel();
          if (success) {
            alert("WAP AI Model Retraining triggered successfully.");
          } else {
            alert("Failed to trigger retraining.");
          }
        }
      },
      {
        id: "op-fallback-on",
        category: "Operations",
        label: "Enable WAP Fallback Mode",
        action: async () => {
          closePalette();
          await toggleWapFallback(true);
          alert("WAP Fallback mode enabled.");
        }
      },
      {
        id: "op-fallback-off",
        category: "Operations",
        label: "Disable WAP Fallback Mode",
        action: async () => {
          closePalette();
          await toggleWapFallback(false);
          alert("WAP Fallback mode disabled.");
        }
      },
      {
        id: "op-ack-alerts",
        category: "Operations",
        label: "Acknowledge All Open Alerts",
        action: () => {
          closePalette();
          const openAlerts = alerts.filter(a => !a.acknowledged);
          if (openAlerts.length === 0) {
            alert("No open alerts to acknowledge.");
            return;
          }
          openAlerts.forEach(a => acknowledgeAlert(a.id));
          addActivity({
            text: `Acknowledged all open alerts (${openAlerts.length})`,
            color: "var(--status-green)"
          });
          alert(`Acknowledged ${openAlerts.length} alerts.`);
        }
      },
      {
        id: "op-clear-feed",
        category: "Operations",
        label: "Clear System Activity Feed",
        action: () => {
          clearActivityFeed();
          closePalette();
          addActivity({
            text: "Cleared system activity feed",
            color: "var(--text-muted)"
          });
        }
      }
    ];

    return list;
  }, [router, alerts, retrainWapModel, toggleWapFallback, acknowledgeAlert, clearActivityFeed, addActivity]);

  // Filter commands by search term
  const filteredCommands = useMemo(() => {
    if (!search) return commands;
    const lower = search.toLowerCase();
    return commands.filter(c => 
      c.label.toLowerCase().includes(lower) || 
      c.category.toLowerCase().includes(lower)
    );
  }, [search, commands]);

  // Event Listeners for global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Command Palette (Cmd+K or Ctrl+K)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => {
          const next = !prev;
          if (!next) setSearch("");
          return next;
        });
      }

      // Escape to close
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        closePalette();
      }

      // Hotkey Navigations (Alt/Option + letter)
      if (e.altKey) {
        let matched = false;
        switch (e.key.toLowerCase()) {
          case "o":
            router.push("/");
            matched = true;
            break;
          case "d":
            router.push("/admin/orders");
            matched = true;
            break;
          case "v":
            router.push("/drivers");
            matched = true;
            break;
          case "m":
            router.push("/admin/map");
            matched = true;
            break;
          case "z":
            router.push("/zones");
            matched = true;
            break;
          case "r":
            router.push("/merchants");
            matched = true;
            break;
          case "f":
            router.push("/finance");
            matched = true;
            break;
          case "a":
            router.push("/analytics");
            matched = true;
            break;
          case "l":
            router.push("/alerts");
            matched = true;
            break;
          case "i":
            router.push("/ai-monitor");
            matched = true;
            break;
          case "s":
            router.push("/admin/support");
            matched = true;
            break;
        }
        if (matched) {
          e.preventDefault();
          closePalette();
        }
      }

      // Arrow keys and enter inside the open palette
      if (isOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, router]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [isOpen]);

  // Click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      closePalette();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 25, 35, 0.4)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh"
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: "100%",
          maxWidth: "580px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {/* Search Input bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)"
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--text-muted)", marginRight: "12px" }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search routes..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              fontSize: "14px",
              color: "var(--text-primary)",
              outline: "none"
            }}
          />
          <span
            style={{
              fontSize: "10.5px",
              padding: "2px 6px",
              background: "var(--bg-sunken)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              color: "var(--text-muted)",
              fontWeight: 600
            }}
          >
            ESC
          </span>
        </div>

        {/* Results List */}
        <div
          style={{
            maxHeight: "360px",
            overflowY: "auto",
            padding: "8px"
          }}
        >
          {filteredCommands.length === 0 ? (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "13px"
              }}
            >
              No commands found for &quot;{search}&quot;
            </div>
          ) : (
            <div>
              {/* Grouped commands rendering */}
              {Object.entries(
                filteredCommands.reduce((groups, item) => {
                  const val = item.category;
                  groups[val] = groups[val] || [];
                  groups[val].push(item);
                  return groups;
                }, {} as Record<string, CommandItem[]>)
              ).map(([category, items]) => (
                <div key={category}>
                  <div
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      padding: "8px 12px 4px"
                    }}
                  >
                    {category}
                  </div>
                  {items.map((item) => {
                    const globalIndex = filteredCommands.findIndex(c => c.id === item.id);
                    const isSelected = globalIndex === selectedIndex;

                    return (
                      <div
                        key={item.id}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "9px 12px",
                          borderRadius: "var(--radius-md)",
                          cursor: "pointer",
                          background: isSelected ? "var(--accent-light)" : "transparent",
                          color: isSelected ? "var(--accent)" : "var(--text-primary)",
                          transition: "background 0.1s, color 0.1s"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "13px", fontWeight: isSelected ? 600 : 500 }}>
                            {item.label}
                          </span>
                        </div>
                        {item.shortcut && (
                          <kbd
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "11px",
                              color: isSelected ? "var(--accent)" : "var(--text-muted)",
                              opacity: 0.8
                            }}
                          >
                            {item.shortcut}
                          </kbd>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer instructions */}
        <div
          style={{
            padding: "8px 16px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-sunken)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "11px",
            color: "var(--text-muted)"
          }}
        >
          <div style={{ display: "flex", gap: "12px" }}>
            <span>↑↓ Navigate</span>
            <span>↵ Enter to select</span>
          </div>
          <div>
            <span>⌘K to toggle</span>
          </div>
        </div>
      </div>
    </div>
  );
}
