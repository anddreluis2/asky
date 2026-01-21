import { ChevronRight, Lock, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { reposApi } from "../lib/api";
import { Repository } from "@asky/shared-types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface RepoListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectRepo: (repo: Repository) => void;
}

export const RepoList = ({ open, onOpenChange, onSelectRepo }: RepoListProps) => {
  const { data: repos, isLoading, error } = useQuery({
    queryKey: ["repos"],
    queryFn: reposApi.getRepositories,
    enabled: open,
  });

  const handleSelectRepo = (repo: Repository) => {
    onSelectRepo(repo);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-semibold">Select a Repository</DialogTitle>
          <DialogDescription>
            Choose a repository to start asking questions
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Loading repositories...</span>
            </div>
          )}

          {error && (
            <div className="px-6 py-12 text-center">
              <div className="text-destructive mb-4">Failed to load repositories</div>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          )}

          {!isLoading && !error && (!repos || repos.length === 0) && (
            <div className="px-6 py-12 text-center">
              <div className="text-muted-foreground mb-4">No repositories found</div>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          )}

          {!isLoading && !error && repos && repos.length > 0 && (
            <ScrollArea className="h-[calc(85vh-120px)]">
              <div className="divide-y">
                {repos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => handleSelectRepo(repo)}
                    className="w-full px-6 py-4 hover:bg-accent transition-colors text-left group"
                  >
                    <div className="flex items-start gap-4">
                      {repo.owner.avatar_url && (
                        <img
                          src={repo.owner.avatar_url}
                          alt={repo.owner.login}
                          className="w-10 h-10 rounded-full flex-shrink-0 ring-2 ring-border"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate text-foreground">
                            {repo.full_name}
                          </h3>
                          {repo.private && (
                            <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md flex-shrink-0">
                              <Lock className="w-3 h-3" />
                              Private
                            </span>
                          )}
                        </div>
                        {repo.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
                            {repo.description}
                          </p>
                        )}
                        <div className="text-xs text-muted-foreground">{repo.owner.login}</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 group-hover:text-foreground transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
