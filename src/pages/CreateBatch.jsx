import { useEffect, useState, useContext } from "react";
import axios from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

function CreateBatch() {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();

  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState("");
  const [batchName, setBatchName] = useState("");
  const [csvFile, setCsvFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [creating, setCreating] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await axios.get("/templates");
      setTemplates(res.data);
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await axios.get("/templates/departments");
      setDepartments(res.data || []);
    } catch (err) {
      console.error("Failed to fetch departments:", err);
    }
  };

  useEffect(() => {
    if (admin?.role === "superadmin") {
      fetchDepartments();
    }
  }, [admin?.role]);

  // Parse CSV on frontend for preview
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setCsvFile(file);
    setPreview(null);

    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        setPreview({ headers: [], rows: [], error: "CSV must have headers + at least 1 row" });
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
      const rows = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        if (values.length !== headers.length) continue;
        const obj = {};
        headers.forEach((h, idx) => (obj[h] = values[idx]));
        rows.push(obj);
      }

      // Validate mi_no exists
      if (!headers.includes("mi_no") && !headers.includes("mi_no.")) {
        setPreview({ headers, rows, error: "CSV must contain a 'mi_no' column" });
        return;
      }

      setPreview({ headers, rows, error: null });
    };
    reader.readAsText(file);
  };

  // Validate CSV columns match template fields
  const getSelectedTemplate = () => templates.find((t) => t.id === parseInt(templateId));

  const visibleTemplates =
    admin?.role === "superadmin" && selectedDepartmentId
      ? templates.filter((t) => String(t.department_id) === selectedDepartmentId)
      : templates;

  const getValidation = () => {
    if (!preview || !templateId) return null;
    const template = getSelectedTemplate();
    if (!template) return null;

    const templateFields = (template.fields_json?.fields || []).map((f) => f.key);
    const csvCols = preview.headers.filter((h) => h !== "mi_no" && h !== "mi_no.");
    const missing = templateFields.filter((f) => !csvCols.includes(f));
    const extra = csvCols.filter((c) => !templateFields.includes(c));

    return { templateFields, csvCols, missing, extra };
  };

  const handleCreate = async () => {
    if (!templateId || !batchName.trim() || !csvFile) {
      return alert("Fill all fields: template, batch name, and CSV");
    }

    if (admin?.role === "superadmin" && !selectedDepartmentId) {
      return alert("Select a department");
    }

    setCreating(true);

    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      formData.append("template_id", templateId);
      formData.append("name", batchName);
      if (admin?.role === "superadmin") {
        formData.append("department_id", selectedDepartmentId);
      }

      const res = await axios.post("/batches", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert(`Batch created! ${res.data.entry_count} entries added ✅`);
      navigate("/batches");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create batch");
    } finally {
      setCreating(false);
    }
  };

  const validation = getValidation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="text-gray-400 hover:text-white">
            ← Back
          </button>
          <h1 className="text-xl font-bold text-white">Create Certificate Batch</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Step 1: Select Template */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">1. Select Template</h2>

          {admin?.role === "superadmin" && (
            <div className="mb-3">
              <label className="block text-sm text-gray-400 mb-2">Department</label>
              <select
                value={selectedDepartmentId}
                onChange={(e) => {
                  setSelectedDepartmentId(e.target.value);
                  setTemplateId("");
                }}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Choose a department...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            disabled={admin?.role === "superadmin" && !selectedDepartmentId}
            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Choose a template...</option>
            {visibleTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({(t.fields_json?.fields || []).map((f) => f.key).join(", ")})
              </option>
            ))}
          </select>

          {templateId && getSelectedTemplate() && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-gray-400">Template fields:</span>
              {(getSelectedTemplate().fields_json?.fields || []).map((f) => (
                <span key={f.key} className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-mono">
                  {f.key}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Step 2: Batch Name */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">2. Batch Name</h2>
          <input
            type="text"
            placeholder='e.g. "CodeWars Winners", "PR Team Certificates", "Hackathon Participants"'
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Step 3: Upload CSV */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">3. Upload CSV</h2>
          <p className="text-sm text-gray-400 mb-3">
            CSV must have a <code className="text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded">mi_no</code> column + columns matching the template fields above.
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-500/20 file:text-emerald-300 hover:file:bg-emerald-500/30 file:cursor-pointer"
          />
        </div>

        {/* Validation */}
        {validation && (
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">Column Mapping</h2>
            {validation.missing.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-3 text-sm">
                ⚠️ Missing CSV columns for template fields:{" "}
                <strong>{validation.missing.join(", ")}</strong>
              </div>
            )}
            {validation.missing.length === 0 && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-lg mb-3 text-sm">
                ✅ All template fields found in CSV
              </div>
            )}
            {validation.extra.length > 0 && (
              <p className="text-xs text-gray-500">
                Extra CSV columns (will be stored but not on certificate): {validation.extra.join(", ")}
              </p>
            )}
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">
              CSV Preview ({preview.rows.length} entries)
            </h2>

            {preview.error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-3 text-sm">
                {preview.error}
              </div>
            )}

            {!preview.error && preview.rows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      {preview.headers.map((h) => (
                        <th key={h} className="py-2 px-3 text-left text-xs font-medium text-gray-400 uppercase">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-b border-gray-800/50">
                        {preview.headers.map((h) => (
                          <td key={h} className="py-2 px-3 text-gray-300">
                            {row[h]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.rows.length > 10 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Showing 10 of {preview.rows.length} entries...
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Create Button */}
        <button
          onClick={handleCreate}
          disabled={creating || !templateId || !batchName.trim() || !csvFile || preview?.error}
          className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {creating ? "Creating..." : "Create Batch (Draft)"}
        </button>

        <p className="text-center text-xs text-gray-500">
          The batch will be created as a Draft. You can preview and release it from the Batches page.
        </p>
      </main>
    </div>
  );
}

export default CreateBatch;
