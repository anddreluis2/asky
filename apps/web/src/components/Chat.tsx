import { ChevronLeft, MessageCircle, Send } from "lucide-react";
import { Repository } from "@asky/shared-types";
import { Button } from "./ui/button";

interface ChatProps {
  repo: Repository;
  onBack: () => void;
}

export const Chat = ({ repo, onBack }: ChatProps) => {
  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto">
      {/* Header with back button */}
      <div>
        <Button
          variant="ghost"
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to repositories
        </Button>
      </div>

      {/* Chat container */}
      <div className="flex-1 flex flex-col bg-card rounded-xl border border-border shadow-lg overflow-hidden">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            {/* Welcome message */}
            <div className="flex gap-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex-shrink-0 flex items-center justify-center shadow-md">
                <MessageCircle className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <div className="bg-muted rounded-xl p-4 text-foreground">
                  <p className="text-base leading-relaxed">
                    Welcome to asky on <span className="font-semibold text-primary">{repo.full_name}</span>. Ask me for the context of this project.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-border bg-background/50 backdrop-blur-sm p-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <textarea
                disabled
                placeholder="Ask about this repository..."
                className="w-full bg-background border border-input text-foreground rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground"
                rows={1}
              />
              <Button
                disabled
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
