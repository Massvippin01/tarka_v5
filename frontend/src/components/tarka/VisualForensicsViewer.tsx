import React, { useState, useEffect } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  AlertTriangle,
  CheckCircle,
  Scan,
  Sliders,
  DollarSign,
  Building,
  ShieldAlert,
} from "lucide-react";
import { forensicsApi } from "../../api/forensicsApi";

interface VisualForensicsViewerProps {
  caseId: string;
  artifactId?: string;
  onClose?: () => void;
}

export const VisualForensicsViewer: React.FC<VisualForensicsViewerProps> = ({
  caseId,
  artifactId,
}) => {
  const [loading, setLoading] = useState(false);
  const [examData, setExamData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Viewer Controls
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showEla, setShowEla] = useState<boolean>(false);
  const [showOcrPolygons, setShowOcrPolygons] = useState<boolean>(true);
  const [selectedField, setSelectedField] = useState<string | null>(null);

  const [availableImages, setAvailableImages] = useState<any[]>([]);
  const [selectedArtId, setSelectedArtId] = useState<string>(artifactId || "");

  // Load available image artifacts
  useEffect(() => {
    forensicsApi.listArtifacts(caseId).then((arts) => {
      const imgs = (arts || []).filter((a) =>
        a.filename.toLowerCase().match(/\.(png|jpg|jpeg|webp)$/) ||
        a.filename.toLowerCase().includes("screenshot")
      );
      setAvailableImages(imgs);
      if (!selectedArtId && imgs.length > 0) {
        setSelectedArtId(imgs[0].artifact_id);
      }
    }).catch(console.error);
  }, [caseId, selectedArtId]);

  // Load examination data
  useEffect(() => {
    if (!selectedArtId) return;
    setLoading(true);
    setError(null);

    forensicsApi.getArtifactExamination(caseId, selectedArtId)
      .then((data) => {
        setExamData(data);
        setZoomLevel(1);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || err.message || "Failed to load examination");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [caseId, selectedArtId]);

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(Math.max(0.5, prev + delta), 3.5));
  };

  const manip = examData?.manipulation_analysis;
  const ocr = examData?.ocr_analysis;
  const meta = examData?.metadata_analysis;
  const recon = examData?.reconciliation_findings;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header & Controls */}
      <div className="skeuo-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="lg-badge lg-badge-blue">TRACE VISUAL FORENSICS</span>
            <span className="lg-badge lg-badge-emerald">ERROR LEVEL ANALYSIS (ELA Q=90)</span>
            <span className="lg-badge" style={{ backgroundColor: "rgba(139, 92, 246, 0.2)", color: "#C4B5FD" }}>MULTI-POLYGON OCR</span>
          </div>
          <h2 style={{ margin: "8px 0 4px", fontSize: "18px", fontWeight: 700, color: "#FFFFFF" }}>
            Payment Screenshot Visual & Cryptographic Examination
          </h2>
          <p style={{ margin: 0, fontSize: "12px", color: "#94A3B8" }}>
            Detailed raster analysis, pixel resample detection, OCR field extraction with confidence scores, and Error Level Analysis (ELA).
          </p>
        </div>

        {/* Artifact Picker */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "11px", color: "#94A3B8", fontFamily: "'IBM Plex Mono', monospace" }}>ARTIFACT:</span>
          <select
            value={selectedArtId}
            onChange={(e) => setSelectedArtId(e.target.value)}
            className="lg-select"
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px", padding: "6px 12px" }}
          >
            {availableImages.map((img) => (
              <option key={img.artifact_id} value={img.artifact_id}>
                {img.filename} ({img.artifact_id.slice(0, 8)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#94A3B8" }}>
          <div style={{ display: "inline-block", width: "24px", height: "24px", borderRadius: "50%", border: "2px solid #3B82F6", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
          <div style={{ marginTop: "12px", fontSize: "13px", fontFamily: "'IBM Plex Mono', monospace" }}>
            Executing TRACE ELA, typography analysis, and OCR extraction...
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: "16px", backgroundColor: "rgba(244, 63, 94, 0.15)", border: "1px solid rgba(244, 63, 94, 0.4)", borderRadius: "12px", color: "#FECDD3", fontSize: "13px", display: "flex", alignItems: "center", gap: "10px" }}>
          <ShieldAlert size={18} color="#F43F5E" />
          <span><strong>Analysis Error:</strong> {error}</span>
        </div>
      )}

      {examData && !loading && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "20px" }}>
          {/* Main Visual Examination Canvas */}
          <div className="skeuo-card" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Toolbar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={() => setShowEla((prev) => !prev)}
                  className={`skeuo-btn ${showEla ? "skeuo-btn-primary" : ""}`}
                  style={{ fontSize: "11px", padding: "5px 12px" }}
                >
                  <Layers size={13} />
                  <span>{showEla ? "Hide ELA Heatmap" : "Show ELA Heatmap (Q=90)"}</span>
                </button>

                <button
                  onClick={() => setShowOcrPolygons((prev) => !prev)}
                  className={`skeuo-btn ${showOcrPolygons ? "skeuo-btn-primary" : ""}`}
                  style={{ fontSize: "11px", padding: "5px 12px" }}
                >
                  <Scan size={13} />
                  <span>{showOcrPolygons ? "Hide OCR Polygons" : "Show OCR Polygons"}</span>
                </button>
              </div>

              {/* Zoom Controls */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  onClick={() => handleZoom(-0.25)}
                  className="skeuo-btn"
                  style={{ padding: "4px 8px" }}
                  title="Zoom Out"
                >
                  <ZoomOut size={13} />
                </button>
                <span style={{ fontSize: "11px", fontFamily: "'IBM Plex Mono', monospace", color: "#94A3B8", minWidth: "45px", textAlign: "center" }}>
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => handleZoom(0.25)}
                  className="skeuo-btn"
                  style={{ padding: "4px 8px" }}
                  title="Zoom In"
                >
                  <ZoomIn size={13} />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="skeuo-btn"
                  style={{ padding: "4px 8px" }}
                  title="Reset Zoom"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>

            {/* Viewport Canvas */}
            <div
              className="skeuo-inset"
              style={{
                height: "560px",
                overflow: "auto",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
                backgroundColor: "#06080F",
              }}
            >
              <div
                style={{
                  position: "relative",
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: "center center",
                  transition: "transform 0.15s ease-out",
                  maxWidth: "100%",
                }}
              >
                {/* Base Screenshot Image */}
                <img
                  src={
                    showEla && manip?.ela_preview_base64
                      ? manip.ela_preview_base64
                      : forensicsApi.downloadArtifactUrl(caseId, selectedArtId)
                  }
                  alt="Forensic Screenshot"
                  style={{
                    maxHeight: "500px",
                    maxWidth: "100%",
                    display: "block",
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
                  }}
                />

                {/* OCR Polygon Overlays */}
                {showOcrPolygons && ocr?.bounding_polygons && (
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none" }}>
                    {ocr.bounding_polygons.map((poly: any, idx: number) => {
                      const isHighlighted = selectedField === poly.field_name;
                      return (
                        <div
                          key={idx}
                          style={{
                            position: "absolute",
                            left: `${poly.polygon[0]}%`,
                            top: `${poly.polygon[1]}%`,
                            width: `${poly.polygon[2] - poly.polygon[0]}%`,
                            height: `${poly.polygon[3] - poly.polygon[1]}%`,
                            border: isHighlighted ? "2px solid #F59E0B" : "1.5px solid rgba(59, 130, 246, 0.8)",
                            backgroundColor: isHighlighted ? "rgba(245, 158, 11, 0.25)" : "rgba(59, 130, 246, 0.12)",
                            borderRadius: "3px",
                            pointerEvents: "auto",
                            cursor: "pointer",
                          }}
                          onClick={() => setSelectedField(poly.field_name)}
                          title={`${poly.field_name}: ${poly.text} (Conf: ${Math.round(poly.confidence * 100)}%)`}
                        >
                          <span
                            style={{
                              position: "absolute",
                              top: "-16px",
                              left: 0,
                              fontSize: "9px",
                              fontFamily: "'IBM Plex Mono', monospace",
                              backgroundColor: isHighlighted ? "#F59E0B" : "#2563EB",
                              color: "#FFFFFF",
                              padding: "1px 4px",
                              borderRadius: "2px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {poly.field_name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Classification & Verdict Bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 18px",
                borderRadius: "12px",
                backgroundColor: manip?.composite_anomaly_score > 0.65 ? "rgba(244, 63, 94, 0.12)" : "rgba(16, 185, 129, 0.12)",
                border: manip?.composite_anomaly_score > 0.65 ? "1px solid rgba(244, 63, 94, 0.3)" : "1px solid rgba(16, 185, 129, 0.3)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {manip?.composite_anomaly_score > 0.65 ? (
                  <AlertTriangle size={18} color="#F43F5E" />
                ) : (
                  <CheckCircle size={18} color="#10B981" />
                )}
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#FFFFFF" }}>
                    Verdict: {manip?.classification || "INCONCLUSIVE"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                    Composite Anomaly Score: <strong>{manip?.composite_anomaly_score?.toFixed(2) || "0.00"} / 1.00</strong> • Resampling Edge Score: {manip?.resampling_edge_score?.toFixed(2) || "0.00"}
                  </div>
                </div>
              </div>

              <span className="lg-badge lg-badge-subtle" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                HUMAN REVIEW MANDATORY
              </span>
            </div>
          </div>

          {/* Right Inspector: Extracted Fields & Discrepancies */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Extracted Financial Fields */}
            <div className="skeuo-card">
              <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 700, color: "#FFFFFF", display: "flex", alignItems: "center", gap: "8px" }}>
                <DollarSign size={16} color="#60A5FA" />
                <span>Extracted Transaction Fields</span>
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {ocr?.extracted_fields && Object.entries(ocr.extracted_fields).map(([k, val]: [string, any]) => {
                  const isSel = selectedField === k;
                  return (
                    <div
                      key={k}
                      onClick={() => setSelectedField(k)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        backgroundColor: isSel ? "rgba(59, 130, 246, 0.18)" : "rgba(255, 255, 255, 0.04)",
                        border: isSel ? "1px solid #3B82F6" : "1px solid rgba(255, 255, 255, 0.06)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "10px", color: "#94A3B8", textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace" }}>
                          {k.replace(/_/g, " ")}
                        </div>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "#FFFFFF", marginTop: "2px" }}>
                          {String(val)}
                        </div>
                      </div>
                      <span className="lg-badge lg-badge-subtle" style={{ fontSize: "9px" }}>
                        OCR
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Financial Ledger Cross-Check */}
            <div className="skeuo-card">
              <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 700, color: "#FFFFFF", display: "flex", alignItems: "center", gap: "8px" }}>
                <Building size={16} color="#FBBF24" />
                <span>CBS Ledger Reconciliation</span>
              </h3>

              {recon && recon.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {recon.map((rf: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        padding: "10px",
                        borderRadius: "8px",
                        backgroundColor: "rgba(244, 63, 94, 0.12)",
                        border: "1px solid rgba(244, 63, 94, 0.3)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#F43F5E", fontWeight: 600, fontSize: "12px" }}>
                        <AlertTriangle size={13} />
                        <span>{rf.finding_type || "DISCREPANCY"}</span>
                      </div>
                      <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#FECDD3", lineHeight: 1.4 }}>
                        {rf.description || JSON.stringify(rf)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "12px", backgroundColor: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "8px", color: "#A7F3D0", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle size={14} color="#10B981" />
                  <span>No financial discrepancy with core bank ledger detected.</span>
                </div>
              )}
            </div>

            {/* Metadata & Software Traces */}
            <div className="skeuo-card">
              <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 700, color: "#FFFFFF", display: "flex", alignItems: "center", gap: "8px" }}>
                <Sliders size={16} color="#A78BFA" />
                <span>EXIF & Software Signatures</span>
              </h3>
              <div style={{ fontSize: "11px", color: "#94A3B8", display: "flex", flexDirection: "column", gap: "6px", fontFamily: "'IBM Plex Mono', monospace" }}>
                <div>Format: <strong style={{ color: "#FFFFFF" }}>{meta?.format || "PNG"}</strong></div>
                <div>Color Mode: <strong style={{ color: "#FFFFFF" }}>{meta?.color_mode || "RGB"}</strong></div>
                <div>EXIF Present: <strong style={{ color: meta?.exif_present ? "#10B981" : "#FBBF24" }}>{meta?.exif_present ? "YES" : "STRIPPED / NONE"}</strong></div>
                <div>Editing Software Flag: <strong style={{ color: meta?.software_trace ? "#F43F5E" : "#10B981" }}>{meta?.software_trace || "None Detected"}</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
