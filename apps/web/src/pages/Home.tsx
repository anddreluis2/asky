import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export const Home = () => {
  const { user, logout } = useAuth();
  const [showSearch, setShowSearch] = useState(false);

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
        <div className="text-center">
          <h2 className="text-5xl font-bold text-white mb-6">Start asking</h2>
          <p className="text-gray-300 text-lg mb-12">
            Ask questions about any GitHub repository and get AI-powered explanations
          </p>

          {/* Search Repository Button */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Search Repositories
          </button>

          {/* Repository Search UI (Placeholder) */}
          {showSearch && (
            <div className="mt-8 max-w-2xl mx-auto">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">
                  Search GitHub Repositories
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter repository name..."
                    className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
                  />
                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
                    Search
                  </button>
                </div>
                <p className="text-gray-400 text-sm mt-4">
                  UI only - Backend integration coming soon
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
