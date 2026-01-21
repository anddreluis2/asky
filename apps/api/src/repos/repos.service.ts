import { Injectable, Inject, HttpException, HttpStatus } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Repository } from "@asky/shared-types";

@Injectable()
export class ReposService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async getUserRepositories(accessToken: string): Promise<Repository[]> {
    if (!accessToken) {
      throw new HttpException("Access token not found", HttpStatus.UNAUTHORIZED);
    }

    try {
      const response = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated&direction=desc", {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new HttpException("GitHub authentication failed", HttpStatus.UNAUTHORIZED);
        }
        throw new HttpException(`GitHub API error: ${response.statusText}`, HttpStatus.BAD_GATEWAY);
      }

      const data = await response.json();

      return data.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        private: repo.private,
        html_url: repo.html_url,
        owner: {
          login: repo.owner.login,
          avatar_url: repo.owner.avatar_url,
        },
      }));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException("Failed to fetch repositories", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
