import { useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Database, FolderGit2, Lock, RefreshCw } from "lucide-react";
import { reposApi } from "../lib/api";
import { Button } from "./ui/button";
import { Repository } from "@asky/shared-types";

type Props = {
  onSearchRepos: () => void;
  onSelectRepo: (repo: Repository) => void;
};

const SAMPLE_SIZE = 8;

export const HomeDashboard = ({ onSearchRepos, onSelectRepo }: Props) => {
  const {
    data: repos,
    isLoading: isLoadingRepos,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["repos"],
    queryFn: reposApi.getRepositories,
    staleTime: 60 * 1000,
  });

  const sampledRepos = useMemo(
    () => (repos ?? []).slice(0, SAMPLE_SIZE),
    [repos],
  );

  const indexStatusQueries = useQueries({
    queries: sampledRepos.map((repo) => ({
      queryKey: ["indexStatus", repo.full_name],
      queryFn: () => reposApi.getIndexStatus(repo.full_name),
      staleTime: 30 * 1000,
    })),
  });

  const indexedStatusQueries = useQueries({
    queries:
      repos?.map((repo) => ({
        queryKey: ["indexStatus", repo.full_name],
        queryFn: () => reposApi.getIndexStatus(repo.full_name),
        staleTime: 30 * 1000,
        enabled: !!repos?.length,
      })) ?? [],
  });

  const statusMap = useMemo(() => {
    const map = new Map<string, { indexed: boolean; lastIndexedAt?: Date; chunksCount?: number }>();
    indexedStatusQueries.forEach((q, idx) => {
      const repo = repos?.[idx];
      if (!repo || !q.data) return;
      map.set(repo.full_name, {
        indexed: q.data.indexed,
        lastIndexedAt: q.data.lastIndexedAt ? new Date(q.data.lastIndexedAt) : undefined,
        chunksCount: q.data.chunksCount,
      });
    });
    return map;
  }, [indexedStatusQueries, repos]);

  const indexedRepos = useMemo(() => {
    if (!repos?.length) return [];
    return repos
      .map((repo) => {
        const status = statusMap.get(repo.full_name);
        return { repo, status };
      })
      .filter((item) => item.status?.indexed);
  }, [repos, statusMap]);

  const metrics = useMemo(() => {
    const all = repos ?? [];
    const total = all.length;
    const privateCount = all.reduce((acc, r) => acc + (r.private ? 1 : 0), 0);

    const sampledStatuses = indexStatusQueries
      .map((q) => q.data)
      .filter((s): s is NonNullable<typeof s> => !!s);

    const indexedCount = sampledStatuses.reduce((acc, s) => acc + (s.indexed ? 1 : 0), 0);

    const lastIndexedAt = sampledStatuses.reduce<Date | null>((latest, s) => {
      const d = s.lastIndexedAt ? new Date(s.lastIndexedAt) : null;
      if (!d) return latest;
      if (!latest) return d;
      return d > latest ? d : latest;
    }, null);

    return {
      total,
      privateCount,
      sampled: sampledRepos.length,
      indexedSampled: indexedCount,
      lastIndexedAt,
    };
  }, [indexStatusQueries, repos, sampledRepos.length]);

  const fmtDateTime = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }, []);

  const lastIndexedText = metrics.lastIndexedAt ? fmtDateTime.format(metrics.lastIndexedAt) : "—";

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Your workspace
          </h2>
          <p className="text-muted-foreground">
            Quick snapshot of your repositories and indexing status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={onSearchRepos} className="gap-2">
            <FolderGit2 className="w-4 h-4" />
            Search repositories
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Indexed repositories</h3>
            <p className="text-sm text-muted-foreground">
              Repositories ready for chatting (fetched from your list).
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {indexedStatusQueries.some((q) => q.isFetching) ? "Refreshing…" : null}
          </div>
        </div>

        {isLoadingRepos && (
          <div className="rounded-xl border border-border bg-card/40 p-4 text-sm text-muted-foreground">
            Loading repositories…
          </div>
        )}

        {!isLoadingRepos && indexedRepos.length === 0 && (
          <div className="rounded-xl border border-border bg-card/40 p-4 text-sm text-muted-foreground">
            No indexed repositories yet. Index one from the list to start chatting.
          </div>
        )}

        {!isLoadingRepos && indexedRepos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {indexedRepos.map(({ repo, status }) => (
              <div
                key={repo.id}
                className="rounded-xl border border-border bg-card/60 p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-foreground truncate">{repo.full_name}</div>
                  <span className="text-xs text-muted-foreground">
                    {status?.chunksCount ? `${status.chunksCount} chunks` : "Indexed"}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground line-clamp-2">
                  {repo.description ?? "No description provided."}
                </div>
                <div className="text-xs text-muted-foreground">
                  Indexed at{" "}
                  {status?.lastIndexedAt
                    ? fmtDateTime.format(status.lastIndexedAt)
                    : "unknown time"}
                </div>
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => onSelectRepo(repo)}>
                    Open chat
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Repositories</div>
            <FolderGit2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div className="text-3xl font-semibold text-foreground">
              {isLoadingRepos ? "—" : metrics.total}
            </div>
            <div className="text-xs text-muted-foreground">
              {isLoadingRepos ? "Loading…" : `${metrics.privateCount} private`}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Indexed (sample)</div>
            <Database className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div className="text-3xl font-semibold text-foreground">
              {isLoadingRepos ? "—" : metrics.indexedSampled}
            </div>
            <div className="text-xs text-muted-foreground">
              {isLoadingRepos ? "Loading…" : `of ${metrics.sampled} shown`}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Last indexed</div>
            <Lock className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="mt-3">
            <div className="text-lg font-semibold text-foreground">{lastIndexedText}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Based on the first {SAMPLE_SIZE} repositories
            </div>
          </div>
        </div>
      </div>

      {!isLoadingRepos && repos && repos.length === 0 && (
        <div className="rounded-xl border border-border bg-card/40 p-6 text-sm text-muted-foreground">
          No repositories found. Connect GitHub and try again.
        </div>
      )}

      {isLoadingRepos && (
        <div className="rounded-xl border border-border bg-card/40 p-6 text-sm text-muted-foreground">
          Loading repositories…
        </div>
      )}
    </section>
  );
};

