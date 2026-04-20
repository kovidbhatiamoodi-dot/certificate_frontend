import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";
import { API_ENDPOINTS } from "../api/endpoints";
import { AuthContext } from "../context/AuthContext";

function IdentityMapping() {
  const navigate = useNavigate();
  const { admin } = useContext(AuthContext);

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const escapeCsvValue = (value) => {
    const text = String(value ?? "");
    if (/[,"\n\r]/.test(text)) {
      return `"${text.replaceAll('"', '""')}"`;
    }
    return text;
  };

  const downloadSkippedRowsCsv = () => {
    if (!result?.skippedRows?.length) {
      return;
    }

    const rows = result.skippedRows;
    const headers = ["rowNumber", "reason", "email", "mi_no", "row_json"];
    const csvLines = [
      headers.join(","),
      ...rows.map((item) => {
        const rowJson = JSON.stringify(item.row || {});
        return [
          item.rowNumber,
          item.reason,
          item.row?.email || "",
          item.row?.mi_no || "",
          rowJson,
        ]
          .map(escapeCsvValue)
          .join(",");
      }),
    ];

    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `skipped-identity-rows-${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    setError("");
    setResult(null);

    if (!file) {
      setError("Please select a CSV file");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(API_ENDPOINTS.IDENTITY_MAPPING_UPLOAD, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload identity mapping CSV");
    } finally {
      setUploading(false);
    }
  };

  if (admin?.role !== "superadmin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-gray-400 hover:text-white mb-4"
          >
            ← Back
          </button>
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg">
            Only superadmin can access identity mapping upload.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="text-gray-400 hover:text-white">
            ← Back
          </button>
          <h1 className="text-xl font-bold text-white">Identity Mapping Upload</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Upload Central Email-MI CSV</h2>
          <p className="text-sm text-gray-400 mb-4">
            CSV must contain columns: email, mi_no. Upload replaces central mapping used by user portal login.
          </p>

          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-500/20 file:text-indigo-300 hover:file:bg-indigo-500/30 file:cursor-pointer"
          />

          <div className="mt-5">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploading ? "Uploading..." : "Upload CSV"}
            </button>
          </div>

          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-4 space-y-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              <div>
                <div className="font-medium">{result.message}</div>
                <div className="mt-1 text-emerald-200/80">
                  Total mappings saved: {result.total}
                  {typeof result.skippedCount === "number" ? ` · Skipped rows: ${result.skippedCount}` : ""}
                </div>
              </div>

              {Array.isArray(result.skippedRows) && result.skippedRows.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-amber-200">Skipped rows</div>
                    <button
                      type="button"
                      onClick={downloadSkippedRowsCsv}
                      className="rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-400/20"
                    >
                      Download CSV
                    </button>
                  </div>
                  <div className="mt-3 max-h-72 space-y-2 overflow-auto pr-1 text-xs">
                    {result.skippedRows.map((item) => (
                      <div
                        key={`${item.rowNumber}-${item.reason}`}
                        className="rounded-md border border-amber-400/20 bg-black/10 p-3"
                      >
                        <div className="font-medium">Row {item.rowNumber}</div>
                        <div className="mt-1 text-amber-100/90">{item.reason}</div>
                        {item.row && (
                          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-[11px] text-amber-50/80">
                            {JSON.stringify(item.row, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default IdentityMapping;
