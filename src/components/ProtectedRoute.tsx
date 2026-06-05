import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, AppRole } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
  requireRole?: AppRole;
  allowRoles?: AppRole[];
}

export function ProtectedRoute({ children, requireRole, allowRoles }: Props) {
  const { user, role, roles, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const allowed = allowRoles ?? (requireRole ? [requireRole] : null);
  if (allowed) {
    const isAdmin = roles.includes("admin");
    const ok = allowed.some((r) => roles.includes(r));
    
    // If not authorized for this specific route
    if (!ok) {
      // Admins should generally be allowed into admin-prefixed routes or we can redirect to a main admin page
      // But if they are specifically excluded (unlikely), redirect them to their primary dashboard
      if (isAdmin) {
        // If they are on an admin page but don't have the specific role (e.g. manager only), 
        // as an admin they should still be able to access it usually, but here we enforce allowRoles.
        // If they are admin, don't block them from other admin pages if it's a general check.
        // However, most admin routes in App.tsx already include "admin" in allowRoles.
        return <Navigate to="/admin" replace />;
      }
      
      if (roles.includes("manager")) return <Navigate to="/manager" replace />;
      if (roles.includes("accountant")) return <Navigate to="/accountant" replace />;
      if (roles.includes("owner") || roles.includes("tenant")) return <Navigate to="/owner" replace />;
      return <Navigate to="/auth" replace />;
    }
  }

  return <>{children}</>;
}
