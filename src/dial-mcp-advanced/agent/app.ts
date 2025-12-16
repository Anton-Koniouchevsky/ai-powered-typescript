import * as readline from 'readline';
import { MCPClient } from './clients/mcp-client';
import { CustomMCPClient } from './clients/custom-mcp-client';
import { DialClient } from './clients/dial-client';
import Message from '../../models/Message';
import Role from '../../models/Role';

async function collectTools(
  client: MCPClient | CustomMCPClient,
  tools: any[],
  toolNameClientMap: Map<string, MCPClient | CustomMCPClient>
): Promise<void> {
  const clientTools = await client.getTools();
  for (const tool of clientTools) {
    tools.push(tool);
    const toolName = tool.function?.name;
    if (toolName) {
      toolNameClientMap.set(toolName, client);
      console.log(JSON.stringify(tool, null, 2));
    }
  }
}

async function main(): Promise<void> {
  const tools: any[] = [];
  const toolNameClientMap = new Map<string, MCPClient | CustomMCPClient>();

  // Connect to UMS MCP server
  const umsMcpClient = await MCPClient.create('http://localhost:8006/mcp');
  await collectTools(umsMcpClient, tools, toolNameClientMap);

  // Connect to fetch MCP server
  const fetchMcpClient = await CustomMCPClient.create(
    'https://remote.mcpservers.org/fetch/mcp'
  );
  await collectTools(fetchMcpClient, tools, toolNameClientMap);

  // Initialize DIAL client
  const dialClient = new DialClient(
    process.env.DIAL_API_KEY || '',
    process.env.DIAL_ENDPOINT || '',
    tools,
    toolNameClientMap
  );

  const messages: Message[] = [
    {
      role: Role.System,
      content:
        'You are an advanced AI agent. Your goal is to assist user with his questions.',
    },
  ];

  console.log("MCP-based Agent is ready! Type your query or 'exit' to exit.");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = (): Promise<string> => {
    return new Promise((resolve) => {
      rl.question('\n> ', (answer) => {
        resolve(answer.trim());
      });
    });
  };

  while (true) {
    const userInput = await askQuestion();

    if (userInput.toLowerCase() === 'exit') {
      rl.close();
      break;
    }

    messages.push({
      role: Role.User,
      content: userInput,
    });

    const aiMessage = await dialClient.getCompletion(messages);
    messages.push(aiMessage);
  }

  // Cleanup
  await umsMcpClient.disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

// Check if Arkadiy Dobkin present as a user, if not then search info about him in the web and add him
