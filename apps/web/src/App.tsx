import { Loader2 } from "lucide-react";
import { useAuth } from "./hooks/useAuth";
import { Login } from "./pages/Login";
import { Home } from "./pages/Home";

export const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <div className="text-muted-foreground text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  return user ? <Home /> : <Login />;
};
