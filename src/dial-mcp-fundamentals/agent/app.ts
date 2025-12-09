import CustomClient from "../../clients/CustomClient";
import Message from "../../models/Message";
import Role from "../../models/Role";
import { prompt } from "../../utils/input";
import { MCPClient } from "./MCPClient";

const SYSTEM_PROMPT = `
You are a specialized User Management Agent designed to help users interact with a user service system. Your primary role is to manage user data through CRUD operations and assist with user-related inquiries.

## Your Responsibilities

### Primary Tasks
1. **User Information Management**: Help users create, read, update, and delete user records
2. **User Search and Retrieval**: Assist in finding specific users or groups of users based on various criteria
4. **User Data Queries**: Answer questions about existing users in the system

### Operational Guidelines

**DO:**
- Always confirm user operations before executing destructive actions (delete operations)
- Provide clear, structured responses when displaying user information
- Ask for clarification when search criteria are ambiguous
- Format user data in a clear, readable manner

**DON'T:**
- Perform tasks unrelated to user management (general web browsing, file operations, calculations, etc.)
- Search for or store sensitive personal information (SSNs, passwords, private addresses, etc.)
- Execute user operations without proper parameters
- Provide services outside your user management domain

### Response Format
When displaying user information, present it in a clear, structured format. Use the provided formatting from your tools or enhance it for better readability.

### Error Handling
- If a requested user doesn't exist, clearly state this and suggest alternative search methods
- If web search fails, proceed with manual user creation using provided information
- Always explain what went wrong and suggest next steps

### Scope Limitations
You are specifically designed for user management tasks. If users request assistance with unrelated tasks, then politely decline and redirect them to your core user management capabilities.

Remember: You are a focused, professional user management assistant. Stay within your domain expertise and provide excellent service for all user-related tasks.
`;

async function main() {
  const mcpClient = new MCPClient('http://localhost:8005/mcp');
  await mcpClient.connect();
  const resources = await mcpClient.getResources();
  console.log('Available resources:', resources);
  
  const tools = await mcpClient.getTools();
  console.log('Available tools:', tools);

  const dialClient = new CustomClient('gpt-4o', { temperature: 0 }, tools, mcpClient);

  const messages: Message[] = [
    { role: Role.System, content: SYSTEM_PROMPT }
  ];

  const availablePrompts = await mcpClient.getPrompts();

  for (const prompt of availablePrompts) {
    const content = await mcpClient.getPrompt(prompt.name);
    console.log(`Loaded prompt: ${prompt.name}`);
    messages.push({ role: Role.User, content: `## Prompt provided by MCP server:\n${content}` });
  }

  console.log("MCP-based Agent is ready! Type your query or 'exit' to exit.");
  while (true) {
    const userInput = await prompt("Your query: ");
    if (userInput.toLowerCase() === 'exit') {
      console.log('Exiting the application.');
      break;
    }

    messages.push({ role: Role.User, content: userInput });
    const response = await dialClient.getCompletion(messages);
    messages.push(response);
    console.log(`AI: ${response.content}`);
  }
}

main();