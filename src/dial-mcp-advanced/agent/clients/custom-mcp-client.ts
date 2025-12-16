import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';

const MCP_SESSION_ID_HEADER = 'mcp-session-id';

export class CustomMCPClient {
  private serverUrl: string;
  private sessionId: string | null = null;
  private httpClient: AxiosInstance;

  constructor(mcpServerUrl: string) {
    this.serverUrl = mcpServerUrl;
    this.httpClient = axios.create({
      timeout: 30000,
    });
  }

  static async create(mcpServerUrl: string): Promise<CustomMCPClient> {
    const instance = new CustomMCPClient(mcpServerUrl);
    await instance.connect();
    return instance;
  }

  private async sendRequest(
    method: string,
    params?: Record<string, any>
  ): Promise<any> {
    const requestData: any = {
      jsonrpc: '2.0',
      id: uuidv4(),
      method,
    };

    if (params) {
      requestData.params = params;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    };

    if (method !== 'initialize' && this.sessionId) {
      headers[MCP_SESSION_ID_HEADER] = this.sessionId;
    }

    const response = await this.httpClient.post(this.serverUrl, requestData, {
      headers,
      responseType: 'stream',
    });

    const sessionIdHeader = response.headers[MCP_SESSION_ID_HEADER.toLowerCase()];
    if (!this.sessionId && sessionIdHeader) {
      this.sessionId = sessionIdHeader;
    }

    if (response.status === 202) {
      return {};
    }

    const responseData = await this.parseSseResponse(response.data);

    if (responseData.error) {
      const error = responseData.error;
      throw new Error(`MCP Error ${error.code}: ${error.message}`);
    }

    return responseData;
  }

  private async parseSseResponse(stream: any): Promise<any> {
    return new Promise((resolve, reject) => {
      let buffer = '';

      stream.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf-8');
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();

          if (!trimmedLine || trimmedLine.startsWith(':')) {
            continue;
          }

          if (trimmedLine.startsWith('data: ')) {
            const dataPart = trimmedLine.substring(6).trim();

            if (dataPart === '[DONE]' || dataPart === '') {
              continue;
            }

            try {
              const parsed = JSON.parse(dataPart);
              resolve(parsed);
              return;
            } catch (e) {
              console.error('Failed to parse JSON from SSE data:', e);
              continue;
            }
          }
        }
      });

      stream.on('end', () => {
        reject(new Error('No valid JSON data found in SSE stream'));
      });

      stream.on('error', (err: Error) => {
        reject(err);
      });
    });
  }

  async connect(): Promise<void> {
    try {
      const initParams = {
        protocolVersion: '2024-11-05',
        capabilities: {
          prompts: null,
          resources: null,
          tools: {},
        },
        clientInfo: {
          name: 'my-custom-mcp-client',
          version: '1.0.0',
        },
      };

      const initResult = await this.sendRequest('initialize', initParams);
      await this.sendNotification('notifications/initialized');
      console.log(JSON.stringify(initResult, null, 2));
    } catch (error) {
      throw new Error(`Failed to connect to MCP server: ${error}`);
    }
  }

  private async sendNotification(method: string): Promise<void> {
    const requestData: any = {
      jsonrpc: '2.0',
      method,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    };

    if (this.sessionId) {
      headers[MCP_SESSION_ID_HEADER] = this.sessionId;
    }

    const response = await this.httpClient.post(this.serverUrl, requestData, {
      headers,
    });

    const sessionIdHeader = response.headers[MCP_SESSION_ID_HEADER.toLowerCase()];
    if (sessionIdHeader) {
      this.sessionId = sessionIdHeader;
      console.log(`Session ID: ${this.sessionId}`);
    }
  }

  async getTools(): Promise<any[]> {
    const response = await this.sendRequest('tools/list');
    const tools = response.result.tools;

    return tools.map((tool: any) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description || '',
        parameters: tool.inputSchema || {},
      },
    }));
  }

  async callTool(toolName: string, toolArgs: Record<string, any>): Promise<any> {
    console.log(`    Calling \`${toolName}\` with`, toolArgs);

    const params = {
      name: toolName,
      arguments: toolArgs,
    };

    const response = await this.sendRequest('tools/call', params);

    const content = response.result?.content;
    if (content && content.length > 0) {
      const textResult = content[0].text || '';
      console.log(`    ⚙️: ${textResult}\n`);
      return textResult;
    }

    return 'Unexpected error occurred!';
  }
}
