import { useAuth } from "./hooks/useAuth";
import { Login } from "./pages/Login";
import { Home } from "./pages/Home";

export const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return user ? <Home /> : <Login />;
};
