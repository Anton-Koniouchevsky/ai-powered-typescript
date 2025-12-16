import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import z from 'zod';

export class MCPClient {
  private serverUrl: URL;
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;

  constructor(mcpServerUrl: string) {
    this.serverUrl = new URL(mcpServerUrl);
  }

  static async create(mcpServerUrl: string): Promise<MCPClient> {
    const instance = new MCPClient(mcpServerUrl);
    await instance.connect();
    return instance;
  }

  async connect(): Promise<void> {
    this.transport = new StreamableHTTPClientTransport(this.serverUrl);
    this.client = new Client(
      {
        name: 'my-mcp-client',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        } as any,
      }
    );

    await this.client.connect(this.transport);

    const initResult = await this.client.request(
      { method: 'initialize' },
      z.object({}),
      { timeout: 30000 }
    );
    console.log(JSON.stringify(initResult, null, 2));
  }

  async getTools(): Promise<any[]> {
    if (!this.client) {
      throw new Error('MCP client not connected. Call connect() first.');
    }

    const response = await this.client.listTools();
    
    return response.tools.map((tool: any) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description || '',
        parameters: tool.inputSchema || {},
      },
    }));
  }

  async callTool(toolName: string, toolArgs: Record<string, any>): Promise<any> {
    if (!this.client) {
      throw new Error('MCP client not connected. Call connect() first.');
    }

    console.log(`Calling \`${toolName}\` with`, toolArgs);

    const result = await this.client.callTool({
      name: toolName,
      arguments: toolArgs,
    });

    const content = result.content as any[];
    console.log(`⚙️:`, content, '\n');

    if (content && content.length > 0 && content[0].type === 'text') {
      return content[0].text;
    }

    return content;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
  }
}
