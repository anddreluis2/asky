import { Injectable, Inject, HttpException, HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Groq from "groq-sdk";
import { PrismaService } from "../prisma/prisma.service";
import { EmbeddingService } from "../embedding/embedding.service";
import type { Env } from "../config/env";

interface RelevantChunk {
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
  similarity: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

@Injectable()
export class ChatService {
  private groq: Groq;

  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(EmbeddingService) private embedding: EmbeddingService,
    @Inject(ConfigService) private configService: ConfigService<Env>,
  ) {
    this.groq = new Groq({
      apiKey: this.configService.get("GROQ_API_KEY"),
    });
  }

  async chat(
    repoFullName: string,
    question: string,
    userId: string,
    conversationHistory: ChatMessage[] = [],
  ): Promise<{ answer: string; sources: RelevantChunk[] }> {
    // Find the indexed repository
    const repo = await (this.prisma as any).indexedRepository.findFirst({
      where: {
        fullName: repoFullName,
        userId,
      },
    });

    if (!repo) {
      throw new HttpException(
        "Repository not indexed. Please index the repository first.",
        HttpStatus.BAD_REQUEST,
      );
    }

    // Generate embedding for the question
    const questionEmbedding = await this.embedding.generateEmbedding(question);

    // Search for relevant chunks using pgvector
    const relevantChunks = await this.searchSimilarChunks(repo.id, questionEmbedding, 8);

    if (relevantChunks.length === 0) {
      return {
        answer: "I couldn't find any relevant code in this repository to answer your question.",
        sources: [],
      };
    }

    // Build context from relevant chunks
    const context = this.buildContext(relevantChunks);

    // Build messages for LLM
    const systemPrompt = this.buildSystemPrompt(repoFullName, context);

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user", content: question },
    ];

    // Call Groq LLM
    const completion = await this.groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.3,
      max_tokens: 2048,
    });

    const answer = completion.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response.";

    return {
      answer,
      sources: relevantChunks,
    };
  }

  private async searchSimilarChunks(
    repositoryId: string,
    embedding: number[],
    limit: number,
  ): Promise<RelevantChunk[]> {
    // Use raw SQL for vector similarity search
    const chunks = await this.prisma.$queryRaw<RelevantChunk[]>`
      SELECT 
        "filePath",
        content,
        "startLine",
        "endLine",
        1 - (embedding <=> ${embedding}::vector) as similarity
      FROM "CodeChunk"
      WHERE "repositoryId" = ${repositoryId}
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${embedding}::vector
      LIMIT ${limit}
    `;

    return chunks;
  }

  private buildContext(chunks: RelevantChunk[]): string {
    return chunks
      .map(
        (chunk, index) =>
          `--- Source ${index + 1}: ${chunk.filePath} (lines ${chunk.startLine}-${chunk.endLine}) ---\n${chunk.content}`,
      )
      .join("\n\n");
  }

  private buildSystemPrompt(repoName: string, context: string): string {
    return `You are an expert code assistant helping users understand the codebase of "${repoName}".

You have access to relevant code snippets from the repository. Use these to answer questions accurately.

IMPORTANT GUIDELINES:
- Base your answers ONLY on the provided code context
- If the context doesn't contain enough information, say so
- When referencing code, mention the file path and line numbers
- Be concise but thorough
- Use code blocks with proper syntax highlighting when showing code
- If asked about something not in the context, explain what you can see and suggest what files might contain the answer

RELEVANT CODE CONTEXT:
${context}

Answer the user's question based on this context.`;
  }
}
