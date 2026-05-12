import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Route, Routes } from "react-router-dom";

// Use HashRouter on native (Capacitor file://) so routes resolve correctly inside Android/iOS WebView.
const isNative =
  typeof window !== "undefined" &&
  (window.location.protocol === "file:" ||
    window.location.protocol === "capacitor:" ||
    // @ts-ignore
    !!(window as any).Capacitor?.isNativePlatform?.());
const Router = isNative ? HashRouter : BrowserRouter;
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
import AdminOwnersDirectory from "./pages/admin/AdminOwnersDirectory";
import AdminBuildingOverview from "./pages/admin/AdminBuildingOverview";
import AdminBuilding3D from "./pages/admin/AdminBuilding3D";
import AdminShops from "./pages/admin/AdminShops";
import AdminParking from "./pages/admin/AdminParking";
import AdminDues from "./pages/admin/AdminDues";
import AdminExpenses from "./pages/admin/AdminExpenses";
import AdminReports from "./pages/admin/AdminReports";
import AdminNotices from "./pages/admin/AdminNotices";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminSettingsHistory from "./pages/admin/AdminSettingsHistory";
import AdminChangeHistory from "./pages/admin/AdminChangeHistory";
import AdminUserActivity from "./pages/admin/AdminUserActivity";
import AdminLedger from "./pages/admin/AdminLedger";
import AdminLoans from "./pages/admin/AdminLoans";
import AdminCommittee from "./pages/admin/AdminCommittee";
import TenantInfoPage from "./pages/TenantInfo";
import TenantInfoView from "./pages/TenantInfoView";
import OwnerDetailedInfo from "./pages/OwnerDetailedInfo";
import OwnerDetailedInfoView from "./pages/OwnerDetailedInfoView";
import TenantInfoBlankForm from "./pages/TenantInfoBlankForm";
import AdminPaymentRequests from "./pages/admin/AdminPaymentRequests";
import AdminReceipts from "./pages/admin/AdminReceipts";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminUserManagement from "./pages/admin/AdminUserManagement";
import AccountantDashboard from "./pages/staff/AccountantDashboard";
import ManagerDashboard from "./pages/staff/ManagerDashboard";
import AdminReconcile from "./pages/admin/AdminReconcile";
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerDues from "./pages/owner/OwnerDues";
import OwnerPayments from "./pages/owner/OwnerPayments";
import OwnerNotices from "./pages/owner/OwnerNotices";
import OwnerReports from "./pages/owner/OwnerReports";
import OwnerFinanceReport from "./pages/owner/OwnerFinanceReport";
import OwnerLedger from "./pages/owner/OwnerLedger";
import OwnerReceipts from "./pages/owner/OwnerReceipts";
import OwnerInfo from "./pages/owner/OwnerInfo";
import OwnerCommittee from "./pages/owner/OwnerCommittee";
import Feedback from "./pages/Feedback";
import AdminFeedback from "./pages/admin/AdminFeedback";
import AccountPassword from "./pages/AccountPassword";
import AccountProfile from "./pages/AccountProfile";
import Download from "./pages/Download";
import UpdateStatus from "./pages/UpdateStatus";
import VersionInfo from "./pages/VersionInfo";
import PaymentResult from "./pages/PaymentResult";
import { ReportPadDebugProbe } from "@/components/ReportPadDebugProbe";
import { ForceUpdateGate } from "@/components/ForceUpdateGate";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LangProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ReportPadDebugProbe />
          <Router>
            <ForceUpdateGate>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />

              {/* Admin & staff (manager / accountant) */}
              <Route path="/admin" element={<ProtectedRoute requireRole="admin"><AdminDashboard /></ProtectedRoute>} />
              <Route path="/accountant" element={<ProtectedRoute allowRoles={["admin","accountant"]}><AccountantDashboard /></ProtectedRoute>} />
              <Route path="/manager" element={<ProtectedRoute allowRoles={["admin","manager"]}><ManagerDashboard /></ProtectedRoute>} />
              <Route path="/admin/flats" element={<ProtectedRoute allowRoles={["admin","manager"]}><AdminFlats /></ProtectedRoute>} />
              <Route path="/admin/flats/table" element={<ProtectedRoute allowRoles={["admin","manager"]}><AdminFlatsTable /></ProtectedRoute>} />
              <Route path="/admin/flats/owners" element={<ProtectedRoute><AdminOwnersDirectory /></ProtectedRoute>} />
              <Route path="/admin/building" element={<ProtectedRoute><AdminBuildingOverview /></ProtectedRoute>} />
              <Route path="/admin/building/3d" element={<ProtectedRoute><AdminBuilding3D /></ProtectedRoute>} />

              <Route path="/admin/shops" element={<ProtectedRoute allowRoles={["admin","manager"]}><AdminShops /></ProtectedRoute>} />
              <Route path="/admin/parking" element={<ProtectedRoute allowRoles={["admin","manager"]}><AdminParking /></ProtectedRoute>} />
              <Route path="/admin/dues" element={<ProtectedRoute allowRoles={["admin","manager","accountant"]}><AdminDues /></ProtectedRoute>} />
              <Route path="/admin/payment-requests" element={<ProtectedRoute allowRoles={["admin","manager","accountant"]}><AdminPaymentRequests /></ProtectedRoute>} />
              <Route path="/admin/receipts" element={<ProtectedRoute allowRoles={["admin","manager","accountant"]}><AdminReceipts /></ProtectedRoute>} />
              <Route path="/admin/ledger" element={<ProtectedRoute allowRoles={["admin","manager","accountant"]}><AdminLedger /></ProtectedRoute>} />
              <Route path="/admin/reconcile" element={<ProtectedRoute allowRoles={["admin","manager","accountant"]}><AdminReconcile /></ProtectedRoute>} />
              <Route path="/admin/expenses" element={<ProtectedRoute allowRoles={["admin","manager","accountant"]}><AdminExpenses /></ProtectedRoute>} />
              <Route path="/admin/loans" element={<ProtectedRoute allowRoles={["admin","manager"]}><AdminLoans /></ProtectedRoute>} />
              <Route path="/admin/reports" element={<ProtectedRoute allowRoles={["admin","manager","accountant"]}><AdminReports /></ProtectedRoute>} />
              <Route path="/admin/notices" element={<ProtectedRoute allowRoles={["admin","manager"]}><AdminNotices /></ProtectedRoute>} />
              <Route path="/admin/committee" element={<ProtectedRoute requireRole="admin"><AdminCommittee /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute requireRole="admin"><AdminUsers /></ProtectedRoute>} />
              <Route path="/admin/user-management" element={<ProtectedRoute requireRole="admin"><AdminUserManagement /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute requireRole="admin"><AdminSettings /></ProtectedRoute>} />
              <Route path="/admin/settings/history" element={<ProtectedRoute requireRole="admin"><AdminSettingsHistory /></ProtectedRoute>} />
              <Route path="/admin/change-history" element={<ProtectedRoute requireRole="admin"><AdminChangeHistory /></ProtectedRoute>} />
              <Route path="/admin/user-activity" element={<ProtectedRoute requireRole="admin"><AdminUserActivity /></ProtectedRoute>} />

              {/* Owner */}
              <Route path="/owner" element={<ProtectedRoute allowRoles={["owner","tenant"]}><OwnerDashboard /></ProtectedRoute>} />
              <Route path="/owner/dues" element={<ProtectedRoute allowRoles={["owner","tenant"]}><OwnerDues /></ProtectedRoute>} />
              <Route path="/owner/payments" element={<ProtectedRoute allowRoles={["owner","tenant"]}><OwnerPayments /></ProtectedRoute>} />
              <Route path="/owner/ledger" element={<ProtectedRoute allowRoles={["owner","tenant"]}><OwnerLedger /></ProtectedRoute>} />
              <Route path="/owner/receipts" element={<ProtectedRoute allowRoles={["owner","tenant"]}><OwnerReceipts /></ProtectedRoute>} />
              <Route path="/owner/notices" element={<ProtectedRoute allowRoles={["owner","tenant"]}><OwnerNotices /></ProtectedRoute>} />
              <Route path="/owner/reports" element={<ProtectedRoute allowRoles={["owner","tenant"]}><OwnerReports /></ProtectedRoute>} />
              <Route path="/owner/finance-report" element={<ProtectedRoute allowRoles={["owner","tenant"]}><OwnerFinanceReport /></ProtectedRoute>} />
              <Route path="/owner/info" element={<ProtectedRoute allowRoles={["owner","tenant"]}><OwnerInfo /></ProtectedRoute>} />
              <Route path="/owner/committee" element={<ProtectedRoute allowRoles={["owner","tenant"]}><OwnerCommittee /></ProtectedRoute>} />
              <Route path="/account/profile" element={<ProtectedRoute><AccountProfile /></ProtectedRoute>} />
              <Route path="/account/password" element={<ProtectedRoute><AccountPassword /></ProtectedRoute>} />
              <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
              <Route path="/admin/feedback" element={<ProtectedRoute allowRoles={["admin","manager"]}><AdminFeedback /></ProtectedRoute>} />

              {/* Tenant info — accessible to admin and flat owners */}
              <Route path="/tenant-info" element={<ProtectedRoute><TenantInfoPage /></ProtectedRoute>} />
              <Route path="/tenant-info/view" element={<ProtectedRoute><TenantInfoView /></ProtectedRoute>} />
              <Route path="/tenant-info/blank-form" element={<TenantInfoBlankForm />} />
              <Route path="/owner-info" element={<ProtectedRoute><OwnerDetailedInfo /></ProtectedRoute>} />
              <Route path="/owner-info/view" element={<ProtectedRoute><OwnerDetailedInfoView /></ProtectedRoute>} />
              <Route path="/download" element={<Download />} />
              <Route path="/update" element={<ProtectedRoute><UpdateStatus /></ProtectedRoute>} />
              <Route path="/version" element={<VersionInfo />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
            </ForceUpdateGate>
          </Router>
        </TooltipProvider>
      </AuthProvider>
    </LangProvider>
  </QueryClientProvider>
);

export default App;
