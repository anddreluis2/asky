import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import type { Env } from "../config/env";

@Injectable()
export class EmbeddingService {
  private client: OpenAI;

  // OpenAI text-embedding-3-small outputs 1536 dimensions
  public readonly dimensions = 1536;

  constructor(@Inject(ConfigService) private configService: ConfigService<Env>) {
    this.client = new OpenAI({
      apiKey: this.configService.get("OPENAI_API_KEY"),
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const result = await this.client.embeddings.create({
        input: text,
        model: "text-embedding-3-small",
      });

      return result.data[0]?.embedding ?? [];
    } catch (error: unknown) {
      console.error("❌ OpenAI Embedding Error:", error);

      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorStatus =
        error && typeof error === "object" && "status" in error
          ? (error.status as number | undefined)
          : undefined;

      if (errorStatus === 401 || errorMessage.includes("invalid") || errorMessage.includes("API key")) {
        throw new Error("Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.");
      }
      throw new Error(`Failed to generate embedding: ${errorMessage}`);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    // OpenAI supports up to 2048 texts per request, but we'll use a safe batch size
    const batchSize = 100;
    const allEmbeddings: number[][] = [];

    try {
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);

        const result = await this.client.embeddings.create({
          input: batch,
          model: "text-embedding-3-small",
        });

        const embeddings = result.data.map((d) => d.embedding);
        allEmbeddings.push(...embeddings);
      }
    } catch (error: unknown) {
      console.error("❌ OpenAI Embeddings Error:", error);

      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorStatus =
        error && typeof error === "object" && "status" in error
          ? (error.status as number | undefined)
          : undefined;

      if (errorStatus === 401 || errorMessage.includes("invalid") || errorMessage.includes("API key")) {
        throw new Error("Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.");
      }
      throw new Error(`Failed to generate embeddings: ${errorMessage}`);
    }

    return allEmbeddings;
  }
}
