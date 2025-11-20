interface Embedding {
  object: 'embedding';
  embedding: number[];
  index: number;
}

interface EmbeddingsClientData {
  data: Array<Embedding>
}

class EmbeddingsClient {
  private endpoint: string;
  private apiKey: string;

  constructor(modelName: string) {
    this.endpoint = `${process.env.DIAL_ENDPOINT}/openai/deployments/${modelName}/embeddings`;
    this.apiKey = process.env.DIAL_API_KEY ?? "";
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    const headers = {
      "Content-Type": "application/json",
      "Api-Key": this.apiKey,
    };

    const requestData = {
      input: documents,
      // encoding_format: "float",
      // dimensions: 1536
    };

    
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      console.log(await response.text());
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const { data } = await response.json() as EmbeddingsClientData;
    return data.map(item => item.embedding);
  }

  async embedQuery(document: string): Promise<number[]> {
    return (await this.embedDocuments([document]))[0]!;
  }
}

export default EmbeddingsClient;