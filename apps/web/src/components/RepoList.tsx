import { useCallback, useMemo, useState, useEffect, Fragment } from "react";
import { ChevronRight, Lock, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";

interface RepoListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectRepo: (repo: Repository) => void;
}

const PAGE_SIZE = 5;

const buildPageList = (current: number, total: number): number[] => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  pages.add(current);

  if (current > 1) pages.add(current - 1);
  if (current < total) pages.add(current + 1);
  if (current > 3) pages.add(current - 2);
  if (current < total - 2) pages.add(current + 2);

  return Array.from(pages).sort((a, b) => a - b);
};

export const RepoList = ({ open, onOpenChange, onSelectRepo }: RepoListProps) => {
  const { data: repos, isLoading, error } = useQuery({
    queryKey: ["repos"],
    queryFn: reposApi.getRepositories,
    enabled: open,
  });

  const [page, setPage] = useState(1);
  const [manualInput, setManualInput] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);

  // Reset page when modal opens/closes or repos list changes
  useEffect(() => {
    if (open) {
      setPage(1);
    }
  }, [open]);

  useEffect(() => {
    setPage(1);
  }, [repos?.length]);

  const totalRepos = repos?.length ?? 0;
  const totalPages = useMemo(
    () => (totalRepos > 0 ? Math.ceil(totalRepos / PAGE_SIZE) : 1),
    [totalRepos],
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedRepos = useMemo(() => {
    if (!repos || repos.length === 0) return [];
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return repos.slice(start, end);
  }, [repos, currentPage]);

  const pageStartIndex = totalRepos === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEndIndex = totalRepos === 0 ? 0 : Math.min(currentPage * PAGE_SIZE, totalRepos);
  const pageList = useMemo(
    () => buildPageList(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const parseManualInput = useCallback((raw: string) => {
    const value = raw.trim();
    if (!value) {
      throw new Error("Informe um repositório no formato owner/repo ou URL.");
    }

    let owner = "";
    let repo = "";

    if (value.startsWith("http")) {
      let url: URL;
      try {
        url = new URL(value);
      } catch {
        throw new Error("URL inválida. Use algo como https://github.com/owner/repo.");
      }
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length < 2) {
        throw new Error("Não foi possível ler owner e repo a partir da URL.");
      }
      [owner, repo] = parts;
    } else {
      const parts = value.split("/").filter(Boolean);
      if (parts.length !== 2) {
        throw new Error("Use o formato owner/repo (ex: vercel/next.js).");
      }
      [owner, repo] = parts;
    }

    repo = repo.replace(/\.git$/, "");

    if (!owner || !repo) {
      throw new Error("Owner ou repositório ausentes. Confirme o formato owner/repo.");
    }

    const fullName = `${owner}/${repo}`;
    const htmlUrl = `https://github.com/${fullName}`;

    return { owner, repo, fullName, htmlUrl };
  }, []);

  const manualIndexMutation = useMutation({
    mutationFn: async (rawInput: string) => {
      const parsed = parseManualInput(rawInput);
      await reposApi.indexRepository(parsed.fullName);
      return parsed;
    },
    onSuccess: (parsed) => {
      setManualError(null);
      setManualInput("");
      const existing = repos?.find((r) => r.full_name === parsed.fullName);
      const repoToUse: Repository =
        existing ??
        {
          id: Date.now(),
          name: parsed.repo,
          full_name: parsed.fullName,
          description: null,
          private: false,
          html_url: parsed.htmlUrl,
          owner: {
            login: parsed.owner,
            avatar_url: undefined,
          },
        };

      onSelectRepo(repoToUse);
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Falha ao indexar repositório. Tente novamente.";
      setManualError(message);
    },
  });

  const handleManualSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setManualError(null);
      manualIndexMutation.mutate(manualInput);
    },
    [manualIndexMutation, manualInput],
  );

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

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Manual URL / owner-repo section */}
          <form onSubmit={handleManualSubmit} className="px-6 py-4 border-b space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                GitHub repo URL or owner/repo
              </label>
              <p className="text-xs text-muted-foreground">
                Analyze any public repository by pasting a URL (e.g. https://github.com/vercel/next.js)
                or typing owner/repo (e.g. vercel/next.js).
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="https://github.com/owner/repo or owner/repo"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                disabled={manualIndexMutation.isPending}
              />
              <Button
                type="submit"
                className="sm:w-40"
                disabled={!manualInput.trim() || manualIndexMutation.isPending}
              >
                {manualIndexMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </span>
                ) : (
                  "Analyze this repo"
                )}
              </Button>
            </div>
            {manualError && <p className="text-sm text-destructive">{manualError}</p>}
          </form>

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
            <>
              <ScrollArea className="flex-1 min-h-0">
                <div className="divide-y">
                  {paginatedRepos.map((repo) => (
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

              {/* Pagination controls (always visible, disabled when single page) */}
              <div className="px-6 py-3 border-t bg-background/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
                <div>
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {pageStartIndex}-{pageEndIndex}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-foreground">
                    {totalRepos}
                  </span>{" "}
                  repositories
                </div>
                <Pagination className="sm:justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        disabled={currentPage === 1 || totalPages === 0}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      />
                    </PaginationItem>

                    {pageList.map((p, index) => {
                      const prev = pageList[index - 1];
                      const showEllipsis = prev && p - prev > 1;

                      return (
                        <Fragment key={p}>
                          {showEllipsis && (
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}
                          <PaginationItem>
                            <PaginationLink
                              isActive={p === currentPage}
                              onClick={() => setPage(p)}
                              disabled={totalPages === 0}
                            >
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        </Fragment>
                      );
                    })}

                    <PaginationItem>
                      <PaginationNext
                        disabled={currentPage === totalPages || totalPages === 0}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
