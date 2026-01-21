import { Injectable, HttpException, HttpStatus } from "@nestjs/common";

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

interface GitHubRepoResponse {
  id: number;
  default_branch: string;
  full_name: string;
}

interface GitHubContentApiResponse {
  content: string;
  encoding?: string;
}

interface GitHubFileContent {
  path: string;
  content: string;
}

// File extensions to index (code files)
const CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".java",
  ".go",
  ".rs",
  ".rb",
  ".php",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".cs",
  ".swift",
  ".kt",
  ".scala",
  ".vue",
  ".svelte",
  ".astro",
  ".md",
  ".mdx",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".sql",
  ".graphql",
  ".prisma",
  ".css",
  ".scss",
  ".less",
  ".html",
]);

// Directories to ignore
const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "coverage",
  "__pycache__",
  ".venv",
  "venv",
  "vendor",
  ".cache",
  ".turbo",
  "target",
  "out",
]);

// Max file size to index (100KB)
const MAX_FILE_SIZE = 100 * 1024;

@Injectable()
export class GitHubService {
  private readonly baseUrl = "https://api.github.com";

  async getRepository(owner: string, repo: string, accessToken: string): Promise<GitHubRepoResponse> {
    const response = await this.fetchGitHub(`/repos/${owner}/${repo}`, accessToken);

    if (!response.ok) {
      if (response.status === 404) {
        throw new HttpException("Repository not found", HttpStatus.NOT_FOUND);
      }
      throw new HttpException(`GitHub API error: ${response.statusText}`, HttpStatus.BAD_GATEWAY);
    }

    const data = (await response.json()) as GitHubRepoResponse;
    return data;
  }

  async getRepositoryTree(
    owner: string,
    repo: string,
    branch: string,
    accessToken: string,
  ): Promise<GitHubTreeItem[]> {
    const response = await this.fetchGitHub(
      `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      accessToken,
    );

    if (!response.ok) {
      throw new HttpException(`Failed to fetch repository tree: ${response.statusText}`, HttpStatus.BAD_GATEWAY);
    }

    const data = (await response.json()) as GitHubTreeResponse;

    if (data.truncated) {
      console.warn(`Repository tree was truncated for ${owner}/${repo}`);
    }

    // Filter to only code files
    return data.tree.filter((item) => {
      if (item.type !== "blob") return false;
      if (item.size && item.size > MAX_FILE_SIZE) return false;

      // Check if in ignored directory
      const pathParts = item.path.split("/");
      if (pathParts.some((part) => IGNORED_DIRS.has(part))) return false;

      // Check file extension
      const ext = this.getFileExtension(item.path);
      return CODE_EXTENSIONS.has(ext);
    });
  }

  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    accessToken: string,
  ): Promise<GitHubFileContent> {
    const response = await this.fetchGitHub(`/repos/${owner}/${repo}/contents/${path}`, accessToken);

    if (!response.ok) {
      throw new HttpException(`Failed to fetch file content: ${response.statusText}`, HttpStatus.BAD_GATEWAY);
    }

    const data = (await response.json()) as GitHubContentApiResponse;
    if (!data?.content || typeof data.content !== "string") {
      throw new HttpException("Invalid GitHub content response", HttpStatus.BAD_GATEWAY);
    }

    // GitHub returns base64 encoded content
    const content = Buffer.from(data.content, "base64").toString("utf-8");

    return {
      path,
      content,
    };
  }

  async getMultipleFileContents(
    owner: string,
    repo: string,
    paths: string[],
    accessToken: string,
  ): Promise<GitHubFileContent[]> {
    // Fetch files in parallel with concurrency limit
    const concurrencyLimit = 10;
    const results: GitHubFileContent[] = [];

    for (let i = 0; i < paths.length; i += concurrencyLimit) {
      const batch = paths.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.all(
        batch.map(async (path) => {
          try {
            return await this.getFileContent(owner, repo, path, accessToken);
          } catch (error) {
            console.warn(`Failed to fetch ${path}:`, error);
            return null;
          }
        }),
      );

      results.push(...batchResults.filter((r): r is GitHubFileContent => r !== null));
    }

    return results;
  }

  private async fetchGitHub(endpoint: string, accessToken: string): Promise<Response> {
    return fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
  }

  private getFileExtension(path: string): string {
    const lastDot = path.lastIndexOf(".");
    if (lastDot === -1) return "";
    return path.slice(lastDot).toLowerCase();
  }
}
