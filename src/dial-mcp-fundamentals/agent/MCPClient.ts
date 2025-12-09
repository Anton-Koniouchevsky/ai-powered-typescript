import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

export class MCPClient {
  private client: Client;

  constructor(private mcpServerUrl: string) {
    this.client = new Client({
      name: "mcp-client",
      version: "1.0.0",
    });
  }

  async connect() {
    return await this.client.connect(new StreamableHTTPClientTransport(
      new URL(`http://localhost:8005/mcp`),
    ));
  }

  async getTools() {
    const { tools } = await this.client.listTools();

    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    }));
  }

  async callTool(toolName: string, toolArgs: object): Promise<string> {
    console.log(`Calling tool: ${toolName} with args: ${JSON.stringify(toolArgs)}`);
    const response = await this.client.callTool({ name: toolName }, null as any, toolArgs);
    console.log(`Tool response: ${JSON.stringify(response.content)}`);
    const content = (response.content as any)[0];

    if (content.text) {
      return content.text;
    }

    return content;
  }

  async getResources() {
    const { resources } = await this.client.listResources();
    return resources;
  }

  async getResource(uri: string) {
    const resource = await this.client.readResource({ uri });
    console.log(`Tool response: ${JSON.stringify(resource.content)}`);
    const content = (resource.content as any)[0];

    if (content.text) {
      return content.text;
    }

    return content.blob;
  }

  async getPrompts() {
    const { prompts } = await this.client.listPrompts();
    return prompts;
  }

  async getPrompt(name: string): Promise<string> {
    const { messages } = await this.client.getPrompt({ name });
    return messages.reduce((acc, msg) => {
      return acc + msg.content + '\n';
    }, '');
  }
}
