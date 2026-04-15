import { Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Templates from "../pages/Templates";
import CreateBatch from "../pages/CreateBatch";
import Batches from "../pages/Batches";
import IdentityMapping from "../pages/IdentityMapping";

// Protected wrapper
function Protected({ children }) {
  const { token } = useContext(AuthContext);
  if (!token) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/templates" element={<Protected><Templates /></Protected>} />
      <Route path="/create-batch" element={<Protected><CreateBatch /></Protected>} />
      <Route path="/batches" element={<Protected><Batches /></Protected>} />
      <Route path="/identity-mapping" element={<Protected><IdentityMapping /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;