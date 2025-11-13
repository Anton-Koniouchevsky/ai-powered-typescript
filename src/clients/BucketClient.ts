export interface FileUploadResponse {
  [key: string]: any;
}

export default class DialBucketClient {
  private apiKey: string;
  private baseUrl: string;
  private bucketId: string | null = null;

  constructor(baseUrl: string, apiKey: string, ) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private getHeaders() {
    return {
      'Api-Key': this.apiKey,
      'Content-Type': 'application/json'
    };
  }

  private async getBucket(): Promise<string> {
    if (!this.bucketId) {
      const response = await fetch(`${this.baseUrl}/v1/bucket`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const bucketJson = await response.json() as any;
      
      if (bucketJson.appdata) {
        this.bucketId = bucketJson.appdata as string;
      } else if (bucketJson.bucket) {
        this.bucketId = bucketJson.bucket as string;
      } else {
        throw new Error('No appdata or bucket found');
      }
    }

    return this.bucketId;
  }

  async putFile(name: string, content: Blob): Promise<FileUploadResponse> {
    const path = await this.getBucket();

    const formData = new FormData();
    formData.append(name, content, name);

    const response = await fetch(`${this.baseUrl}/v1/files/${path}/${name}`, {
      method: 'PUT',
      headers: {
        'Api-Key': this.apiKey
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json() as FileUploadResponse;
  }

  async getFile(url: string): Promise<ArrayBuffer> {
    const response = await fetch(`${this.baseUrl}/v1/${url}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.arrayBuffer();
  }
}