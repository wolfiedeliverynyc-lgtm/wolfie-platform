"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useDashboardStore } from "@/stores/dashboardStore";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  image_url?: string;
  image?: string;
  is_available?: boolean;
}

export default function AdminMenuCatalogPage() {
  const { merchants, fetchMerchants } = useDashboardStore();
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>("");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuDoc, setMenuDoc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  // Set default selected merchant once merchants load
  useEffect(() => {
    if (merchants.length > 0 && !selectedMerchantId) {
      setSelectedMerchantId(merchants[0].id);
    }
  }, [merchants, selectedMerchantId]);

  const fetchMenu = useCallback(async (merchantId: string) => {
    if (!merchantId) return;
    setLoading(true);
    setMenuItems([]);
    setMenuDoc(null);
    try {
      const baseUrl = typeof window !== "undefined" && window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : "https://wolfie-backend-pt9u.onrender.com";
      const token = localStorage.getItem("token") || sessionStorage.getItem("token") || "";

      let res = await fetch(`${baseUrl}/api/v1/admin/restaurants/${merchantId}/menu`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        res = await fetch(`${baseUrl}/api/v1/restaurants/${merchantId}/menu`);
      }

      if (res.ok) {
        const data = await res.json();
        const items = data.menu || data.items || data.menu_items || (Array.isArray(data) ? data : []);
        setMenuItems(items);
        if (data.menu_doc) {
          setMenuDoc(data.menu_doc);
        }
      }
    } catch (e) {
      console.error("Failed to fetch restaurant menu:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedMerchantId) {
      fetchMenu(selectedMerchantId);
    }
  }, [selectedMerchantId, fetchMenu]);

  const selectedMerchant = useMemo(() => {
    return merchants.find(m => m.id === selectedMerchantId) || null;
  }, [merchants, selectedMerchantId]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    menuItems.forEach(item => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats);
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesSearch =
        (item.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (item.description || "").toLowerCase().includes(search.toLowerCase()) ||
        (item.category || "").toLowerCase().includes(search.toLowerCase());
      const matchesCat = categoryFilter === "all" ? true : item.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [menuItems, search, categoryFilter]);

  return (
    <>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="page-title">Admin Menu Catalog Explorer</div>
          <div className="page-subtitle">Inspect digital catalogs and uploaded menu documents for all registered partner restaurants</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Select Restaurant:</label>
          <select
            value={selectedMerchantId}
            onChange={e => { setSelectedMerchantId(e.target.value); setCategoryFilter("all"); }}
            style={{
              background: "var(--bg-base)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              minWidth: 220
            }}
          >
            {merchants.length === 0 ? (
              <option value="">No registered restaurants</option>
            ) : (
              merchants.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.category || "Restaurant"})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-lg)" }}>
        {/* Restaurant Header Strip */}
        {selectedMerchant && (
          <div className="panel" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {selectedMerchant.logo_image ? (
                <img src={selectedMerchant.logo_image} alt={selectedMerchant.name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", border: "1px solid var(--border)" }} />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: 8, background: "var(--bg-base)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                  🏪
                </div>
              )}
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{selectedMerchant.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  <span>📍 {selectedMerchant.zone || selectedMerchant.address || "No address recorded"}</span>
                  <span style={{ margin: "0 8px" }}>•</span>
                  <span>Category: {selectedMerchant.category || "General"}</span>
                  <span style={{ margin: "0 8px" }}>•</span>
                  <span>Commission: {selectedMerchant.commissionPct}%</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {menuDoc && (
                <a href={menuDoc} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span>📄</span> View Scanned Menu ↗
                </a>
              )}
              <button className="btn btn-primary btn-sm" onClick={() => fetchMenu(selectedMerchantId)} disabled={loading}>
                {loading ? "Refreshing..." : "↻ Sync Catalog"}
              </button>
            </div>
          </div>
        )}

        {/* Filters and Search Strip */}
        <div className="panel" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <input
            type="text"
            placeholder="Search catalog by dish name, category, or ingredients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1,
              maxWidth: 400,
              background: "var(--bg-base)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "6px 12px",
              fontSize: 12
            }}
          />

          <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
            <button
              className={`btn ${categoryFilter === "all" ? "btn-primary" : "btn-secondary"} btn-xs`}
              onClick={() => setCategoryFilter("all")}
            >
              All Items ({menuItems.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                className={`btn ${categoryFilter === cat ? "btn-primary" : "btn-secondary"} btn-xs`}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat} ({menuItems.filter(i => i.category === cat).length})
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Items Table */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Published Menu Dishes</div>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{filteredItems.length} items visible</span>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)", fontSize: 13 }}>
              ⏳ Loading restaurant menu items...
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 40 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                {menuItems.length === 0 ? "No Menu Items in Database" : "No Items Match Filter"}
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 440, lineHeight: 1.6 }}>
                {menuItems.length === 0
                  ? "This restaurant has not added digital catalog items to the platform database yet. They can create and publish their full menu using the Wolfie Restaurant Portal."
                  : "Try clearing your search query or switching to All Categories."}
              </p>
              {menuDoc && (
                <div style={{ marginTop: 8 }}>
                  <a href={menuDoc} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-xs">
                    View Uploaded Physical Menu Document ↗
                  </a>
                </div>
              )}
            </div>
          ) : (
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Dish Name</th>
                  <th>Category</th>
                  <th>Description / Ingredients</th>
                  <th>Price</th>
                  <th style={{ textAlign: "right" }}>Availability</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {item.image_url || item.image ? (
                          <img src={item.image_url || item.image} alt={item.name} style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <span style={{ fontSize: 20 }}>🍽️</span>
                        )}
                        <span>{item.name}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, background: "var(--bg-base)", padding: "2px 8px", borderRadius: 4, border: "1px solid var(--border)" }}>
                        {item.category || "General"}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: 12, maxWidth: 350 }}>
                      {item.description || "—"}
                    </td>
                    <td className="mono" style={{ fontWeight: 700, color: "var(--accent)" }}>
                      {item.price !== undefined ? `${Number(item.price).toFixed(2)} DA` : "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className={`badge ${item.is_available === false ? "badge-red" : "badge-green"}`}>
                        {item.is_available === false ? "Unavailable" : "Available"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
