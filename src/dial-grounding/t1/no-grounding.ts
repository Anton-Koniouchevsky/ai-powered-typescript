import 'dotenv/config';
import CustomClient from '../../clients/CustomClient';
import UserClient from '../../clients/UserClient';
import Role from '../../models/Role';
import { prompt } from '../../utils/input';
import TokenTracker from '../../utils/TokenTracker';
import { formatUsers } from '../../utils/user-formatter';

const BATCH_SYSTEM_PROMPT = `You are a user search assistant. Your task is to find users from the provided list that match the search criteria.

INSTRUCTIONS:
1. Analyze the user question to understand what attributes/characteristics are being searched for
2. Examine each user in the context and determine if they match the search criteria
3. For matching users, extract and return their complete information
4. Be inclusive - if a user partially matches or could potentially match, include them

OUTPUT FORMAT:
- If you find matching users: Return their full details exactly as provided, maintaining the original format
- If no users match: Respond with exactly "NO_MATCHES_FOUND"
- If uncertain about a match: Include the user with a note about why they might match`;

const FINAL_SYSTEM_PROMPT = `You are a helpful assistant that provides comprehensive answers based on user search results.

INSTRUCTIONS:
1. Review all the search results from different user batches
2. Combine and deduplicate any matching users found across batches
3. Present the information in a clear, organized manner
4. If multiple users match, group them logically
5. If no users match, explain what was searched for and suggest alternatives`;

const USER_PROMPT = `## USER DATA:
{context}

## SEARCH QUERY: 
{query}`;

const userClient = new UserClient();

const llmClient = new CustomClient('gpt-4o', {
  temperature: 0,
});

const tokenTracker = new TokenTracker();

async function generateResponse(systemPrompt: string, userPrompt: string): Promise<string> {
  console.log('Processing...');

  const messages = [
    { role: Role.System, content: systemPrompt },
    { role: Role.User, content: userPrompt },
  ];

  const response = await llmClient.getCompletion(messages);
  const totalTokens = response.metadata?.total_tokens || 0;
  tokenTracker.addTokens(totalTokens);

  console.log(`Response:\n${response.content}\nTokens used: ${totalTokens}\n`);
  return response.content as string;
}

async function main(): Promise<void> {
  console.log('Query samples:');
  console.log(' - Do we have someone with name John that loves traveling?');

  const userQuery = await prompt('Enter your user search query: ');

  console.log("\n--- Searching user database ---");

  const users = await userClient.getAllUsers();

  const userBatches = [];
  for (let i = 0; i < users.length; i += 100) {
    userBatches.push(users.slice(i, i + 100));
  }

  const tasks = [];
  for (const batch of userBatches) {
    const context = formatUsers(batch);
    const userPrompt = USER_PROMPT.replace('{context}', context).replace('{query}', userQuery);
    tasks.push(generateResponse(BATCH_SYSTEM_PROMPT, userPrompt));
  }
  const batchResults = await Promise.all(tasks);
  
  console.log("\n--- Compiling results ---");

  const relevantResults = batchResults.filter(result => result.trim() !== 'NO_MATCHES_FOUND');

  console.log("\n=== SEARCH RESULTS ===");

  if (relevantResults.length === 0) {
    console.log(`No users found matching '${userQuery}'`);
    console.log('\nTry refining your search or using different keywords.');
  } else {
    const combinedContext = relevantResults.join('\n\n');
    const finalUserPrompt = `SEARCH RESULTS:\n${combinedContext}\n\nORIGINAL QUERY:\n${userQuery}`;
    await generateResponse(FINAL_SYSTEM_PROMPT, finalUserPrompt);
  }

  const summary = tokenTracker.getSummary();
  console.log('=== Performance ===');
  console.log(`Total API calls: ${summary.batchCount}`);
  console.log(`Total tokens: ${summary.totalTokens}`);
}

main();

/*
# The problems with No Grounding approach are:
#   - If we load whole users as context in one request to LLM we will hit context window
#   - Huge token usage == Higher price per request
#   - Added + one chain in flow where original user data can be changed by LLM (before final generation)
# User Question -> Get all users -> ‼️parallel search of possible candidates‼️ -> probably changed original context -> final generation
*/