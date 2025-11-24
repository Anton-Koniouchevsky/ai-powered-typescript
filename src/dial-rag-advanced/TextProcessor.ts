import { readFileSync } from "fs";
import EmbeddingsClient from "../clients/EmbeddingsClient";
import { Client } from "pg";
import { chunkText } from "../utils/text";

interface DBConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export enum SearchMode {
  EUCLIDEAN_DISTANCE = "euclidean",
  COSINE_DISTANCE = "cosine"
}

class TextProcessor {
  constructor(private embeddings: EmbeddingsClient, private dbConfig: DBConfig) {}

  private getConnection(): Client {
    const client = new Client(this.dbConfig);
    return client;
  }

  async processTextFile(fileName: string, chunkSize: number, overlap: number, dimensions: number, trancateTable = true): Promise<void> {
    if (chunkSize < 10) {
      throw new Error("Chunk size must be at least 10 characters.");
    } else if (overlap < 0) {
      throw new Error("Overlap must be a non-negative number.");
    } else if (overlap >= chunkSize) {
      throw new Error("Overlap must be smaller than chunk size.");
    }

    if (trancateTable) {
      this.truncateTable();
    }

    const filePath = `assets/${fileName}`;
    const fileContent = readFileSync(filePath, "utf-8");

    const chunks: string[] = chunkText(fileContent, chunkSize, overlap);
    const embeddings = await this.embeddings.embedDocuments(chunks, { dimensions });

    console.log(`Processing document: ${fileName}`);
    console.log(`Total chunks: ${chunks.length}`);
    console.log(`Total embeddings: ${embeddings.length}`);

    for (const chunkIndex in chunks) {
      await this.saveChunk(embeddings[chunkIndex]!, chunks[chunkIndex]!, fileName);
    }
  }

  private async truncateTable(): Promise<void> {
    const client = this.getConnection();
    await client.connect();

    const query = `TRUNCATE TABLE vectors`;
    await client.query(query);
    await client.end();

    console.log("Table has been successfully truncated.");
  }

  private async saveChunk(embedding: number[], chunk: string, source: string): Promise<void> {
    const vectorString = `[${embedding.join(',')}]`;

    const client = this.getConnection();
    await client.connect();

    const query = `
      INSERT INTO vectors (document_name, text, embedding)
      VALUES ($1, $2, $3::vector)
    `;

    await client.query(query, [source, chunk, vectorString]);
    await client.end();
  }

  async search(searchMode: SearchMode, userRequest: string, topK: number, scoreThreshold: number, dimensions: number): Promise<string[]> {
    if (topK < 1) {
      throw new Error("topK must be at least 1.");
    } else if (scoreThreshold < 0 || scoreThreshold > 1) {
      throw new Error("scoreThreshold must be between 0 and 1.");
    }

    const queryEmbedding = await this.embeddings.embedQuery(userRequest, { dimensions });
    const vectorString = `[${queryEmbedding.join(',')}]`;

    let maxDistance: number;
    if (searchMode === SearchMode.COSINE_DISTANCE) {
      maxDistance = 1 - scoreThreshold;
    } else {
      maxDistance = scoreThreshold === 0 ? Number.MAX_VALUE : (1 / scoreThreshold) - 1;
    }

    const retrievedChunks: string[] = [];
    const client = this.getConnection();
    await client.connect();

    const query = this.getSearchQuery(searchMode);

    const result = await client.query(query, [vectorString, vectorString, maxDistance, topK]);

    for (const row of result.rows) {
      let similarity: number;
      if (searchMode === SearchMode.COSINE_DISTANCE) {
        similarity = 1 - row.distance;
      } else {
        similarity = 1 / (1 + row.distance);
      }

      console.log(`Similarity score: ${similarity.toFixed(2)}`);
      console.log(`Data: ${row.text}\n`);

      retrievedChunks.push(row.text);
    }

    await client.end();
    return retrievedChunks;
  }

  private getSearchQuery(searchMode: SearchMode): string {
    const mode = searchMode === SearchMode.COSINE_DISTANCE ? "<=>" : "<->";
    return `SELECT text, embedding ${mode} $1::vector AS distance
      FROM vectors
      WHERE embedding ${mode} $2::vector <= $3
      ORDER BY distance
      LIMIT $4
    `;
  }
}

export default TextProcessor;
