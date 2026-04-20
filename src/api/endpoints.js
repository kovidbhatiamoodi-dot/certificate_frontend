const getEnv = (key, fallback) => {
  const value = import.meta.env[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
};

export const API_ENDPOINTS = {
  AUTH_LOGIN: getEnv("VITE_API_AUTH_LOGIN", "/auth/login"),
  TEMPLATES: getEnv("VITE_API_TEMPLATES", "/templates"),
  TEMPLATE_DEPARTMENTS: getEnv("VITE_API_TEMPLATE_DEPARTMENTS", "/templates/departments"),
  TEMPLATE_UPLOAD_IMAGE: getEnv("VITE_API_TEMPLATE_UPLOAD_IMAGE", "/templates/upload-image"),
  BATCHES: getEnv("VITE_API_BATCHES", "/batches"),
  CERTIFICATES_PREVIEW: getEnv("VITE_API_CERTIFICATES_PREVIEW", "/certificates/preview"),
  CERTIFICATES_RELEASE: getEnv("VITE_API_CERTIFICATES_RELEASE", "/certificates/release"),
  CERTIFICATES_REVOKE_BATCH: getEnv("VITE_API_CERTIFICATES_REVOKE_BATCH", "/certificates/revoke-batch"),
  CERTIFICATES_DOWNLOAD: getEnv("VITE_API_CERTIFICATES_DOWNLOAD", "/certificates/download"),
  CERTIFICATES_REVOKE: getEnv("VITE_API_CERTIFICATES_REVOKE", "/certificates/revoke"),
  IDENTITY_MAPPING_UPLOAD: getEnv("VITE_API_IDENTITY_MAPPING_UPLOAD", "/identity-mapping/upload"),
};

export const withId = (basePath, id) => `${basePath}/${encodeURIComponent(id)}`;
