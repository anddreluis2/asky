import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { VoyageAIClient } from "voyageai";
import type { Env } from "../config/env";

@Injectable()
export class EmbeddingService {
  private client: VoyageAIClient;

  // Voyage AI voyage-code-3 outputs 1024 dimensions
  public readonly dimensions = 1024;

  constructor(@Inject(ConfigService) private configService: ConfigService<Env>) {
    this.client = new VoyageAIClient({
      apiKey: this.configService.get("VOYAGE_API_KEY"),
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const result = await this.client.embed({
        input: text,
        model: "voyage-code-3",
      });

      return result.data?.[0]?.embedding ?? [];
    } catch (error: unknown) {
      console.error("❌ Voyage AI Embedding Error:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorStatus = 
        error && typeof error === "object" && "status" in error 
          ? (error.status as number | undefined)
          : undefined;

      if (errorStatus === 401 || errorMessage.includes("invalid") || errorMessage.includes("API key")) {
        throw new Error("Invalid Voyage AI API key. Please check your VOYAGE_API_KEY environment variable.");
      }
      throw new Error(`Failed to generate embedding: ${errorMessage}`);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    // Voyage AI has a limit of 128 texts per request
    const batchSize = 128;
    const allEmbeddings: number[][] = [];

    try {
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);

        const result = await this.client.embed({
          input: batch,
          model: "voyage-code-3",
        });

        const embeddings = result.data?.map((d) => d.embedding ?? []) ?? [];
        allEmbeddings.push(...embeddings);
      }
    } catch (error: unknown) {
      console.error("❌ Voyage AI Embeddings Error:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorStatus = 
        error && typeof error === "object" && "status" in error 
          ? (error.status as number | undefined)
          : undefined;

      if (errorStatus === 401 || errorMessage.includes("invalid") || errorMessage.includes("API key")) {
        throw new Error("Invalid Voyage AI API key. Please check your VOYAGE_API_KEY environment variable.");
      }
      throw new Error(`Failed to generate embeddings: ${errorMessage}`);
    }

    return allEmbeddings;
  }
}
