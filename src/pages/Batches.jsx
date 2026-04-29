import { useEffect, useState, useContext } from "react";
import axios from "../api/axios";
import { API_ENDPOINTS, withId } from "../api/endpoints";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const BACKEND_ORIGIN = API_BASE_URL?.replace(/\/api\/?$/, "");

function Batches() {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();

  const [batches, setBatches] = useState([]);
  const [expandedBatch, setExpandedBatch] = useState(null);
  const [batchEntries, setBatchEntries] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [releasing, setReleasing] = useState(null);
  const [downloadingBatch, setDownloadingBatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_ENDPOINTS.BATCHES);
      setBatches(res.data);
    } catch (err) {
      console.error("Failed to fetch batches:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = async (batchId) => {
    if (expandedBatch === batchId) {
      setExpandedBatch(null);
      setBatchEntries([]);
      return;
    }

    try {
      const res = await axios.get(withId(API_ENDPOINTS.BATCHES, batchId));
      setExpandedBatch(batchId);
      setBatchEntries(res.data.entries || []);
    } catch (err) {
      alert("Failed to load batch details");
    }
  };

  const handlePreview = async (batchId) => {
    try {
      const res = await axios.get(withId(API_ENDPOINTS.CERTIFICATES_PREVIEW, batchId));
      setPreviewData(res.data);
    } catch (err) {
      alert("Preview failed");
    }
  };

  const handleRelease = async (batchId) => {
    if (!confirm("Are you sure you want to release this batch? PDFs will be generated on download and not saved locally.")) return;

    setReleasing(batchId);
    try {
      const res = await axios.post(withId(API_ENDPOINTS.CERTIFICATES_RELEASE, batchId));
      alert(`${res.data.message}\n${res.data.successCount}/${res.data.total} certificates generated`);
      fetchBatches();
    } catch (err) {
      alert(err.response?.data?.message || "Release failed");
    } finally {
      setReleasing(null);
    }
  };

  const handleDownloadCertificate = async (entryId, miNo) => {
    try {
      const res = await axios.get(withId(API_ENDPOINTS.CERTIFICATES_DOWNLOAD, entryId), {
        responseType: "blob",
      });

      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      const safeMiNo = String(miNo || "certificate").replace(/[^a-zA-Z0-9_-]/g, "_");
      link.href = blobUrl;
      link.download = `certificate_${safeMiNo}_${entryId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert(err.response?.data?.message || "Download failed");
    }
  };

  const handleDownloadBatchCertificates = async (batch) => {
    try {
      setDownloadingBatch(batch.id);
      const res = await axios.get(withId(API_ENDPOINTS.CERTIFICATES_DOWNLOAD_BATCH, batch.id), {
        responseType: "blob",
      });

      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      const safeBatchName = String(batch.name || "batch").replace(/[^a-zA-Z0-9_-]/g, "_");
      link.href = blobUrl;
      link.download = `batch_${safeBatchName}_${batch.id}_certificates.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert(err.response?.data?.message || "Batch download failed");
    } finally {
      setDownloadingBatch(null);
    }
  };

  const handleRevokeCertificate = async (entryId) => {
    if (!confirm("Revoke this certificate only? The participant's other certificates will remain available.")) return;

    try {
      await axios.patch(withId(API_ENDPOINTS.CERTIFICATES_REVOKE, entryId));
      if (expandedBatch) {
        const res = await axios.get(withId(API_ENDPOINTS.BATCHES, expandedBatch));
        setBatchEntries(res.data.entries || []);
      }
      fetchBatches();
    } catch (err) {
      alert(err.response?.data?.message || "Revoke failed");
    }
  };

  const handleRevokeBatch = async (batchId) => {
    if (!confirm("Revoke all certificates in this batch? This will hide them from users.")) return;

    try {
      const res = await axios.patch(withId(API_ENDPOINTS.CERTIFICATES_REVOKE_BATCH, batchId));
      alert(`${res.data.message}\nRevoked: ${res.data.revokedCount}`);

      if (expandedBatch === batchId) {
        const detail = await axios.get(withId(API_ENDPOINTS.BATCHES, batchId));
        setBatchEntries(detail.data.entries || []);
      }

      fetchBatches();
    } catch (err) {
      alert(err.response?.data?.message || "Batch revoke failed");
    }
  };

  const handleDelete = async (batchId) => {
    if (!confirm("Delete this batch? This action cannot be undone.")) return;
    try {
      await axios.delete(withId(API_ENDPOINTS.BATCHES, batchId));
      fetchBatches();
      if (expandedBatch === batchId) {
        setExpandedBatch(null);
        setBatchEntries([]);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const statusBadge = (status) => {
    const styles = {
      DRAFT: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      RELEASED: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || ""}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="text-gray-400 hover:text-white">
              ← Back
            </button>
            <h1 className="text-xl font-bold text-white">Certificate Batches</h1>
          </div>
          <button
            onClick={() => navigate("/create-batch")}
            className="px-4 py-2 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 transition-all"
          >
            + New Batch
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading batches...</div>
        ) : batches.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 mb-4">No batches yet</p>
            <button
              onClick={() => navigate("/create-batch")}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl"
            >
              Create your first batch
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {batches.map((batch) => (
              <div key={batch.id} className="bg-gray-800/50 border border-gray-700/50 rounded-2xl overflow-hidden">
                {/* Batch Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-white">{batch.name}</h3>
                        {statusBadge(batch.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>📋 {batch.template_name}</span>
                        <span>👥 {batch.entry_count} entries</span>
                        {batch.department_name && <span>🏢 {batch.department_name}</span>}
                        <span>📅 {new Date(batch.created_at).toLocaleDateString()}</span>
                        {batch.released_at && (
                          <span className="text-emerald-400">
                            ✅ Released {new Date(batch.released_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleExpand(batch.id)}
                        className="px-3 py-1.5 text-sm text-gray-300 hover:text-white bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-all"
                      >
                        {expandedBatch === batch.id ? "Hide" : "View"}
                      </button>
                      <button
                        onClick={() => handlePreview(batch.id)}
                        className="px-3 py-1.5 text-sm text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-all"
                      >
                        Preview
                      </button>
                      {batch.status === "RELEASED" && (
                        <button
                          onClick={() => handleDownloadBatchCertificates(batch)}
                          disabled={downloadingBatch === batch.id}
                          className="px-3 py-1.5 text-sm text-sky-300 hover:text-sky-200 bg-sky-500/10 hover:bg-sky-500/20 rounded-lg transition-all disabled:opacity-50"
                        >
                          {downloadingBatch === batch.id ? "Downloading..." : "⬇ Download All"}
                        </button>
                      )}
                      {batch.status === "DRAFT" && (
                        <>
                          <button
                            onClick={() => handleRelease(batch.id)}
                            disabled={releasing === batch.id}
                            className="px-3 py-1.5 text-sm text-emerald-300 hover:text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-all disabled:opacity-50"
                          >
                            {releasing === batch.id ? "Releasing..." : "🚀 Release"}
                          </button>
                          <button
                            onClick={() => handleDelete(batch.id)}
                            className="px-3 py-1.5 text-sm text-red-300 hover:text-red-200 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all"
                          >
                            Delete
                          </button>
                        </>
                      )}

                      {batch.status === "RELEASED" && (
                        <>
                          <button
                            onClick={() => handleRevokeBatch(batch.id)}
                            className="px-3 py-1.5 text-sm text-red-300 hover:text-red-200 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all"
                          >
                            Revoke Batch
                          </button>
                          <button
                            onClick={() => handleDelete(batch.id)}
                            className="px-3 py-1.5 text-sm text-red-300 hover:text-red-200 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all"
                          >
                            Delete Batch
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Entries */}
                {expandedBatch === batch.id && (
                  <div className="border-t border-gray-700/50 p-6 bg-gray-900/30">
                    {batchEntries.length === 0 ? (
                      <p className="text-gray-500 text-sm">No entries</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-700">
                              <th className="py-2 px-3 text-left text-xs font-medium text-gray-400">#</th>
                              <th className="py-2 px-3 text-left text-xs font-medium text-gray-400">MI No</th>
                              {batchEntries[0] &&
                                Object.keys(
                                  typeof batchEntries[0].field_data === "string"
                                    ? JSON.parse(batchEntries[0].field_data)
                                    : batchEntries[0].field_data
                                ).map((key) => (
                                  <th key={key} className="py-2 px-3 text-left text-xs font-medium text-gray-400 uppercase">
                                    {key}
                                  </th>
                                ))}
                              {batch.status === "RELEASED" && (
                                <th className="py-2 px-3 text-left text-xs font-medium text-gray-400">Certificate</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {batchEntries.map((entry, i) => {
                              const data =
                                typeof entry.field_data === "string"
                                  ? JSON.parse(entry.field_data)
                                  : entry.field_data;
                              return (
                                <tr key={entry.id} className="border-b border-gray-800/50">
                                  <td className="py-2 px-3 text-gray-500">{i + 1}</td>
                                  <td className="py-2 px-3 text-indigo-300 font-mono">{entry.mi_no}</td>
                                  {Object.values(data).map((val, j) => (
                                    <td key={j} className="py-2 px-3 text-gray-300">{val}</td>
                                  ))}
                                  {batch.status === "RELEASED" && (
                                    <td className="py-2 px-3">
                                      <div className="flex items-center gap-3">
                                        {entry.revoked_at ? (
                                          <span className="text-xs text-red-300">Revoked</span>
                                        ) : (
                                          <>
                                            <button
                                              onClick={() => handleDownloadCertificate(entry.id, entry.mi_no)}
                                              className="text-emerald-400 hover:text-emerald-300 text-xs"
                                            >
                                              📄 Download
                                            </button>
                                            <button
                                              onClick={() => handleRevokeCertificate(entry.id)}
                                              className="text-red-400 hover:text-red-300 text-xs"
                                            >
                                              Revoke
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Preview Modal */}
        {previewData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Certificate Preview</h3>
                <button
                  onClick={() => setPreviewData(null)}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-400 mb-3">
                  MI No: <span className="text-indigo-300">{previewData.mi_no}</span>
                </p>
                <div
                  className="relative border border-gray-600/30 rounded-lg overflow-hidden mx-auto"
                  style={{
                    width: previewData.canvasWidth || 800,
                    height: previewData.canvasHeight || 565,
                    backgroundImage: previewData.background_url
                      ? `url(${BACKEND_ORIGIN}${previewData.background_url})`
                      : "none",
                    backgroundSize: "100% 100%",
                    backgroundPosition: "center",
                    backgroundColor: "#e5e7eb",
                  }}
                >
                  {(previewData.fields || []).map((field, i) => (
                    <span
                      key={i}
                      style={{
                        position: "absolute",
                        left: field.x,
                        top: field.y,
                        display: "inline-block",
                        whiteSpace: "nowrap",
                        lineHeight: 1,
                        fontSize: field.fontSize || 24,
                        color: field.fontColor || "#000",
                        fontFamily: "Rubik",
                        transform:
                          (field.originX || "center") === "center" &&
                          (field.originY || "center") === "center"
                            ? "translate(-50%, -50%)"
                            : "none",
                        transformOrigin:
                          (field.originX || "center") === "center" &&
                          (field.originY || "center") === "center"
                            ? "center center"
                            : "left top",
                      }}
                    >
                      {previewData.fieldData[field.key] || `{{${field.key}}}`}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Batches;
