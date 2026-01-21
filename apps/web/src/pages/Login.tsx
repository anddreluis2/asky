import { Github } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/button";

export const Login = () => {
  const { login } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="text-center space-y-8 px-4">
        <div className="space-y-4">
          <h1 className="text-7xl font-bold text-white tracking-tight">Asky</h1>
          <p className="text-slate-400 text-lg max-w-md mx-auto">
            AI-powered GitHub repository explanation
          </p>
        </div>
        <Button
          onClick={login}
          size="lg"
          className="bg-white hover:bg-slate-100 text-slate-950 font-semibold h-12 px-8 text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Github className="w-5 h-5" />
          Continue with GitHub
        </Button>
      </div>
    </div>
  );
};
