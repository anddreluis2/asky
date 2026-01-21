import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, MessageCircle, Send, Loader2, Database, FileCode } from "lucide-react";
import { Repository, ChatMessage, CodeSource } from "@asky/shared-types";
import { Button } from "./ui/button";
import { reposApi } from "../lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ChatProps {
  repo: Repository;
  onBack: () => void;
}

interface DisplayMessage extends ChatMessage {
  sources?: CodeSource[];
}

export const Chat = ({ repo, onBack }: ChatProps) => {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Check index status
  const { data: indexStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["indexStatus", repo.full_name],
    queryFn: () => reposApi.getIndexStatus(repo.full_name),
  });

  // Index mutation
  const indexMutation = useMutation({
    mutationFn: () => reposApi.indexRepository(repo.full_name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indexStatus", repo.full_name] });
    },
    onError: (error: unknown) => {
      // O interceptor do axios já trata 401, mas podemos adicionar feedback adicional aqui
      console.error("Failed to index repository:", error);
    },
  });

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: (question: string) => {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      return reposApi.chat(repo.full_name, question, history);
    },
    onSuccess: (response) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.answer, sources: response.sources },
      ]);
    },
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = useCallback(
    (e?: React.SyntheticEvent) => {
      e?.preventDefault();
      const trimmedInput = input.trim();
      if (!trimmedInput || chatMutation.isPending) return;

      setMessages((prev) => [...prev, { role: "user", content: trimmedInput }]);
      setInput("");
      chatMutation.mutate(trimmedInput);
    },
    [input, chatMutation],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const isIndexed = indexStatus?.indexed ?? false;
  const isIndexing = indexMutation.isPending;
  const isChatDisabled = !isIndexed || isIndexing || chatMutation.isPending;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto">
      {/* Header with back button */}
      <div>
        <Button
          variant="ghost"
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={onBack}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to repositories
        </Button>
      </div>

      {/* Chat container */}
      <div className="flex-1 flex flex-col bg-card rounded-xl border border-border shadow-lg overflow-hidden">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Welcome/Status message */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex-shrink-0 flex items-center justify-center shadow-md">
                <MessageCircle className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <div className="bg-muted rounded-xl p-4 text-foreground">
                  {isLoadingStatus ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Checking repository status...</span>
                    </div>
                  ) : isIndexed ? (
                    <p className="text-base leading-relaxed">
                      Welcome to asky on{" "}
                      <span className="font-semibold text-primary">{repo.full_name}</span>. This
                      repository is indexed with{" "}
                      <span className="font-semibold">{indexStatus?.chunksCount}</span> code chunks.
                      Ask me anything about the code!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-base leading-relaxed">
                        Welcome to asky on{" "}
                        <span className="font-semibold text-primary">{repo.full_name}</span>. This
                        repository needs to be indexed before you can ask questions.
                      </p>
                      <Button
                        onClick={() => indexMutation.mutate()}
                        disabled={isIndexing}
                        className="gap-2"
                      >
                        {isIndexing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Indexing repository...
                          </>
                        ) : (
                          <>
                            <Database className="w-4 h-4" />
                            Index Repository
                          </>
                        )}
                      </Button>
                      {indexMutation.isError && (
                        <p className="text-sm text-destructive">
                          {(() => {
                            const error = indexMutation.error;
                            if (
                              error &&
                              typeof error === "object" &&
                              "response" in error &&
                              error.response &&
                              typeof error.response === "object" &&
                              "status" in error.response &&
                              error.response.status === 401
                            ) {
                              return "Your session has expired. Please log in again.";
                            }
                            return "Failed to index repository. Please try again.";
                          })()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chat messages */}
            {messages.map((message, index) => (
              <div key={index} className="flex gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center shadow-md ${
                    message.role === "user"
                      ? "bg-secondary"
                      : "bg-gradient-to-br from-primary to-purple-500"
                  }`}
                >
                  {message.role === "user" ? (
                    <span className="text-sm font-medium">You</span>
                  ) : (
                    <MessageCircle className="w-5 h-5 text-primary-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div
                    className={`rounded-xl p-4 ${
                      message.role === "user" ? "bg-secondary" : "bg-muted"
                    }`}
                  >
                    <p className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Sources:</p>
                      <div className="flex flex-wrap gap-2">
                        {message.sources.slice(0, 5).map((source, sourceIndex) => (
                          <div
                            key={sourceIndex}
                            className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-md"
                            title={`Lines ${source.startLine}-${source.endLine}`}
                          >
                            <FileCode className="w-3 h-3" />
                            <span className="text-muted-foreground">{source.filePath}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {chatMutation.isPending && (
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex-shrink-0 flex items-center justify-center shadow-md">
                  <MessageCircle className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <div className="bg-muted rounded-xl p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-border bg-background/50 backdrop-blur-sm p-4">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isChatDisabled}
                  placeholder={
                    isIndexed
                      ? "Ask about this repository..."
                      : "Index the repository first to start chatting..."
                  }
                  className="w-full bg-background border border-input text-foreground rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground"
                  rows={1}
                />
                <Button
                  type="submit"
                  disabled={isChatDisabled || !input.trim()}
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {chatMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
