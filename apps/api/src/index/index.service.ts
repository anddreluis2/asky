import { Injectable, Inject, HttpException, HttpStatus } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { GitHubService } from "../github/github.service";
import { EmbeddingService } from "../embedding/embedding.service";
import { ParserService, ParsedChunk } from "../parser/parser.service";

@Injectable()
export class IndexService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(GitHubService) private github: GitHubService,
    @Inject(EmbeddingService) private embedding: EmbeddingService,
    @Inject(ParserService) private parser: ParserService,
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

    // Parse files into smart chunks using tree-sitter AST
    const chunks = await this.parser.parseFiles(files);

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
      
      if (errorMessage.includes("OpenAI API key")) {
        throw new HttpException(
          "Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.",
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
      // Convert array to pgvector format: [0.1, 0.2, ...] as string
      const vectorString = `[${embeddingVector.join(",")}]`;

      await this.prisma.$executeRaw`
        INSERT INTO "CodeChunk" (id, "repositoryId", "filePath", content, "startLine", "endLine", "chunkType", name, language, embedding, "createdAt")
        VALUES (
          gen_random_uuid(),
          ${indexedRepo.id},
          ${chunk.filePath},
          ${chunk.content},
          ${chunk.startLine},
          ${chunk.endLine},
          ${chunk.chunkType},
          ${chunk.name ?? null},
          ${chunk.language},
          ${vectorString}::vector,
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

  private formatChunkForEmbedding(chunk: ParsedChunk): string {
    // Include metadata for richer context in embedding
    const parts = [`File: ${chunk.filePath}`];
    
    if (chunk.name) {
      parts.push(`${chunk.chunkType}: ${chunk.name}`);
    }
    
    parts.push(`Lines ${chunk.startLine}-${chunk.endLine}:`);
    parts.push(chunk.content);
    
    return parts.join("\n");
  }
}
