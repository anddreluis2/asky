import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { RepoList } from "../components/RepoList";
import { Chat } from "../components/Chat";
import { Repository } from "@asky/shared-types";

type View = "initial" | "repo-list" | "chat";

export const Home = () => {
  const { user, logout } = useAuth();
  const [view, setView] = useState<View>("initial");
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

  const handleShowRepos = () => {
    setView("repo-list");
  };

  const handleSelectRepo = (repo: Repository) => {
    setSelectedRepo(repo);
    setView("chat");
  };

  const handleBackToInitial = () => {
    setView("initial");
    setSelectedRepo(null);
  };

  const handleBackToRepos = () => {
    setView("repo-list");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Header */}
      <header className="border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Asky</h1>
          <div className="flex items-center gap-4">
            {user?.avatar && (
              <img
                src={user.avatar}
                alt={user.username}
                className="w-8 h-8 rounded-full"
              />
            )}
            <span className="text-gray-300">{user?.username}</span>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {view === "initial" && (
          <div className="text-center">
            <h2 className="text-5xl font-bold text-white mb-6">Start asking</h2>
            <p className="text-gray-300 text-lg mb-12">
              Ask questions about any GitHub repository and get AI-powered explanations
            </p>

            {/* Search Repository Button */}
            <button
              onClick={handleShowRepos}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Search Repositories
            </button>
          </div>
        )}

        {view === "repo-list" && (
          <RepoList onSelectRepo={handleSelectRepo} onBack={handleBackToInitial} />
        )}

        {view === "chat" && selectedRepo && (
          <Chat repo={selectedRepo} onBack={handleBackToRepos} />
        )}
      </main>
    </div>
  );
};
