import { useQuery } from "@tanstack/react-query";
import { reposApi } from "../lib/api";
import { Repository } from "@asky/shared-types";

interface RepoListProps {
  onSelectRepo: (repo: Repository) => void;
  onBack: () => void;
}

export const RepoList = ({ onSelectRepo, onBack }: RepoListProps) => {
  const { data: repos, isLoading, error } = useQuery({
    queryKey: ["repos"],
    queryFn: reposApi.getRepositories,
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto mt-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-center text-gray-300">Loading repositories...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-red-400 mb-4">Failed to load repositories</div>
          <button
            onClick={onBack}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (!repos || repos.length === 0) {
    return (
      <div className="max-w-4xl mx-auto mt-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-300 mb-4">No repositories found</div>
          <button
            onClick={onBack}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <div className="mb-4">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Select a Repository</h2>
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          {repos.map((repo) => (
            <button
              key={repo.id}
              onClick={() => onSelectRepo(repo)}
              className="w-full px-6 py-4 hover:bg-gray-700 transition-colors text-left border-b border-gray-700 last:border-b-0"
            >
              <div className="flex items-start gap-4">
                {repo.owner.avatar_url && (
                  <img
                    src={repo.owner.avatar_url}
                    alt={repo.owner.login}
                    className="w-10 h-10 rounded-full flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold truncate">{repo.full_name}</h3>
                    {repo.private && (
                      <span className="text-xs bg-gray-600 text-gray-300 px-2 py-0.5 rounded flex-shrink-0">
                        Private
                      </span>
                    )}
                  </div>
                  {repo.description && (
                    <p className="text-gray-400 text-sm line-clamp-2">{repo.description}</p>
                  )}
                  <div className="text-gray-500 text-xs mt-2">{repo.owner.login}</div>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
