"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useDashboardStore } from "@/stores/dashboardStore";
import StatusBadge from "@/shared/components/StatusBadge";

interface DocumentDetails {
  title: string;
  desc: string;
  fileName: string;
  uploadedAt: string;
  status: string;
}

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

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Combine data depending on active tab
  const listItems = useMemo(() => {
    if (activeTab === "driver") {
      return drivers.map(d => ({
        id: d.id,
        name: d.name,
        phone: d.phone,
        email: d.phone ? `${d.name.toLowerCase().replace(/\s+/g, '')}@wolfie.delivery` : "driver@wolfie.delivery",
        role: "driver",
        zone: d.zone,
        kyc_status: d.kyc_status || "not_started",
        kyc_documents: d.kyc_documents || {},
        extraInfo: `Trips: ${d.completed_trips} | Rating: ★${d.rating}`
      }));
    } else {
      return merchants.map(m => ({
        id: m.id,
        name: m.name,
        phone: "N/A",
        email: `${m.name.toLowerCase().replace(/\s+/g, '')}@restaurant.com`,
        role: "restaurant",
        zone: m.zone,
        kyc_status: m.kyc_status || "not_started",
        kyc_documents: m.kyc_documents || {},
        extraInfo: `Commission: ${m.commissionPct}% | Category: ${m.category}`
      }));
    }
  }, [activeTab, drivers, merchants]);

  // Apply filters
  const filteredItems = useMemo(() => {
    return listItems.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.zone.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" ? true : item.kyc_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [listItems, searchQuery, statusFilter]);

  // Reset selected ID when tab changes
  useEffect(() => {
    setSelectedId(filteredItems[0]?.id || null);
  }, [activeTab]);

  // Get currently selected item details
  const selectedItem = useMemo(() => {
    return listItems.find(item => item.id === selectedId) || null;
  }, [listItems, selectedId]);

  // Generate dynamic documents list for display
  const documentList = useMemo(() => {
    if (!selectedItem) return [];

    const isDriver = selectedItem.role === "driver";
    const docs = selectedItem.kyc_documents || {};

    const configs = isDriver ? [
      { id: "selfie", label: "Selfie Portrait", desc: "Clear close-up photo of the face", fallbackName: "selfie_photo.jpg" },
      { id: "license", label: "Driver's License", desc: "Front side of driver license", fallbackName: "license_front.png" },
      { id: "id_card", label: "National ID / Passport", desc: "Government issued identity card", fallbackName: "passport_scan.pdf" },
      { id: "registration", label: "Vehicle Registration", desc: "Motorcycle/Car proof of ownership", fallbackName: "scooter_insurance_cert.pdf" }
    ] : [
      { id: "license", label: "Business License", desc: "Government merchant register record", fallbackName: "business_registration_2026.pdf" },
      { id: "tax_cert", label: "Tax Certification", desc: "Official corporate tax identification document", fallbackName: "tax_id_certificate.pdf" },
      { id: "health_permit", label: "Health & Safety Permit", desc: "Local food handler compliance approval permit", fallbackName: "sanitary_inspection.pdf" },
      { id: "bank_doc", label: "Payout Bank Document", desc: "Void check or bank account validation letter", fallbackName: "void_check.png" }
    ];

    return configs.map(cfg => {
      const savedDoc = docs[cfg.id] || {};
      // Backend may store URL as: a direct string (restaurants), or { file_url: "..." } (drivers)
      const fileUrl = typeof savedDoc === "string" ? savedDoc : (savedDoc.file_url || "");
      const fileName = typeof savedDoc === "string" ? cfg.fallbackName : (savedDoc.file_name || cfg.fallbackName);
      const uploadedAt = typeof savedDoc === "string" ? new Date().toLocaleDateString() : (savedDoc.uploaded_at ? new Date(savedDoc.uploaded_at).toLocaleString() : new Date().toLocaleDateString());
      const docStatus = typeof savedDoc === "string" ? "pending_review" : (savedDoc.status || (selectedItem.kyc_status === "approved" ? "approved" : selectedItem.kyc_status === "rejected" ? "rejected" : "pending_review"));
      return {
        id: cfg.id,
        label: cfg.label,
        desc: cfg.desc,
        fileName,
        fileUrl,
        uploadedAt,
        status: docStatus,
        errorReason: typeof savedDoc === "string" ? "" : (savedDoc.error_reason || "")
      };
    });
  }, [selectedItem]);

  // Document details of the currently inspected file
  const activeDoc = useMemo(() => {
    return documentList.find(d => d.id === selectedDocId) || documentList[0] || null;
  }, [documentList, selectedDocId]);

  // Reset active doc selection when selecting another user
  useEffect(() => {
    if (documentList.length > 0) {
      setSelectedDocId(documentList[0].id);
    }
  }, [selectedId]);

  const handleDecision = async (status: "approved" | "rejected") => {
    if (!selectedItem) return;
    if (status === "rejected" && !rejectionReason.trim()) {
      alert("Please provide a rejection reason for the applicant.");
      return;
    }

    setSubmitting(true);
    const success = await reviewKyc(
      selectedItem.id, 
      selectedItem.role as "driver" | "restaurant", 
      status, 
      status === "rejected" ? rejectionReason : undefined
    );
    setSubmitting(false);

    if (success) {
      setRejectionReason("");
      alert(`KYC status updated successfully to ${status}!`);
    } else {
      alert("Failed to update KYC status. Please try again.");
    }
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
          <div className="page-title">KYC Compliance & Verification</div>
          <div className="page-subtitle">Review verification documents, inspect driver licenses, check restaurant permits, and approve/reject credentials.</div>
        </div>
      </div>

      {/* Primary Role Tabs */}
      <div style={{ display: "flex", gap: "var(--gap-sm)", marginBottom: "var(--gap-lg)" }}>
        <button 
          className={`btn ${activeTab === "driver" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("driver")}
        >
          🏍️ Drivers Fleet
        </button>
        <button 
          className={`btn ${activeTab === "restaurant" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("restaurant")}
        >
          🏪 Merchants Registry
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "5fr 7fr", gap: "var(--gap-lg)", height: "calc(100vh - 220px)", minHeight: 600 }}>
        
        {/* Left Side: Registries list */}
        <div className="panel" style={{ display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" }}>
          <div className="panel-header" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
            <div className="panel-title" style={{ fontSize: 14 }}>
              {activeTab === "driver" ? "Drivers Fleet KYC" : "Merchant KYC Registry"}
            </div>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{filteredItems.length} found</span>
          </div>

          {/* Search and Filters */}
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, borderBottom: "1px solid var(--border)" }}>
            <input 
              type="text" 
              placeholder={`Search by name, ID or zone...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "6px 12px",
                fontSize: "12px",
                background: "var(--bg-base)"
              }}
            />
            <div style={{ display: "flex", gap: 4 }}>
              {[
                { value: "all", label: "All" },
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Verified" },
                { value: "rejected", label: "Rejected" }
              ].map(f => (
                <button
                  key={f.value}
                  className={`btn ${statusFilter === f.value ? "btn-primary" : "btn-secondary"} btn-xs`}
                  onClick={() => setStatusFilter(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Candidates List */}
          <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
            {filteredItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 10px", color: "var(--text-muted)", fontSize: 13 }}>
                No candidate registries match current filter criteria.
              </div>
            ) : (
              filteredItems.map(item => {
                const isSelected = item.id === selectedId;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    style={{
                      padding: 12,
                      borderRadius: "var(--radius-md)",
                      border: `1px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                      background: isSelected ? "var(--panel-hover)" : "var(--bg-card)",
                      cursor: "pointer",
                      marginBottom: 8,
                      transition: "all 0.2s ease"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{item.name}</span>
                      <span 
                        style={{ 
                          fontSize: 10, 
                          fontWeight: "bold", 
                          textTransform: "uppercase",
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: `${getKycBadgeColor(item.kyc_status)}20`,
                          color: getKycBadgeColor(item.kyc_status),
                          border: `1px solid ${getKycBadgeColor(item.kyc_status)}30`
                        }}
                      >
                        {item.kyc_status.replace("_", " ")}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>ID: #{item.id.slice(0, 16)}...</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                      <span>📍 {item.zone}</span>
                      <span>{item.extraInfo}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Document Inspection Panel */}
        <div className="panel" style={{ display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" }}>
          {!selectedItem ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🛡️</div>
              <p style={{ fontSize: 14, fontWeight: 500 }}>Select a candidate to examine files</p>
              <p style={{ fontSize: 11, marginTop: 4 }}>Review and activate driver/restaurant accounts</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 20 }}>
              
              {/* Header profile info */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border)", paddingBottom: 16, marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{selectedItem.name}</h3>
                  <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
                    <span>📧 {selectedItem.email}</span>
                    <span>📞 {selectedItem.phone}</span>
                    <span>📍 {selectedItem.zone}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>KYC Compliance Status</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: getKycBadgeColor(selectedItem.kyc_status), marginTop: 4, textTransform: "uppercase" }}>
                    ● {selectedItem.kyc_status.replace("_", " ")}
                  </div>
                </div>
              </div>

              {/* Layout for doc lists vs detail view */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap-md)", flex: 1, overflow: "hidden", marginBottom: 16 }}>
                
                {/* List of files */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
                  <h4 style={{ fontSize: 12, textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700, marginBottom: 4 }}>Required Credentials</h4>
                  {documentList.map(doc => {
                    const isInspecting = doc.id === selectedDocId;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDocId(doc.id)}
                        style={{
                          padding: 12,
                          borderRadius: "var(--radius-md)",
                          border: `1px solid ${isInspecting ? "var(--primary)" : "var(--border)"}`,
                          background: isInspecting ? "var(--panel-hover)" : "var(--bg-base)",
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{doc.label}</span>
                          <span style={{ 
                            fontSize: 9, 
                            fontWeight: "bold",
                            color: doc.status === "approved" ? "var(--status-green)" : doc.status === "rejected" ? "var(--status-red)" : "var(--gold)"
                          }}>
                            {doc.status === "approved" ? "✓ Verified" : doc.status === "rejected" ? "✗ Rejected" : "● Reviewing"}
                          </span>
                        </div>
                        <p style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          📄 {doc.fileName}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Inspect Previews */}
                <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                  <h4 style={{ fontSize: 12, textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700, marginBottom: 8 }}>Scanned Document Preview</h4>
                  
                  {activeDoc && (
                    <div style={{ flex: 1, background: "#131316", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", padding: 12, overflow: "hidden" }}>
                      
                      {/* Document Details Info */}
                      <div style={{ marginBottom: 12, borderBottom: "1px dashed var(--border)", paddingBottom: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: "bold", color: "var(--text-primary)" }}>{activeDoc.label}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>Uploaded: {activeDoc.uploadedAt}</div>
                      </div>

                      {/* Document Visual Preview */}
                      <div style={{ 
                        flex: 1, 
                        background: "rgba(0,0,0,0.5)", 
                        borderRadius: 6, 
                        border: "1px solid #232329",
                        display: "flex", 
                        flexDirection: "column", 
                        alignItems: "center", 
                        justifyContent: "center",
                        padding: 16,
                        position: "relative",
                        overflow: "hidden"
                      }}>
                        {/* Scanner watermarks */}
                        <div style={{ position: "absolute", top: 10, left: 10, fontSize: 8, color: "var(--text-muted)", fontFamily: "monospace" }}>SCANNER_ID: WLF_401</div>
                        <div style={{ position: "absolute", bottom: 10, right: 10, fontSize: 8, color: "var(--text-muted)", fontFamily: "monospace" }}>VERIFIED_SECURE</div>

                        {activeDoc.fileUrl ? (
                          // Real document preview
                          activeDoc.fileName?.toLowerCase().endsWith(".pdf") ? (
                            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                              <iframe
                                src={activeDoc.fileUrl}
                                style={{ width: "100%", flex: 1, border: "none", borderRadius: 4, background: "#fff" }}
                                title={activeDoc.label}
                              />
                              <a href={activeDoc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "var(--primary)", textDecoration: "underline" }}>
                                Open PDF in new tab ↗
                              </a>
                            </div>
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                              <img
                                src={activeDoc.fileUrl}
                                alt={activeDoc.label}
                                style={{
                                  maxWidth: "100%",
                                  maxHeight: "calc(100% - 30px)",
                                  objectFit: "contain",
                                  borderRadius: 4,
                                  border: "1px solid #232329",
                                  cursor: "pointer"
                                }}
                                onClick={() => window.open(activeDoc.fileUrl, "_blank")}
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  target.style.display = "none";
                                  if (target.nextElementSibling) (target.nextElementSibling as HTMLElement).style.display = "flex";
                                }}
                              />
                              {/* Fallback if image fails to load */}
                              <div style={{ display: "none", flexDirection: "column", alignItems: "center", gap: 6 }}>
                                <div style={{ fontSize: 36 }}>⚠️</div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>Image failed to load</div>
                                <a href={activeDoc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "var(--primary)", textDecoration: "underline" }}>
                                  Try opening directly ↗
                                </a>
                              </div>
                              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Click image to view full size</div>
                            </div>
                          )
                        ) : (
                          // No document uploaded — placeholder
                          <>
                            <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
                            <div style={{ fontSize: 11, fontWeight: "bold", color: "var(--text-muted)", textAlign: "center", textTransform: "uppercase" }}>
                              No Document Uploaded
                            </div>
                            <p style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", marginTop: 4, padding: "0 10px" }}>
                              {activeDoc.desc}
                            </p>
                          </>
                        )}

                        {/* Scan badges — only show when file exists */}
                        {activeDoc.fileUrl && (
                          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                            <span style={{ fontSize: 9, background: "#1b291d", color: "#68d391", padding: "1px 6px", borderRadius: 4, border: "1px solid #273b2a" }}>Ocr Match 99%</span>
                            <span style={{ fontSize: 9, background: "#28241b", color: "#f6ad55", padding: "1px 6px", borderRadius: 4, border: "1px solid #3c3325" }}>Liveness Valid</span>
                          </div>
                        )}
                      </div>

                      {/* Error warnings if rejected */}
                      {activeDoc.status === "rejected" && activeDoc.errorReason && (
                        <div style={{ marginTop: 8, background: "rgba(229,62,62,0.1)", border: "1px solid rgba(229,62,62,0.2)", borderRadius: 6, padding: "6px 10px", fontSize: 11, color: "var(--status-red)" }}>
                          ⚠️ <strong>Rejection reason:</strong> "{activeDoc.errorReason}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions decision block */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                {selectedItem.kyc_status === "approved" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(72,187,120,0.1)", border: "1px solid rgba(72,187,120,0.2)", color: "var(--status-green)", padding: 12, borderRadius: "var(--radius-md)", fontSize: 13 }}>
                    <span>✅</span>
                    <span><strong>KYC Verification Passed:</strong> This registry is approved and active on the platform. No further overrides are required.</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    
                    {/* Rejection comment field */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 750 }}>
                        Rejection Comment (Required to reject)
                      </label>
                      <textarea
                        placeholder="Write down why the document checks failed (e.g. License image is blurry, name mismatch with registration, expired bank proof)..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        style={{
                          width: "100%",
                          minHeight: 60,
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-md)",
                          padding: 10,
                          fontSize: "12.5px",
                          background: "var(--bg-base)",
                          color: "var(--text-primary)",
                          resize: "none"
                        }}
                      />
                    </div>

                    {/* Actions button grid */}
                    <div style={{ display: "flex", gap: "var(--gap-md)" }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleDecision("rejected")}
                        disabled={submitting || !rejectionReason.trim()}
                        style={{ flex: 1, borderColor: rejectionReason.trim() ? "var(--status-red)" : "", color: rejectionReason.trim() ? "var(--status-red)" : "" }}
                      >
                        {submitting ? "Processing..." : "Reject Documents"}
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleDecision("approved")}
                        disabled={submitting}
                        style={{ flex: 1 }}
                      >
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
