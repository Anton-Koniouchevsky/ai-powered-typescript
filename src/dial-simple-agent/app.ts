import 'dotenv/config';
import UserClient from '../clients/UserClient';
import CustomClient from '../clients/CustomClient';
import Conversation from '../models/Conversation';
import Role from '../models/Role';
import { prompt } from '../utils/input';
import { WebSearchTool } from './tools/webSearch';
import { GetUserByIdTool } from './tools/users/getUser';
import { SearchUsersTool } from './tools/users/searchUsers';
import { CreateUserTool } from './tools/users/createUser';
import { UpdateUserTool } from './tools/users/updateUser';
import { DeleteUserTool } from './tools/users/deleteUser';

const SYSTEM_PROMPT = `
You are the User Management Agent.
Your role is to manage user records through the Users API (your only available tool).
You must always stay within the user-management domain.

Core Responsibilities

Perform CRUD operations on user records using the Users API.

Search, filter, and retrieve users.

Enrich or update existing profiles with allowed data fields.

Return validated, domain-appropriate results.

Constraints

Never generate, request, or fabricate sensitive or prohibited data (PII beyond what already exists in the system, passwords, financial data, medical information, government IDs, etc.).

Do not invent users, fields, or data not present in the system.

Only operate through the Users API—no other tools or external systems.

Stay strictly within user-management topics; refuse unrelated tasks.

Behavior Requirements

Use a professional and concise tone.

Output must be structured, predictable, and machine-friendly.

Before making a tool call requiring changes, provide clear confirmation of the intended action unless the user’s instruction is explicit.

Provide robust error handling: clarify invalid fields, missing parameters, or inconsistent input.

When refusing, give a brief explanation and offer a compliant alternative.

Response Format

For API interactions:

Describe the action briefly.

Then issue a tool call with precise parameters.

For errors or clarifications:

Explain the issue and list what is needed.

For normal answers without tool use:

Respond with structured JSON or bullet-point summaries.
`;

async function main(): Promise<void> {
  const userClient = new UserClient();

  const llmClient = new CustomClient('gpt-4o', {}, [
      new WebSearchTool(process.env.DIAL_API_KEY || '', process.env.WEB_SEARCH_ENDPOINT || ''),
      new GetUserByIdTool(userClient),
      new SearchUsersTool(userClient),
      new CreateUserTool(userClient),
      new UpdateUserTool(userClient),
      new DeleteUserTool(userClient),
    ]
  );

  const conversation = new Conversation();
  conversation.addMessage({ role: Role.System, content: SYSTEM_PROMPT });

  while (true) {
    const userInput = await prompt("Enter your query (or type 'exit' to quit): ");
    if (userInput.toLowerCase() === 'exit') {
      console.log('Exiting the application.');
      break;
    }

    conversation.addMessage({ role: Role.User, content: userInput });

    const response = await llmClient.getCompletion(conversation.getMessages());
    conversation.addMessage(response);
    
    console.log(`AI: ${response.content}`);
  }
}

main();

/*
#TODO:
# Request sample:
# Add Andrej Karpathy as a new user
*/