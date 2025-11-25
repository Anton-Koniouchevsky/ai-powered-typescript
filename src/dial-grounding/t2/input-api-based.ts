import 'dotenv/config';
import Role from "../../models/Role";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import z from "zod";
import UserClient, { User } from "../../clients/UserClient";
import { formatUsers } from "../../utils/user-formatter";
import { prompt } from "../../utils/input";
import CustomClient from '../../clients/CustomClient';

const QUERY_ANALYSIS_PROMPT = `You are a query analysis system that extracts search parameters from user questions about users.

## Available Search Fields:
- **name**: User's first name (e.g., "John", "Mary")
- **surname**: User's last name (e.g., "Smith", "Johnson") 
- **email**: User's email address (e.g., "john@example.com")

## Instructions:
1. Analyze the user's question and identify what they're looking for
2. Extract specific search values mentioned in the query
3. Map them to the appropriate search fields
4. If multiple search criteria are mentioned, include all of them
5. Only extract explicit values - don't infer or assume values not mentioned

## Examples:
- "Who is John?" → name: "John"
- "Find users with surname Smith" → surname: "Smith" 
- "Look for john@example.com" → email: "john@example.com"
- "Find John Smith" → name: "John", surname: "Smith"
- "I need user emails that filled with hiking" → No clear search parameters (return empty list)

## Response Format:
{format_instructions}`;

const SYSTEM_PROMPT = `You are a RAG-powered assistant that assists users with their questions about user information.
            
## Structure of User message:
'RAG CONTEXT' - Retrieved documents relevant to the query.
'USER QUESTION' - The user's actual question.

## Instructions:
- Use information from 'RAG CONTEXT' as context when answering the 'USER QUESTION'.
- Cite specific sources when using information from the context.
- Answer ONLY based on conversation history and RAG context.
- If no relevant information exists in 'RAG CONTEXT' or conversation history, state that you cannot answer the question.
- Be conversational and helpful in your responses.
- When presenting user information, format it clearly and include relevant details.
`

const USER_PROMPT = `## RAG CONTEXT:
{context}

## USER QUESTION: 
{query}`;

const SearchFieldSchema = z.enum(["name", "surname", "email"]);

const SearchParameterSchema = z.object({
  field: SearchFieldSchema,
  value: z.string(),
});

const SearchRequestSchema = z.object({
  parameters: z.array(SearchParameterSchema),
});

const llmClient = new CustomClient('gpt-4o', { temperature: 0 });

const userClient = new UserClient();

async function retrieveContext(userQuestion: string): Promise<User[]> {
  // Extract search parameters from user query and retrieve matching users.
  const parser = StructuredOutputParser.fromZodSchema(SearchRequestSchema);

  const messages = [
    { role: Role.System, content: QUERY_ANALYSIS_PROMPT.replace('{format_instructions}', parser.getFormatInstructions()) },
    { role: Role.User, content: userQuestion },
  ];

  const completion = await llmClient.getCompletion(messages);

  console.log('Query Analysis Completion:', completion.content);
  
  const searchRequests = await parser.parse(completion.content as string);
  console.log('searchRequests:', searchRequests);

  if (searchRequests.parameters.length) {
    const requestsDict: {name?: string, surname?: string, email?: string, gender?: string} = {};
    for (const param of searchRequests.parameters) {
      requestsDict[param.field] = param.value;
    }
    console.log('Searching users with parameters:', requestsDict);
    return await userClient.searchUsers(requestsDict);
  }

  console.log('No search parameters extracted from the query.');
  return [];
}

function augmentPrompt(userQuestion: string, users: User[]): string {
  // Combine user query with retrieved context into a formatted prompt.
  return USER_PROMPT
    .replace('{context}', formatUsers(users))
    .replace('{query}', userQuestion);
}

async function generateAnswer(augmentedPrompt: string): Promise<string> {
  // Generate final answer using the augmented prompt.

  const messages = [
      { role: Role.System, content: SYSTEM_PROMPT },
      { role: Role.User, content: augmentedPrompt }
  ];

  const response = await llmClient.getCompletion(messages);
  return response.content as string;
}

async function main(): Promise<void> {
  console.log('Query samples:');
  console.log(" - I need user emails that filled with hiking and psychology");
  console.log(" - Who is John?");
  console.log(" - Find users with surname Adams");
  console.log(" - Do we have smbd with name John that love painting?");

  while (true) {
    const userQuestion = await prompt("Type your question or 'exit' to quit: ");
    if (userQuestion.toLowerCase() === 'exit') {
      console.log('Exiting the application.');
      break;
    }

    const trimmedQuestion = userQuestion.trim();
    console.log('\n--- Retrieving context ---');
    const users = await retrieveContext(trimmedQuestion);
    if (users) {
      console.log('\n--- Augmenting prompt ---');
      const augmentedPrompt = augmentPrompt(trimmedQuestion, users);
      console.log('\n--- Generating answer ---');
      const answer = await generateAnswer(augmentedPrompt);
                
      console.log(`\n📝 Final Answer:\n${answer}`);
    } else {
      console.log('No relevant users found for the query.');
    }
  }
}

main();


/*
# The problems with API based Grounding approach are:
#   - We need a Pre-Step to figure out what field should be used for search (Takes time)
#   - Values for search should be correct (✅ John -> ❌ Jonh)
#   - Is not so flexible
# Benefits are:
#   - We fetch actual data (new users added and deleted every 5 minutes)
#   - Costs reduce
*/