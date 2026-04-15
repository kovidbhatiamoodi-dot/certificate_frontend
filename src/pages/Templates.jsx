import { useEffect, useRef, useState, useContext, useCallback } from "react";
import { Canvas as FabricCanvas, FabricImage, Textbox } from "fabric";
import axios from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const DEFAULT_CANVAS_WIDTH = 800;
const DEFAULT_CANVAS_HEIGHT = 565;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const BACKEND_ORIGIN = API_BASE_URL?.replace(/\/api\/?$/, "");

function Templates() {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);

  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [fields, setFields] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedField, setSelectedField] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");

  // Initialize Fabric canvas
  useEffect(() => {
    const canvas = new FabricCanvas(canvasRef.current, {
      width: DEFAULT_CANVAS_WIDTH,
      height: DEFAULT_CANVAS_HEIGHT,
      backgroundColor: "#d1d5db",
    });
    fabricRef.current = canvas;

    canvas.on("selection:created", (e) => {
      const obj = e.selected?.[0];
      if (obj?.data?.key) setSelectedField(obj.data.key);
    });
    canvas.on("selection:updated", (e) => {
      const obj = e.selected?.[0];
      if (obj?.data?.key) setSelectedField(obj.data.key);
    });
    canvas.on("selection:cleared", () => setSelectedField(null));

    fetchTemplates();

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
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

  // ─── Load background image onto canvas ───
  const loadBackground = useCallback(async (url, targetSize = null) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    try {
      const fullUrl = url.startsWith("http") ? url : `${BACKEND_ORIGIN}${url}`;
      const img = await FabricImage.fromURL(fullUrl, { crossOrigin: "anonymous" });

      const element = img.getElement ? img.getElement() : null;
      const sourceWidth =
        element?.naturalWidth ||
        element?.width ||
        img.width ||
        DEFAULT_CANVAS_WIDTH;
      const sourceHeight =
        element?.naturalHeight ||
        element?.height ||
        img.height ||
        DEFAULT_CANVAS_HEIGHT;

      const targetWidth = targetSize?.width || sourceWidth;
      const targetHeight = targetSize?.height || sourceHeight;

      canvas.setDimensions({ width: targetWidth, height: targetHeight });

      img.set({
        originX: "left",
        originY: "top",
        left: 0,
        top: 0,
        scaleX: targetWidth / sourceWidth,
        scaleY: targetHeight / sourceHeight,
      });

      canvas.backgroundImage = img;
      canvas.renderAll();
    } catch (err) {
      console.error("Failed to load background:", err);
    }
  }, []);

  // ─── Upload template image ───
  const handleImageUpload = async () => {
    if (!imageFile) return alert("Select an image first");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", imageFile);
      const res = await axios.post("/templates/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setBackgroundUrl(res.data.imageUrl);
      await loadBackground(res.data.imageUrl);
    } catch (err) {
      alert("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  // ─── Add field to canvas ───
  const addField = () => {
    const key = prompt("Enter field key (must match CSV column name, e.g. name, competition, position):");
    if (!key || !key.trim()) return;

    const trimmedKey = key.trim().toLowerCase().replace(/\s+/g, "_");

    // Check for duplicate
    if (fields.some((f) => f.key === trimmedKey)) {
      return alert(`Field "${trimmedKey}" already exists`);
    }

    const canvas = fabricRef.current;
    if (!canvas) return;

    const text = new Textbox(`{{${trimmedKey}}}`, {
      left: (canvas.getWidth() || DEFAULT_CANVAS_WIDTH) / 2,
      top: (canvas.getHeight() || DEFAULT_CANVAS_HEIGHT) / 2,
      fontSize: 24,
      fill: "#000000",
      fontFamily: "Rubik",
      originX: "left",
      originY: "top",
      editable: false,
      hasControls: true,
      hasBorders: true,
      data: { key: trimmedKey },
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();

    setFields((prev) => [
      ...prev,
      { key: trimmedKey, fontSize: 24, fontColor: "#000000" },
    ]);
    setSelectedField(trimmedKey);
  };

  // ─── Update field property ───
  const updateFieldProp = (key, prop, value) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Update canvas object
    const obj = canvas.getObjects().find((o) => o.data?.key === key);
    if (obj) {
      if (prop === "fontSize") {
        obj.set("fontSize", parseInt(value) || 24);
      } else if (prop === "fontColor") {
        obj.set("fill", value);
      }
      canvas.renderAll();
    }

    // Update state
    setFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, [prop]: value } : f))
    );
  };

  // ─── Remove field ───
  const removeField = (key) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const obj = canvas.getObjects().find((o) => o.data?.key === key);
    if (obj) {
      canvas.remove(obj);
      canvas.renderAll();
    }

    setFields((prev) => prev.filter((f) => f.key !== key));
    if (selectedField === key) setSelectedField(null);
  };

  // ─── Read field positions from canvas ───
  const getFieldsFromCanvas = () => {
    const canvas = fabricRef.current;
    if (!canvas) return [];

    return canvas.getObjects().map((obj) => ({
      key: obj.data?.key || "field",
      x: Number((obj.left || 0).toFixed(2)),
      y: Number((obj.top || 0).toFixed(2)),
      originX: obj.originX || "left",
      originY: obj.originY || "top",
      fontSize: obj.fontSize || 24,
      fontColor: obj.fill || "#000000",
      fontFamily: "Rubik",
    }));
  };

  // ─── Save template ───
  const handleSave = async () => {
    if (!templateName.trim()) return alert("Enter a template name");
    if (!backgroundUrl) return alert("Upload a background image first");

    const canvasFields = getFieldsFromCanvas();
    if (canvasFields.length === 0) return alert("Add at least one field");
    if (admin?.role === "superadmin" && !selectedDepartmentId) {
      return alert("Select a department");
    }

    setSaving(true);

    const payload = {
      name: templateName,
      background_url: backgroundUrl,
      fields_json: {
        canvasWidth: fabricRef.current?.getWidth() || DEFAULT_CANVAS_WIDTH,
        canvasHeight: fabricRef.current?.getHeight() || DEFAULT_CANVAS_HEIGHT,
        fields: canvasFields,
      },
      ...(admin?.role === "superadmin"
        ? { department_id: Number(selectedDepartmentId) }
        : {}),
    };

    try {
      if (editingId) {
        await axios.put(`/templates/${editingId}`, payload);
        alert("Template updated ✅");
      } else {
        await axios.post("/templates", payload);
        alert("Template created ✅");
      }

      resetEditor();
      fetchTemplates();
    } catch (err) {
      alert(err.response?.data?.message || "Save failed ❌");
    } finally {
      setSaving(false);
    }
  };

  // ─── Load template into editor ───
  const editTemplate = async (template) => {
    setEditingId(template.id);
    setTemplateName(template.name);
    setBackgroundUrl(template.background_url);
    if (template.department_id) {
      setSelectedDepartmentId(String(template.department_id));
    }

    const canvas = fabricRef.current;
    if (!canvas) return;

    // Clear canvas
    canvas.clear();
    canvas.backgroundColor = "#d1d5db";

    // Load fields
    const config = template.fields_json || {};
    const configWidth = config.canvasWidth || DEFAULT_CANVAS_WIDTH;
    const configHeight = config.canvasHeight || DEFAULT_CANVAS_HEIGHT;

    canvas.setDimensions({ width: configWidth, height: configHeight });

    // Load background
    if (template.background_url) {
      await loadBackground(template.background_url, {
        width: configWidth,
        height: configHeight,
      });
    }

    const fieldsList = config.fields || [];

    for (const field of fieldsList) {
      const text = new Textbox(`{{${field.key}}}`, {
        left: field.x || configWidth / 2,
        top: field.y || configHeight / 2,
        fontSize: field.fontSize || 24,
        fill: field.fontColor || "#000000",
        fontFamily: "Rubik",
        originX: field.originX || "center",
        originY: field.originY || "center",
        editable: false,
        data: { key: field.key },
      });
      canvas.add(text);
    }

    canvas.renderAll();

    setFields(
      fieldsList.map((f) => ({
        key: f.key,
        fontSize: f.fontSize || 24,
        fontColor: f.fontColor || "#000000",
      }))
    );
  };

  // ─── Delete template ───
  const deleteTemplate = async (id) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await axios.delete(`/templates/${id}`);
      fetchTemplates();
      if (editingId === id) resetEditor();
    } catch (err) {
      alert("Delete failed");
    }
  };

  // ─── Reset editor ───
  const resetEditor = () => {
    setEditingId(null);
    setTemplateName("");
    setBackgroundUrl("");
    setImageFile(null);
    setFields([]);
    setSelectedField(null);
    setSelectedDepartmentId("");

    const canvas = fabricRef.current;
    if (canvas) {
      canvas.clear();
      canvas.setDimensions({
        width: DEFAULT_CANVAS_WIDTH,
        height: DEFAULT_CANVAS_HEIGHT,
      });
      canvas.backgroundColor = "#d1d5db";
      canvas.renderAll();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="text-gray-400 hover:text-white transition-colors">
              ← Back
            </button>
            <h1 className="text-xl font-bold text-white">Template Editor</h1>
          </div>
          <span className="text-sm text-gray-400">
            {admin?.department_name}
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ─── Editor Panel (2 cols) ─── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Name + Image Upload */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  {editingId ? "Edit Template" : "New Template"}
                </h2>
                {editingId && (
                  <button onClick={resetEditor} className="text-sm text-gray-400 hover:text-white">
                    Cancel Edit
                  </button>
                )}
              </div>

              <input
                type="text"
                placeholder="Template Name (e.g. Compi Certificate)"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              {admin?.role === "superadmin" && (
                <select
                  value={selectedDepartmentId}
                  onChange={(e) => setSelectedDepartmentId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className="flex-1 text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-500/20 file:text-indigo-300 hover:file:bg-indigo-500/30 file:cursor-pointer"
                />
                <button
                  onClick={handleImageUpload}
                  disabled={uploading || !imageFile}
                  className="px-4 py-2 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-all"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
              {backgroundUrl && (
                <p className="text-xs text-emerald-400">✅ Background image loaded</p>
              )}
            </div>

            {/* Canvas */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-300">
                  Canvas — drag fields to position them
                </h3>
                <button
                  onClick={addField}
                  className="px-4 py-2 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 transition-all"
                >
                  + Add Field
                </button>
              </div>
              <div className="border border-gray-600/30 rounded-lg overflow-auto max-w-full">
                <canvas ref={canvasRef} className="block" />
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 transition-all"
            >
              {saving
                ? "Saving..."
                : editingId
                ? "Update Template"
                : "Save Template"}
            </button>
          </div>

          {/* ─── Sidebar ─── */}
          <div className="space-y-6">
            {/* Field Properties */}
            {fields.length > 0 && (
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
                <h3 className="text-sm font-medium text-gray-300 mb-4">
                  Fields ({fields.length})
                </h3>
                <div className="space-y-3">
                  {fields.map((f) => (
                    <div
                      key={f.key}
                      className={`p-3 rounded-lg border transition-all ${
                        selectedField === f.key
                          ? "border-indigo-500/50 bg-indigo-500/10"
                          : "border-gray-700/50 bg-gray-900/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-mono text-indigo-300">
                          {f.key}
                        </span>
                        <button
                          onClick={() => removeField(f.key)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500">Size</label>
                        <input
                          type="number"
                          value={f.fontSize}
                          onChange={(e) =>
                            updateFieldProp(f.key, "fontSize", e.target.value)
                          }
                          className="w-16 px-2 py-1 bg-gray-900/50 border border-gray-600/50 rounded text-white text-xs text-center"
                        />
                        <label className="text-xs text-gray-500">Color</label>
                        <input
                          type="color"
                          value={f.fontColor}
                          onChange={(e) =>
                            updateFieldProp(f.key, "fontColor", e.target.value)
                          }
                          className="w-8 h-6 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Existing Templates */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
              <h3 className="text-sm font-medium text-gray-300 mb-4">
                Your Templates ({templates.length})
              </h3>
              {templates.length === 0 ? (
                <p className="text-sm text-gray-500">No templates yet</p>
              ) : (
                <div className="space-y-2">
                  {templates.map((t) => (
                    <div
                      key={t.id}
                      className={`p-3 rounded-lg border transition-all ${
                        editingId === t.id
                          ? "border-indigo-500/50 bg-indigo-500/10"
                          : "border-gray-700/50 bg-gray-900/30 hover:border-gray-600/50"
                      }`}
                    >
                      <p className="text-sm font-medium text-white">{t.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {(t.fields_json?.fields || []).length} fields
                        {t.department_name && ` · ${t.department_name}`}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => editTemplate(t)}
                          className="text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteTemplate(t.id)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Templates;