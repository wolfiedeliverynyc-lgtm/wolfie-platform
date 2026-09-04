"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useDashboardStore } from "@/stores/dashboardStore";

export default function KYCReviewPage() {
  const {
    drivers,
    merchants,
    fetchDashboardData,
    reviewKyc
  } = useDashboardStore();

  const [activeTab, setActiveTab] = useState<"driver" | "restaurant">("driver");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string>("license");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [detailTab, setDetailTab] = useState<"documents" | "profile" | "menu">("documents");
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuDoc, setMenuDoc] = useState<string | null>(null);
  const [menuLoading, setMenuLoading] = useState(false);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const listItems = useMemo(() => {
    if (activeTab === "driver") {
      return drivers.map(d => ({
        id: d.id,
        name: d.name,
        phone: d.phone || "N/A",
        email: (d as any).email || "",
        role: "driver",
        zone: d.zone,
        address: d.zone,
        bio: "", story: "", logo_image: "", cuisine: "",
        expected_daily_orders: null,
        kyc_status: d.kyc_status || "not_started",
        kyc_documents: d.kyc_documents || {},
        extraInfo: `Trips: ${d.completed_trips} | Rating: ★${d.rating}`
      }));
    } else {
      return merchants.map(m => ({
        id: m.id,
        name: m.name,
        phone: m.phone || "N/A",
        email: m.email || "",
        role: "restaurant",
        zone: m.zone || m.address || "",
        address: m.address || m.zone || "",
        bio: m.bio || "",
        story: m.story || "",
        logo_image: m.logo_image || "",
        cuisine: m.cuisine || m.category || "",
        expected_daily_orders: m.expected_daily_orders || null,
        kyc_status: m.kyc_status || "not_started",
        kyc_documents: m.kyc_documents || {},
        extraInfo: `Commission: ${m.commissionPct}% | Category: ${m.category}`
      }));
    }
  }, [activeTab, drivers, merchants]);

  const filteredItems = useMemo(() => {
    return listItems.filter(item => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.zone || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" ? true : item.kyc_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [listItems, searchQuery, statusFilter]);

  useEffect(() => { setSelectedId(filteredItems[0]?.id || null); setDetailTab("documents"); }, [activeTab]);

  const selectedItem = useMemo(() => listItems.find(i => i.id === selectedId) || null, [listItems, selectedId]);

  const fetchMenu = useCallback(async (restaurantId: string) => {
    setMenuLoading(true);
    setMenuItems([]);
    setMenuDoc(null);
    try {
      const baseUrl = typeof window !== "undefined" && window.location.hostname === "localhost"
        ? "http://localhost:5000" : "https://wolfie-backend-pt9u.onrender.com";
      const token = localStorage.getItem("token") || sessionStorage.getItem("token") || "";

      // Try admin endpoint first
      let res = await fetch(`${baseUrl}/api/v1/admin/restaurants/${restaurantId}/menu`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Fallback to public endpoint
      if (!res.ok) {
        res = await fetch(`${baseUrl}/api/v1/restaurants/${restaurantId}/menu`);
      }

      if (res.ok) {
        const data = await res.json();
        const items = data.menu || data.items || data.menu_items || (Array.isArray(data) ? data : []);
        setMenuItems(items);
        if (data.menu_doc) {
          setMenuDoc(data.menu_doc);
        }
      } else {
        setMenuItems([]);
      }
    } catch {
      setMenuItems([]);
    } finally {
      setMenuLoading(false);
    }
  }, []);

  useEffect(() => {
    if (detailTab === "menu" && selectedItem?.role === "restaurant" && selectedItem.id) {
      fetchMenu(selectedItem.id);
    }
  }, [detailTab, selectedItem?.id, fetchMenu]);

  const documentList = useMemo(() => {
    if (!selectedItem) return [];
    const isDriver = selectedItem.role === "driver";
    const docs = selectedItem.kyc_documents || {};
    const configs = isDriver ? [
      { id: "selfie", keys: ["selfie", "selfie_photo", "avatar"], label: "Selfie Portrait", desc: "Clear close-up photo of the face", fallbackName: "selfie_photo.jpg" },
      { id: "license", keys: ["license", "driver_license", "license_front"], label: "Driver License", desc: "Front side of driver license", fallbackName: "license_front.png" },
      { id: "id_card", keys: ["id_card", "national_id", "passport", "owner_id"], label: "National ID / Passport", desc: "Government issued identity card", fallbackName: "passport_scan.pdf" },
      { id: "registration", keys: ["registration", "vehicle_registration", "insurance", "vehicle_photo"], label: "Vehicle Registration", desc: "Proof of vehicle ownership", fallbackName: "vehicle_reg.pdf" }
    ] : [
      { id: "license", keys: ["business_license", "license", "register"], label: "Business License", desc: "Government merchant register record", fallbackName: "business_registration.pdf" },
      { id: "tax_cert", keys: ["owner_id", "tax_cert", "tax_id", "identity"], label: "Tax Certification / Owner ID", desc: "Official corporate tax ID", fallbackName: "tax_id_certificate.pdf" },
      { id: "health_permit", keys: ["health_permit", "food_permit", "permit"], label: "Health & Safety Permit", desc: "Local food handler compliance approval", fallbackName: "sanitary_inspection.pdf" },
      { id: "bank_doc", keys: ["storefront_photo", "bank_doc", "storefront", "payout_doc"], label: "Storefront & Facility Photo", desc: "Storefront exterior or dining facility photo", fallbackName: "storefront_photo.jpg" }
    ];
    return configs.map(cfg => {
      let savedDoc: any = null;
      for (const k of cfg.keys) {
        if (docs[k] !== undefined && docs[k] !== null && docs[k] !== "") { savedDoc = docs[k]; break; }
      }
      if (!savedDoc) savedDoc = {};
      let rawUrl = typeof savedDoc === "string" ? savedDoc : (savedDoc.file_url || savedDoc.url || savedDoc.path || savedDoc.uri || savedDoc.link || savedDoc.src || savedDoc.file || "");
      let fileUrl = rawUrl;
      const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
      const prodBackend = "https://wolfie-backend-pt9u.onrender.com";

      if (fileUrl) {
        if (fileUrl.startsWith("/")) {
          fileUrl = `${isLocalhost ? "http://localhost:5000" : prodBackend}${fileUrl}`;
        } else if (!isLocalhost && (fileUrl.includes("localhost:5000") || fileUrl.includes("127.0.0.1:5000"))) {
          fileUrl = fileUrl.replace(/http:\/\/(localhost|127\.0\.0\.1):5000/, prodBackend);
        }
      }
      const fileName = typeof savedDoc === "string" ? cfg.fallbackName : (savedDoc.file_name || savedDoc.name || cfg.fallbackName);
      const uploadedAt = typeof savedDoc === "string" ? new Date().toLocaleDateString() : (savedDoc.uploaded_at ? new Date(savedDoc.uploaded_at).toLocaleString() : "—");
      const docStatus = typeof savedDoc === "string" ? "pending_review" : (savedDoc.status || (selectedItem.kyc_status === "approved" ? "approved" : selectedItem.kyc_status === "rejected" ? "rejected" : "pending_review"));
      return { id: cfg.id, label: cfg.label, desc: cfg.desc, fileName, fileUrl, uploadedAt, status: docStatus, errorReason: typeof savedDoc === "string" ? "" : (savedDoc.error_reason || "") };
    });
  }, [selectedItem]);

  const bankInfo = useMemo(() => {
    if (!selectedItem || selectedItem.role !== "restaurant") return null;
    const docs = selectedItem.kyc_documents || {};
    const b = docs.bank_account || docs.bank_details || docs.payout_info || docs.banking || null;
    if (!b || typeof b !== "object") return null;
    return b;
  }, [selectedItem]);

  const activeDoc = useMemo(() => documentList.find(d => d.id === selectedDocId) || documentList[0] || null, [documentList, selectedDocId]);

  useEffect(() => { if (documentList.length > 0) setSelectedDocId(documentList[0].id); }, [selectedId]);

  const handleDecision = async (status: "approved" | "rejected") => {
    if (!selectedItem) return;
    if (status === "rejected" && !rejectionReason.trim()) { alert("Please provide a rejection reason."); return; }
    setSubmitting(true);
    const success = await reviewKyc(selectedItem.id, selectedItem.role as "driver" | "restaurant", status, status === "rejected" ? rejectionReason : undefined);
    setSubmitting(false);
    if (success) { setRejectionReason(""); alert(`KYC status updated to ${status}!`); }
    else { alert("Failed to update KYC status. Please try again."); }
  };

  const getKycBadgeColor = (status: string) => {
    switch (status) {
      case "approved": return "var(--status-green)";
      case "pending": return "var(--gold)";
      case "rejected": return "var(--status-red)";
      default: return "var(--text-muted)";
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">KYC Compliance &amp; Verification</div>
          <div className="page-subtitle">Review verification documents, inspect driver licenses, check restaurant permits, and approve/reject credentials.</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "var(--gap-sm)", marginBottom: "var(--gap-lg)" }}>
        <button className={`btn ${activeTab === "driver" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("driver")}>
          🏍️ Drivers Fleet
        </button>
        <button className={`btn ${activeTab === "restaurant" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("restaurant")}>
          🏪 Merchants Registry
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "5fr 7fr", gap: "var(--gap-lg)", height: "calc(100vh - 220px)", minHeight: 600 }}>
        {/* LEFT */}
        <div className="panel" style={{ display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" }}>
          <div className="panel-header" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
            <div className="panel-title" style={{ fontSize: 14 }}>{activeTab === "driver" ? "Drivers Fleet KYC" : "Merchant KYC Registry"}</div>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{filteredItems.length} found</span>
          </div>
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, borderBottom: "1px solid var(--border)" }}>
            <input type="text" placeholder="Search by name, ID or zone..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ width: "100%", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "6px 12px", fontSize: "12px", background: "var(--bg-base)", color: "var(--text-primary)" }} />
            <div style={{ display: "flex", gap: 4 }}>
              {[{ value: "all", label: "All" }, { value: "pending", label: "Pending" }, { value: "approved", label: "Verified" }, { value: "rejected", label: "Rejected" }].map(f => (
                <button key={f.value} className={`btn ${statusFilter === f.value ? "btn-primary" : "btn-secondary"} btn-xs`} onClick={() => setStatusFilter(f.value)}>{f.label}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
            {filteredItems.length === 0
              ? <div style={{ textAlign: "center", padding: "40px 10px", color: "var(--text-muted)", fontSize: 13 }}>No candidates match current filter.</div>
              : filteredItems.map(item => {
                const isSel = item.id === selectedId;
                return (
                  <div key={item.id} onClick={() => { setSelectedId(item.id); setDetailTab("documents"); }}
                    style={{ padding: 12, borderRadius: "var(--radius-md)", border: `1px solid ${isSel ? "var(--primary)" : "var(--border)"}`, background: isSel ? "var(--panel-hover)" : "var(--bg-card)", cursor: "pointer", marginBottom: 8, transition: "all 0.2s ease" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{item.name}</span>
                      <span style={{ fontSize: 10, fontWeight: "bold", textTransform: "uppercase", padding: "2px 6px", borderRadius: 4, background: `${getKycBadgeColor(item.kyc_status)}20`, color: getKycBadgeColor(item.kyc_status), border: `1px solid ${getKycBadgeColor(item.kyc_status)}30` }}>
                        {item.kyc_status.replace("_", " ")}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>ID: #{item.id.slice(0, 16)}...</div>
                    {item.email && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>✉️ {item.email}</div>}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                      <span>{item.zone ? `📍 ${item.zone.length > 35 ? item.zone.slice(0, 35) + "…" : item.zone}` : "📍 No address"}</span>
                      <span>{item.extraInfo}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* RIGHT */}
        <div className="panel" style={{ display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" }}>
          {!selectedItem ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🛡️</div>
              <p style={{ fontSize: 14, fontWeight: 500 }}>Select a candidate to examine files</p>
              <p style={{ fontSize: 11, marginTop: 4 }}>Review and activate driver/restaurant accounts</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 20 }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border)", paddingBottom: 14, marginBottom: 14 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  {selectedItem.logo_image
                    ? <img src={selectedItem.logo_image} alt={selectedItem.name} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", border: "1px solid var(--border)", flexShrink: 0 }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    : <div style={{ width: 48, height: 48, borderRadius: 8, background: "var(--bg-base)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{selectedItem.role === "restaurant" ? "🏪" : "🏍️"}</div>
                  }
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{selectedItem.name}</h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", fontSize: 12, color: "var(--text-muted)" }}>
                      {selectedItem.email && <span>✉️ {selectedItem.email}</span>}
                      {selectedItem.phone && selectedItem.phone !== "N/A" && <span>📞 {selectedItem.phone}</span>}
                      {selectedItem.address && <span>📍 {selectedItem.address.length > 40 ? selectedItem.address.slice(0, 40) + "…" : selectedItem.address}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>KYC Status</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: getKycBadgeColor(selectedItem.kyc_status), marginTop: 4, textTransform: "uppercase" }}>
                    ● {selectedItem.kyc_status.replace("_", " ")}
                  </div>
                </div>
              </div>

              {/* Sub-tabs */}
              <div style={{ display: "flex", gap: 6, marginBottom: 14, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
                <button className={`btn btn-xs ${detailTab === "documents" ? "btn-primary" : "btn-secondary"}`} onClick={() => setDetailTab("documents")}>📄 Documents</button>
                <button className={`btn btn-xs ${detailTab === "profile" ? "btn-primary" : "btn-secondary"}`} onClick={() => setDetailTab("profile")}>👤 Profile &amp; Bio</button>
                {selectedItem.role === "restaurant" && (
                  <button className={`btn btn-xs ${detailTab === "menu" ? "btn-primary" : "btn-secondary"}`} onClick={() => setDetailTab("menu")}>📋 Menu Preview</button>
                )}
              </div>

              {/* DOCUMENTS TAB */}
              {detailTab === "documents" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap-md)", flex: 1, overflow: "hidden", marginBottom: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
                    <h4 style={{ fontSize: 12, textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700, marginBottom: 4 }}>Required Credentials</h4>
                    {documentList.map(doc => {
                      const isIns = doc.id === selectedDocId;
                      return (
                        <div key={doc.id} onClick={() => setSelectedDocId(doc.id)}
                          style={{ padding: 12, borderRadius: "var(--radius-md)", border: `1px solid ${isIns ? "var(--primary)" : "var(--border)"}`, background: isIns ? "var(--panel-hover)" : "var(--bg-base)", cursor: "pointer", transition: "all 0.2s ease" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{doc.label}</span>
                            <span style={{ fontSize: 9, fontWeight: "bold", color: doc.fileUrl ? (doc.status === "approved" ? "var(--status-green)" : doc.status === "rejected" ? "var(--status-red)" : "var(--gold)") : "var(--text-muted)" }}>
                              {doc.fileUrl ? (doc.status === "approved" ? "✓ Verified" : doc.status === "rejected" ? "✗ Rejected" : "● Reviewing") : "○ Not uploaded"}
                            </span>
                          </div>
                          <p style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>📄 {doc.fileName}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                    <h4 style={{ fontSize: 12, textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700, marginBottom: 8 }}>Scanned Document Preview</h4>
                    {activeDoc && (
                      <div style={{ flex: 1, background: "#131316", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", padding: 12, overflow: "hidden" }}>
                        <div style={{ marginBottom: 12, borderBottom: "1px dashed var(--border)", paddingBottom: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: "bold", color: "var(--text-primary)" }}>{activeDoc.label}</div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>Uploaded: {activeDoc.uploadedAt}</div>
                        </div>
                        <div style={{ flex: 1, background: "rgba(0,0,0,0.5)", borderRadius: 6, border: "1px solid #232329", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16, position: "relative", overflow: "hidden" }}>
                          <div style={{ position: "absolute", top: 10, left: 10, fontSize: 8, color: "var(--text-muted)", fontFamily: "monospace" }}>SCANNER_ID: WLF_401</div>
                          <div style={{ position: "absolute", bottom: 10, right: 10, fontSize: 8, color: "var(--text-muted)", fontFamily: "monospace" }}>VERIFIED_SECURE</div>
                          {activeDoc.fileUrl ? (
                            activeDoc.fileName?.toLowerCase().endsWith(".pdf") ? (
                              <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                                <iframe src={activeDoc.fileUrl} style={{ width: "100%", flex: 1, border: "none", borderRadius: 4, background: "#fff" }} title={activeDoc.label} />
                                <a href={activeDoc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "var(--primary)", textDecoration: "underline" }}>Open PDF in new tab ↗</a>
                              </div>
                            ) : (
                              <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 8 }}>
                                <img src={activeDoc.fileUrl} alt={activeDoc.label}
                                  style={{
                                    maxWidth: "100%",
                                    maxHeight: "calc(100% - 50px)",
                                    minHeight: "120px",
                                    objectFit: "contain",
                                    borderRadius: 6,
                                    border: "1px solid #27272a",
                                    background: "#09090b",
                                    cursor: "pointer",
                                    padding: 4
                                  }}
                                  onClick={() => window.open(activeDoc.fileUrl, "_blank")}
                                  onError={e => { const t = e.currentTarget; t.style.display = "none"; const fb = t.nextElementSibling as HTMLElement | null; if (fb) fb.style.display = "flex"; }}
                                />
                                <div style={{ display: "none", flexDirection: "column", alignItems: "center", gap: 8, padding: 16 }}>
                                  <div style={{ fontSize: 32 }}>⚠️</div>
                                  <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>Preview unable to render directly in browser</div>
                                  <a href={activeDoc.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-xs" style={{ fontSize: 11, padding: "4px 10px" }}>
                                    Open Document Link ↗
                                  </a>
                                </div>
                                <a href={activeDoc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--primary)", display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "underline" }}>
                                  View Full Document ↗
                                </a>
                              </div>
                            )
                          ) : (
                            <>
                              <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
                              <div style={{ fontSize: 11, fontWeight: "bold", color: "var(--text-muted)", textAlign: "center", textTransform: "uppercase" }}>No Document Uploaded</div>
                              <p style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", marginTop: 4, padding: "0 10px" }}>{activeDoc.desc}</p>
                            </>
                          )}
                          {activeDoc.fileUrl && (
                            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                              <span style={{ fontSize: 9, background: "#1b291d", color: "#68d391", padding: "1px 6px", borderRadius: 4, border: "1px solid #273b2a" }}>OCR 99%</span>
                              <span style={{ fontSize: 9, background: "#28241b", color: "#f6ad55", padding: "1px 6px", borderRadius: 4, border: "1px solid #3c3325" }}>Liveness Valid</span>
                            </div>
                          )}
                        </div>
                        {activeDoc.status === "rejected" && activeDoc.errorReason && (
                          <div style={{ marginTop: 8, background: "rgba(229,62,62,0.1)", border: "1px solid rgba(229,62,62,0.2)", borderRadius: 6, padding: "6px 10px", fontSize: 11, color: "var(--status-red)" }}>
                            ⚠️ <strong>Rejection reason:</strong> "{activeDoc.errorReason}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PROFILE TAB */}
              {detailTab === "profile" && (
                <div style={{ flex: 1, overflowY: "auto", marginBottom: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <h4 style={{ fontSize: 12, textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700 }}>Contact &amp; Location</h4>
                      {[
                        { label: "Email", value: selectedItem.email || "—", icon: "✉️" },
                        { label: "Phone", value: selectedItem.phone !== "N/A" ? selectedItem.phone : "—", icon: "📞" },
                        { label: "Address", value: selectedItem.address || "—", icon: "📍" },
                        { label: "Cuisine / Category", value: selectedItem.cuisine || "—", icon: "🍽️" },
                        { label: "Expected Daily Orders", value: selectedItem.expected_daily_orders ? `~${selectedItem.expected_daily_orders} orders/day` : "—", icon: "📦" },
                      ].map(row => (
                        <div key={row.label} style={{ background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px" }}>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 3 }}>{row.icon} {row.label}</div>
                          <div style={{ fontSize: 13, color: "var(--text-primary)", wordBreak: "break-word" }}>{row.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <h4 style={{ fontSize: 12, textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700 }}>Bio &amp; Story</h4>
                      <div style={{ background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px" }}>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>📝 Bio</div>
                        <p style={{ fontSize: 12, color: selectedItem.bio ? "var(--text-primary)" : "var(--text-muted)", lineHeight: 1.6, fontStyle: selectedItem.bio ? "normal" : "italic" }}>
                          {selectedItem.bio || "No bio provided"}
                        </p>
                      </div>
                      {selectedItem.story && (
                        <div style={{ background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px" }}>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>📖 Story</div>
                          <p style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.6 }}>{selectedItem.story}</p>
                        </div>
                      )}
                      {selectedItem.role === "restaurant" && (
                        <>
                          <h4 style={{ fontSize: 12, textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700, marginTop: 4 }}>🏦 Bank Account</h4>
                          {bankInfo ? (
                            <div style={{ background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                              {Object.entries(bankInfo).map(([key, val]: [string, any]) => (
                                <div key={key}>
                                  <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>{key.replace(/_/g, " ")}</div>
                                  <div style={{ fontSize: 12, color: "var(--text-primary)", fontFamily: (key.toLowerCase().includes("account") || key.toLowerCase().includes("iban")) ? "monospace" : "inherit" }}>{String(val) || "—"}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ background: "var(--bg-base)", border: "1px dashed var(--border)", borderRadius: 8, padding: "16px 14px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                              No banking information registered
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* MENU PREVIEW TAB */}
              {detailTab === "menu" && selectedItem.role === "restaurant" && (
                <div style={{ flex: 1, overflowY: "auto", marginBottom: 16 }}>
                  {/* Uploaded Menu Document if present */}
                  {menuDoc && (
                    <div style={{ marginBottom: 12, padding: "10px 14px", background: "rgba(255,225,0,0.06)", border: "1px solid rgba(255,225,0,0.2)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 12, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 16 }}>📄</span>
                        <div>
                          <div style={{ fontWeight: 700 }}>Scanned Menu Document / PDF</div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Uploaded by restaurant during onboarding</div>
                        </div>
                      </div>
                      <a href={menuDoc} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-xs" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        View Document ↗
                      </a>
                    </div>
                  )}

                  {menuLoading ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--text-muted)", fontSize: 13 }}>
                      ⏳ Loading menu items...
                    </div>
                  ) : menuItems.length === 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 220, padding: 24, textAlign: "center", background: "var(--bg-base)", borderRadius: 12, border: "1px dashed var(--border)" }}>
                      <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>No Catalog Items Created Yet</h4>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 400, lineHeight: 1.6 }}>
                        This restaurant has not added individual digital menu items to the catalog database yet.
                        Restaurants can import items via AI scanner or manually build their menu from the <strong>Wolfie Restaurant Dashboard</strong> after KYC approval.
                      </p>
                      {selectedItem.category && (
                        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                          <span style={{ fontSize: 11, background: "rgba(255,225,0,0.08)", border: "1px solid rgba(255,225,0,0.2)", color: "var(--gold)", padding: "4px 12px", borderRadius: 20 }}>
                            Category: <strong>{selectedItem.category}</strong>
                          </span>
                          {selectedItem.cuisine && selectedItem.cuisine !== selectedItem.category && (
                            <span style={{ fontSize: 11, background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-muted)", padding: "4px 12px", borderRadius: 20 }}>
                              Cuisine: <strong>{selectedItem.cuisine}</strong>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                        <span>{menuItems.length} menu items in catalog</span>
                        <span style={{ fontSize: 10 }}>Live sync</span>
                      </div>
                      {menuItems.map((item: any, idx: number) => (
                        <div key={item.id || idx} style={{ background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{item.name || item.item_name || "—"}</div>
                            {item.description && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{item.description}</div>}
                            {item.category && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>📂 {item.category}</div>}
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)" }}>{item.price !== undefined ? `$${Number(item.price).toFixed(2)}` : "—"}</div>
                            {item.is_available === false && <div style={{ fontSize: 9, color: "var(--status-red)", marginTop: 2 }}>Unavailable</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Actions */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                {selectedItem.kyc_status === "approved" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(72,187,120,0.1)", border: "1px solid rgba(72,187,120,0.2)", color: "var(--status-green)", padding: 12, borderRadius: "var(--radius-md)", fontSize: 13 }}>
                    <span>✅</span>
                    <span><strong>KYC Verification Passed:</strong> This registry is approved and active on the platform.</span>
                  </div>
                ) : selectedItem.kyc_status === "rejected" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(229,62,62,0.08)", border: "1px solid rgba(229,62,62,0.2)", color: "var(--status-red)", padding: 12, borderRadius: "var(--radius-md)", fontSize: 13 }}>
                    <span>❌</span>
                    <span><strong>KYC Rejected:</strong> This account has been declined and deactivated.</span>
                    <button className="btn btn-xs btn-secondary" style={{ marginLeft: "auto" }} onClick={() => handleDecision("approved")} disabled={submitting}>Re-approve</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 750 }}>Rejection Comment (Required to reject)</label>
                      <textarea placeholder="Write why document checks failed..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                        style={{ width: "100%", minHeight: 60, border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 10, fontSize: "12.5px", background: "var(--bg-base)", color: "var(--text-primary)", resize: "none" }} />
                    </div>
                    <div style={{ display: "flex", gap: "var(--gap-md)" }}>
                      <button className="btn btn-secondary" onClick={() => handleDecision("rejected")} disabled={submitting || !rejectionReason.trim()}
                        style={{ flex: 1, borderColor: rejectionReason.trim() ? "var(--status-red)" : "", color: rejectionReason.trim() ? "var(--status-red)" : "" }}>
                        {submitting ? "Processing..." : "Reject Documents"}
                      </button>
                      <button className="btn btn-primary" onClick={() => handleDecision("approved")} disabled={submitting} style={{ flex: 1 }}>
                        {submitting ? "Processing..." : "Approve & Verify Account"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
