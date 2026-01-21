import { Injectable, Inject, HttpException, HttpStatus } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Repository, RepositorySchema, GitHubRepositoryResponseSchema } from "@asky/shared-types";
import { z } from "zod";

@Injectable()
export class ReposService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async getUserRepositories(accessToken: string): Promise<Repository[]> {
    if (!accessToken) {
      throw new HttpException("Access token not found", HttpStatus.UNAUTHORIZED);
    }

    try {
      // #region agent log
      fetch("http://127.0.0.1:7244/ingest/9483d164-7ac3-4bfb-bd50-3b5d453c05e6", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "debug-session",
          runId: "run1",
          hypothesisId: "H2",
          location: "repos.service.ts:getUserRepositories:beforeFetch",
          message: "fetching github repos",
          data: { tokenSuffix: accessToken.slice(-4) },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      const response = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated&direction=desc", {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      // #region agent log
      fetch("http://127.0.0.1:7244/ingest/9483d164-7ac3-4bfb-bd50-3b5d453c05e6", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "debug-session",
          runId: "run1",
          hypothesisId: "H3",
          location: "repos.service.ts:getUserRepositories:afterFetch",
          message: "github fetch response",
          data: { status: response.status, ok: response.ok },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      if (!response.ok) {
        if (response.status === 401) {
          // #region agent log
          fetch("http://127.0.0.1:7244/ingest/9483d164-7ac3-4bfb-bd50-3b5d453c05e6", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "H3",
              location: "repos.service.ts:getUserRepositories:github401",
              message: "github returned 401",
              data: {},
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion

          throw new HttpException("GitHub authentication failed", HttpStatus.UNAUTHORIZED);
        }
        throw new HttpException(`GitHub API error: ${response.statusText}`, HttpStatus.BAD_GATEWAY);
      }

      const responseJson = await response.json();
      // #region agent log
      fetch("http://127.0.0.1:7244/ingest/9483d164-7ac3-4bfb-bd50-3b5d453c05e6", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "debug-session",
          runId: "run1",
          hypothesisId: "H4",
          location: "repos.service.ts:getUserRepositories:afterJson",
          message: "parsed github repos",
          data: { count: Array.isArray(responseJson) ? responseJson.length : null },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      // Validate array of repositories
      const repositoriesArray = z.array(GitHubRepositoryResponseSchema).parse(responseJson);

      // Transform to Repository type (validating each one)
      return repositoriesArray.map((repo) => {
        const validated = RepositorySchema.parse({
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          private: repo.private,
          html_url: repo.html_url,
          owner: {
            login: repo.owner.login,
            avatar_url: repo.owner.avatar_url ?? undefined,
          },
        });
        return validated;
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof z.ZodError) {
        throw new HttpException(
          `Invalid repository data from GitHub API: ${error.message}`,
          HttpStatus.BAD_GATEWAY,
        );
      }
      throw new HttpException("Failed to fetch repositories", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
