import { Repository } from "@asky/shared-types";

interface ChatProps {
  repo: Repository;
  onBack: () => void;
}

export const Chat = ({ repo, onBack }: ChatProps) => {
  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto mt-8">
      {/* Header with back button */}
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
          Back to repositories
        </button>
      </div>

      {/* Chat container */}
      <div className="flex-1 flex flex-col bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            {/* Welcome message */}
            <div className="flex gap-4 mb-6">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <div className="bg-gray-700 rounded-lg p-4 text-gray-100">
                  <p className="text-lg leading-relaxed">
                    Welcome to asky on <span className="font-semibold text-blue-400">{repo.full_name}</span>. Ask me for the context of this project.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-gray-700 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <textarea
                disabled
                placeholder="Ask about this repository..."
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                rows={1}
              />
              <button
                disabled
                className="absolute right-3 bottom-3 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
