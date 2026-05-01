import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LangProvider } from "@/i18n/LangContext";
import { RoleProvider } from "@/context/RoleContext";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminFlats from "./pages/admin/AdminFlats";
import AdminDues from "./pages/admin/AdminDues";
import AdminExpenses from "./pages/admin/AdminExpenses";
import AdminReports from "./pages/admin/AdminReports";
import AdminNotices from "./pages/admin/AdminNotices";
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerDues from "./pages/owner/OwnerDues";
import OwnerPayments from "./pages/owner/OwnerPayments";
import OwnerNotices from "./pages/owner/OwnerNotices";
import OwnerReports from "./pages/owner/OwnerReports";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LangProvider>
      <RoleProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/flats" element={<AdminFlats />} />
              <Route path="/admin/dues" element={<AdminDues />} />
              <Route path="/admin/expenses" element={<AdminExpenses />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/notices" element={<AdminNotices />} />
              <Route path="/owner" element={<OwnerDashboard />} />
              <Route path="/owner/dues" element={<OwnerDues />} />
              <Route path="/owner/payments" element={<OwnerPayments />} />
              <Route path="/owner/notices" element={<OwnerNotices />} />
              <Route path="/owner/reports" element={<OwnerReports />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </RoleProvider>
    </LangProvider>
  </QueryClientProvider>
);

export default App;
