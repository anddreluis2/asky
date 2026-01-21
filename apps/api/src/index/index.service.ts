import { Injectable, Inject, HttpException, HttpStatus } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { GitHubService } from "../github/github.service";
import { EmbeddingService } from "../embedding/embedding.service";

interface CodeChunk {
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
}

@Injectable()
export class IndexService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(GitHubService) private github: GitHubService,
    @Inject(EmbeddingService) private embedding: EmbeddingService,
  ) {}

  async getIndexStatus(repoFullName: string, userId: string) {
    const repo = await this.prisma.indexedRepository.findFirst({
      where: {
        fullName: repoFullName,
        userId,
      },
      select: {
        id: true,
        lastIndexedAt: true,
        _count: {
          select: { chunks: true },
        },
      },
    });

    if (!repo) {
      return { indexed: false };
    }

    return {
      indexed: true,
      lastIndexedAt: repo.lastIndexedAt,
      chunksCount: repo._count.chunks,
    };
  }

  async indexRepository(repoFullName: string, userId: string, accessToken: string) {
    const [owner, repo] = repoFullName.split("/");

    if (!owner || !repo) {
      throw new HttpException("Invalid repository name", HttpStatus.BAD_REQUEST);
    }

    // Get repository info
    const repoInfo = await this.github.getRepository(owner, repo, accessToken);

    // Check if already indexed
    const existingRepo = await this.prisma.indexedRepository.findUnique({
      where: { githubId: repoInfo.id },
    });

    // If exists, delete old chunks (re-index)
    if (existingRepo) {
      await this.prisma.codeChunk.deleteMany({
        where: { repositoryId: existingRepo.id },
      });
    }

    // Get repository tree
    const tree = await this.github.getRepositoryTree(owner, repo, repoInfo.default_branch, accessToken);

    if (tree.length === 0) {
      throw new HttpException("No code files found in repository", HttpStatus.BAD_REQUEST);
    }

    // Fetch file contents
    const filePaths = tree.map((item) => item.path);
    const files = await this.github.getMultipleFileContents(owner, repo, filePaths, accessToken);

    // Split files into chunks
    const chunks = this.splitFilesIntoChunks(files);

    if (chunks.length === 0) {
      throw new HttpException("No content to index", HttpStatus.BAD_REQUEST);
    }

    // Generate embeddings
    const chunkTexts = chunks.map((chunk) => this.formatChunkForEmbedding(chunk));
    let embeddings: number[][];
    try {
      embeddings = await this.embedding.generateEmbeddings(chunkTexts);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage.includes("Voyage AI API key")) {
        throw new HttpException(
          "Invalid Voyage AI API key. Please check your VOYAGE_API_KEY environment variable.",
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        `Failed to generate embeddings: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Create or update repository record
    const indexedRepo = await this.prisma.indexedRepository.upsert({
      where: { githubId: repoInfo.id },
      create: {
        githubId: repoInfo.id,
        fullName: repoFullName,
        defaultBranch: repoInfo.default_branch,
        lastIndexedAt: new Date(),
        userId,
      },
      update: {
        lastIndexedAt: new Date(),
        defaultBranch: repoInfo.default_branch,
      },
    });

    // Insert chunks with embeddings using raw SQL (Prisma doesn't support vector type directly)
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embeddingVector = embeddings[i];

      await this.prisma.$executeRaw`
        INSERT INTO "CodeChunk" (id, "repositoryId", "filePath", content, "startLine", "endLine", embedding, "createdAt")
        VALUES (
          gen_random_uuid(),
          ${indexedRepo.id},
          ${chunk.filePath},
          ${chunk.content},
          ${chunk.startLine},
          ${chunk.endLine},
          ${embeddingVector}::vector,
          NOW()
        )
      `;
    }

    return {
      success: true,
      filesIndexed: files.length,
      chunksCreated: chunks.length,
    };
  }

  private splitFilesIntoChunks(files: { path: string; content: string }[]): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    const maxChunkSize = 1500; // ~375 tokens (assuming 4 chars per token)
    const overlapSize = 200; // Overlap between chunks for context

    for (const file of files) {
      const lines = file.content.split("\n");

      // For small files, keep as single chunk
      if (file.content.length <= maxChunkSize) {
        chunks.push({
          filePath: file.path,
          content: file.content,
          startLine: 1,
          endLine: lines.length,
        });
        continue;
      }

      // Split larger files into overlapping chunks
      let currentChunk = "";
      let chunkStartLine = 1;
      let currentLine = 1;

      for (const line of lines) {
        const potentialChunk = currentChunk + (currentChunk ? "\n" : "") + line;

        if (potentialChunk.length > maxChunkSize && currentChunk) {
          // Save current chunk
          chunks.push({
            filePath: file.path,
            content: currentChunk,
            startLine: chunkStartLine,
            endLine: currentLine - 1,
          });

          // Start new chunk with overlap
          const overlapLines = currentChunk.split("\n").slice(-3).join("\n");
          currentChunk = overlapLines + "\n" + line;
          chunkStartLine = Math.max(1, currentLine - 3);
        } else {
          currentChunk = potentialChunk;
        }

        currentLine++;
      }

      // Don't forget the last chunk
      if (currentChunk.trim()) {
        chunks.push({
          filePath: file.path,
          content: currentChunk,
          startLine: chunkStartLine,
          endLine: lines.length,
        });
      }
    }

    return chunks;
  }

  private formatChunkForEmbedding(chunk: CodeChunk): string {
    // Include file path for context in embedding
    return `File: ${chunk.filePath}\nLines ${chunk.startLine}-${chunk.endLine}:\n${chunk.content}`;
  }
}
