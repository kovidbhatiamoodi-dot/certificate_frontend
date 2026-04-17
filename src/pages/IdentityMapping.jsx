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
            <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-lg text-sm">
              {result.message} Total mappings: {result.total}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default IdentityMapping;
