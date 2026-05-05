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
    const ok = allowed.some((r) => roles.includes(r));
    if (!ok) {
      if (roles.includes("admin")) return <Navigate to="/admin" replace />;
      if (roles.includes("manager")) return <Navigate to="/manager" replace />;
      if (roles.includes("accountant")) return <Navigate to="/accountant" replace />;
      if (roles.includes("owner")) return <Navigate to="/owner" replace />;
      if (roles.includes("tenant")) return <Navigate to="/owner" replace />;
      return <Navigate to="/auth" replace />;
    }
  }

  return <>{children}</>;
}
