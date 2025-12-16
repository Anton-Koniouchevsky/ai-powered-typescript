import express, { Request, Response } from 'express';
import { MCPRequest } from './models/request';
import { MCPResponse } from './models/response';
import { MCPServer } from './services/mcp-server';

const MCP_SESSION_ID_HEADER = 'mcp-session-id';

const app = express();
const mcpServer = new MCPServer();

app.use(express.json());

function validateAcceptHeader(acceptHeader?: string): boolean {
  if (!acceptHeader) {
    return false;
  }

  const acceptTypes = acceptHeader.split(',').map(t => t.trim().toLowerCase());
  const hasJson = acceptTypes.some(t => t.includes('application/json'));
  const hasSse = acceptTypes.some(t => t.includes('text/event-stream'));

  return hasJson && hasSse;
}

async function* createSseStream(messages: MCPResponse[]): AsyncGenerator<string> {
  for (const message of messages) {
    console.log(messages);
    const cleanMessage = Object.fromEntries(
      Object.entries(message).filter(([, v]) => v !== undefined && v !== null)
    );
    const eventData = `data: ${JSON.stringify(cleanMessage)}\n\n`;
    yield eventData;
  }
  yield 'data: [DONE]\n\n';
}

app.post('/mcp', async (req: Request, res: Response) => {
  const request: MCPRequest = req.body;
  const acceptHeader = req.headers['accept'];
  let mcpSessionId = req.headers[MCP_SESSION_ID_HEADER] as string | undefined;

  // Validate Accept header for all requests
  if (!validateAcceptHeader(acceptHeader)) {
    const errorResponse: MCPResponse = {
      jsonrpc: '2.0',
      id: 'server-error',
      error: {
        code: -32600,
        message: 'Client must accept both application/json and text/event-stream',
      },
    };
    res.status(406).json(errorResponse);
    return;
  }

  let mcpResponse: MCPResponse;

  // Handle initialization (no session required)
  if (request.method === 'initialize') {
    const [response, sessionId] = mcpServer.handleInitialize(request);
    mcpResponse = response;
    if (sessionId) {
      res.setHeader(MCP_SESSION_ID_HEADER, sessionId);
      mcpSessionId = sessionId;
    }
  } else {
    // Validate Mcp-Session-Id header presence
    if (!mcpSessionId) {
      const errorResponse: MCPResponse = {
        jsonrpc: '2.0',
        id: 'server-error',
        error: {
          code: -32600,
          message: 'Missing session ID',
        },
      };
      res.status(400).json(errorResponse);
      return;
    }

    const session = mcpServer.getSession(mcpSessionId);
    if (!session) {
      res.status(400).send('No valid session ID provided');
      return;
    }

    // Handle notifications that don't need responses
    if (request.method === 'notifications/initialized') {
      session.readyForOperation = true;
      console.log('Client initialization complete');
      res.status(202).setHeader(MCP_SESSION_ID_HEADER, session.sessionId).end();
      return;
    }

    // Handle different MCP methods
    if (!session.readyForOperation) {
      const errorResponse: MCPResponse = {
        jsonrpc: '2.0',
        id: 'server-error',
        error: {
          code: -32600,
          message: 'Session not ready for operations',
        },
      };
      res.status(400).json(errorResponse);
      return;
    }

    if (request.method === 'tools/list') {
      mcpResponse = mcpServer.handleToolsList(request);
    } else if (request.method === 'tools/call') {
      mcpResponse = await mcpServer.handleToolsCall(request);
    } else {
      mcpResponse = {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32602,
          message: `Method '${request.method}' not found`,
        },
      };
    }
  }

  // Stream response as SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (mcpSessionId) {
    res.setHeader(MCP_SESSION_ID_HEADER, mcpSessionId);
  }

  // Stream the response
  for await (const chunk of createSseStream([mcpResponse])) {
    res.write(chunk);
  }
  res.end();
});

const PORT = process.env.PORT || 8006;

app.listen(PORT, () => {
  console.log(`MCP Server running on http://0.0.0.0:${PORT}`);
});
