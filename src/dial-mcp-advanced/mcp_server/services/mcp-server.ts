import { v4 as uuidv4 } from 'uuid';
import { MCPRequest } from '../models/request';
import { MCPResponse } from '../models/response';
import { BaseTool } from '../tools/base';
import { UserClient } from '../tools/users/user-client';
import { GetUserByIdTool } from '../tools/users/get-user-by-id-tool';
import { SearchUsersTool } from '../tools/users/search-users-tool';
import { CreateUserTool } from '../tools/users/create-user-tool';
import { UpdateUserTool } from '../tools/users/update-user-tool';
import { DeleteUserTool } from '../tools/users/delete-user-tool';

export class MCPSession {
  sessionId: string;
  readyForOperation: boolean;
  createdAt: number;
  lastActivity: number;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.readyForOperation = false;
    this.createdAt = Date.now();
    this.lastActivity = this.createdAt;
  }
}

export class MCPServer {
  private protocolVersion = '2024-11-05';
  private serverInfo = {
    name: 'custom-ums-mcp-server',
    version: '1.0.0',
  };
  private sessions: Map<string, MCPSession> = new Map();
  private tools: Map<string, BaseTool> = new Map();

  constructor() {
    this.registerTools();
  }

  private registerTools(): void {
    const userClient = new UserClient();
    const tools = [
      new GetUserByIdTool(userClient),
      new SearchUsersTool(userClient),
      new CreateUserTool(userClient),
      new UpdateUserTool(userClient),
      new DeleteUserTool(userClient),
    ];

    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }
  }

  private validateProtocolVersion(clientVersion: string): string {
    const supportedVersions = ['2024-11-05'];
    if (supportedVersions.includes(clientVersion)) {
      return clientVersion;
    }
    return this.protocolVersion;
  }

  getSession(sessionId: string): MCPSession | null {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
    return session || null;
  }

  handleInitialize(request: MCPRequest): [MCPResponse, string] {
    const sessionId = uuidv4().replace(/-/g, '');
    const session = new MCPSession(sessionId);
    this.sessions.set(sessionId, session);

    const protocolVersion = request.params?.protocolVersion || this.protocolVersion;
    const response: MCPResponse = {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        protocolVersion,
        capabilities: {
          tools: { listChanged: true },
          resources: {},
          prompts: {},
        },
        serverInfo: this.serverInfo,
      },
    };

    return [response, sessionId];
  }

  handleToolsList(request: MCPRequest): MCPResponse {
    const toolsList = Array.from(this.tools.values()).map(tool => tool.toMCPTool());
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: { tools: toolsList },
    };
  }

  async handleToolsCall(request: MCPRequest): Promise<MCPResponse> {
    if (!request.params) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32602,
          message: 'Missing parameters',
        },
      };
    }

    const toolName = request.params.name;
    const arguments_ = request.params.arguments || {};

    console.log(request);

    if (!toolName) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32602,
          message: 'Missing required parameter: name',
        },
      };
    }

    const tool = this.tools.get(toolName);
    if (!tool) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32601,
          message: `Tool '${toolName}' not found`,
        },
      };
    }

    try {
      const resultText = await tool.execute(arguments_);
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          content: [
            {
              type: 'text',
              text: resultText,
            },
          ],
        },
      };
    } catch (toolError: any) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          content: [
            {
              type: 'text',
              text: `Tool execution error: ${toolError.message || String(toolError)}`,
            },
          ],
          isError: true,
        },
      };
    }
  }
}
