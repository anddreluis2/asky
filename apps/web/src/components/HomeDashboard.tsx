import { useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Database, FolderGit2, Lock, RefreshCw, Sparkles, Shield, Clock } from "lucide-react";
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
    <section className="space-y-8">
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-white/5 via-white/0 to-white/5 backdrop-blur-md shadow-[0_20px_60px_-35px_rgba(0,0,0,0.8)]">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 px-5 sm:px-6 py-5 sm:py-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary/80">
              <Sparkles className="w-3.5 h-3.5" />
              Overview
            </div>
            <div className="space-y-1">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                Your workspace
              </h2>
              <p className="text-muted-foreground">
                Quick snapshot of your repositories and indexing status.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-foreground"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={onSearchRepos} className="gap-2 shadow-lg shadow-primary/30">
              <FolderGit2 className="w-4 h-4" />
              Search repositories
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-5 sm:px-6 pb-5 sm:pb-6">
          <div className="rounded-xl border border-white/5 bg-white/[0.04] backdrop-blur-sm p-5 shadow-sm shadow-black/10">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <FolderGit2 className="w-4 h-4" />
                Repositories
              </span>
              <Shield className="w-4 h-4 text-muted-foreground/70" />
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

          <div className="rounded-xl border border-white/5 bg-white/[0.04] backdrop-blur-sm p-5 shadow-sm shadow-black/10">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Indexed (sample)
              </span>
              <span className="text-xs text-muted-foreground">of {metrics.sampled} shown</span>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div className="text-3xl font-semibold text-foreground">
                {isLoadingRepos ? "—" : metrics.indexedSampled}
              </div>
              <div className="text-xs text-muted-foreground">{metrics.sampled ? `${metrics.sampled} sampled` : ""}</div>
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.04] backdrop-blur-sm p-5 shadow-sm shadow-black/10">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Last indexed
              </span>
              <Lock className="w-4 h-4 text-muted-foreground/70" />
            </div>
            <div className="mt-3">
              <div className="text-lg font-semibold text-foreground">{lastIndexedText}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Based on the first {SAMPLE_SIZE} repositories
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1 sm:px-0">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-foreground">Indexed repositories</h3>
            <p className="text-sm text-muted-foreground">
              Ready for chatting (fetched from your list).
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {indexedStatusQueries.some((q) => q.isFetching) ? "Refreshing…" : null}
          </div>
        </div>

        {isLoadingRepos && (
          <div className="rounded-xl border border-white/5 bg-white/[0.03] backdrop-blur-sm p-4 text-sm text-muted-foreground">
            Loading repositories…
          </div>
        )}

        {!isLoadingRepos && indexedRepos.length === 0 && (
          <div className="rounded-xl border border-white/5 bg-white/[0.03] backdrop-blur-sm p-4 text-sm text-muted-foreground">
            No indexed repositories yet. Index one from the list to start chatting.
          </div>
        )}

        {!isLoadingRepos && indexedRepos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {indexedRepos.map(({ repo, status }) => (
              <div
                key={repo.id}
                className="rounded-xl border border-white/5 bg-gradient-to-br from-white/5 via-white/[0.02] to-white/0 p-5 flex flex-col gap-2 shadow-[0_16px_40px_-30px_rgba(0,0,0,0.7)]"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-foreground truncate">{repo.full_name}</div>
                  <span className="text-xs text-muted-foreground bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
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
                  <Button
                    size="sm"
                    onClick={() => onSelectRepo(repo)}
                    className="gap-2 shadow-lg shadow-primary/30"
                  >
                    Open chat
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!isLoadingRepos && repos && repos.length === 0 && (
        <div className="rounded-xl border border-white/5 bg-white/[0.03] backdrop-blur-sm p-6 text-sm text-muted-foreground">
          No repositories found. Connect GitHub and try again.
        </div>
      )}

      {isLoadingRepos && (
        <div className="rounded-xl border border-white/5 bg-white/[0.03] backdrop-blur-sm p-6 text-sm text-muted-foreground">
          Loading repositories…
        </div>
      )}
    </section>
  );
};

