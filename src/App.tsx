import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Entregador from "@/pages/Entregador";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import CompanyLogin from "@/pages/CompanyLogin";
import CompanyHome from "@/pages/CompanyHome";
import CompanyEntregador from "@/pages/CompanyEntregador";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin-login" element={<AdminLogin />} />

        <Route
          path="/"
          element={
            <ProtectedRoute allowedRoles="operacional">
              <Home />
            </ProtectedRoute>
          }
        />

        <Route path="/entregador" element={<Entregador />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute
              allowedRoles="platform_admin"
              guardType="platform-admin"
            >
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="/c/:slug/login" element={<CompanyLogin />} />
        <Route path="/c/:slug/" element={<CompanyHome />} />
        <Route path="/c/:slug/entregador" element={<CompanyEntregador />} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
