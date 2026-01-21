import { useState } from "react";
import { LogOut, User } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { RepoList } from "../components/RepoList";
import { Chat } from "../components/Chat";
import { Repository } from "@asky/shared-types";
import { Button } from "../components/ui/button";
import { HomeDashboard } from "../components/HomeDashboard";

export const Home = () => {
  const { user, logout } = useAuth();
  const [repoModalOpen, setRepoModalOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

  const handleSelectRepo = (repo: Repository) => {
    setSelectedRepo(repo);
  };

  const handleBackToInitial = () => {
    setSelectedRepo(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Asky</h1>
          <div className="flex items-center gap-3">
            {user?.avatar && (
              <img
                src={user.avatar}
                alt={user.username}
                className="w-8 h-8 rounded-full ring-2 ring-border"
              />
            )}
            <span className="text-sm text-muted-foreground hidden sm:inline-flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {user?.username}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {!selectedRepo && (
          <HomeDashboard
            onSearchRepos={() => setRepoModalOpen(true)}
            onSelectRepo={setSelectedRepo}
          />
        )}

        {selectedRepo && (
          <Chat repo={selectedRepo} onBack={handleBackToInitial} />
        )}
      </main>

      <RepoList
        open={repoModalOpen}
        onOpenChange={setRepoModalOpen}
        onSelectRepo={handleSelectRepo}
      />
    </div>
  );
};
