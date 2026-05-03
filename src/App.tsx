import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LangProvider } from "@/i18n/LangContext";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminFlats from "./pages/admin/AdminFlats";
import AdminFlatsTable from "./pages/admin/AdminFlatsTable";
import AdminShops from "./pages/admin/AdminShops";
import AdminParking from "./pages/admin/AdminParking";
import AdminDues from "./pages/admin/AdminDues";
import AdminExpenses from "./pages/admin/AdminExpenses";
import AdminReports from "./pages/admin/AdminReports";
import AdminNotices from "./pages/admin/AdminNotices";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminSettingsHistory from "./pages/admin/AdminSettingsHistory";
import AdminLedger from "./pages/admin/AdminLedger";
import AdminLoans from "./pages/admin/AdminLoans";
import AdminCommittee from "./pages/admin/AdminCommittee";
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerDues from "./pages/owner/OwnerDues";
import OwnerPayments from "./pages/owner/OwnerPayments";
import OwnerNotices from "./pages/owner/OwnerNotices";
import OwnerReports from "./pages/owner/OwnerReports";
import OwnerLedger from "./pages/owner/OwnerLedger";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LangProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />

              {/* Admin */}
              <Route path="/admin" element={<ProtectedRoute requireRole="admin"><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/flats" element={<ProtectedRoute requireRole="admin"><AdminFlats /></ProtectedRoute>} />
              <Route path="/admin/shops" element={<ProtectedRoute requireRole="admin"><AdminShops /></ProtectedRoute>} />
              <Route path="/admin/parking" element={<ProtectedRoute requireRole="admin"><AdminParking /></ProtectedRoute>} />
              <Route path="/admin/dues" element={<ProtectedRoute requireRole="admin"><AdminDues /></ProtectedRoute>} />
              <Route path="/admin/ledger" element={<ProtectedRoute requireRole="admin"><AdminLedger /></ProtectedRoute>} />
              <Route path="/admin/expenses" element={<ProtectedRoute requireRole="admin"><AdminExpenses /></ProtectedRoute>} />
              <Route path="/admin/loans" element={<ProtectedRoute requireRole="admin"><AdminLoans /></ProtectedRoute>} />
              <Route path="/admin/reports" element={<ProtectedRoute requireRole="admin"><AdminReports /></ProtectedRoute>} />
              <Route path="/admin/notices" element={<ProtectedRoute requireRole="admin"><AdminNotices /></ProtectedRoute>} />
              <Route path="/admin/committee" element={<ProtectedRoute requireRole="admin"><AdminCommittee /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute requireRole="admin"><AdminSettings /></ProtectedRoute>} />
              <Route path="/admin/settings/history" element={<ProtectedRoute requireRole="admin"><AdminSettingsHistory /></ProtectedRoute>} />

              {/* Owner */}
              <Route path="/owner" element={<ProtectedRoute requireRole="owner"><OwnerDashboard /></ProtectedRoute>} />
              <Route path="/owner/dues" element={<ProtectedRoute requireRole="owner"><OwnerDues /></ProtectedRoute>} />
              <Route path="/owner/payments" element={<ProtectedRoute requireRole="owner"><OwnerPayments /></ProtectedRoute>} />
              <Route path="/owner/ledger" element={<ProtectedRoute requireRole="owner"><OwnerLedger /></ProtectedRoute>} />
              <Route path="/owner/notices" element={<ProtectedRoute requireRole="owner"><OwnerNotices /></ProtectedRoute>} />
              <Route path="/owner/reports" element={<ProtectedRoute requireRole="owner"><OwnerReports /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LangProvider>
  </QueryClientProvider>
);

export default App;
