import 'dotenv/config';
import CustomClient from '../../clients/CustomClient';
import UserClient, { User } from '../../clients/UserClient';
import EmbeddingsClient from '../../clients/EmbeddingsClient';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import Role from '../../models/Role';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';
import { prompt } from '../../utils/input';

/*
 HOBBIES SEARCHER:
 Searches users by hobbies and provides their full info in JSON format:
 Input: In need to gather people that love to go to mountains
 Output:
    rock climbing: [{full user info JSON},...],
    hiking: [{full user info JSON},...],
    camping: [{full user info JSON},...]
*/

const SYSTEM_PROMPT = `You are a RAG-powered assistant that groups users by their hobbies.

## Flow:
Step 1: User will ask to search users by their hobbies etc.
Step 2: Will be performed search in the Vector store to find most relevant users.
Step 3: You will be provided with CONTEXT (most relevant users, there will be user ID and information about user), and 
        with USER QUESTION.
Step 4: You group by hobby users that have such hobby and return response according to Response Format

## Response Format:
{format_instructions}`;

const USER_PROMPT = `## CONTEXT:
{context}

## USER QUESTION: 
{query}`;

const GroupingResultSchema = z.object({
  hobby: z.string(),
  userIds: z.array(z.string()),
});

const GroupingResultsSchema = z.object({
  groupingResults: z.array(GroupingResultSchema),
});

type GroupingResults = z.infer<typeof GroupingResultsSchema>;

function formatUserDocument(user: User): string {
  return `User:\n id: ${user.id},\nAbout user: ${user.about_me}\n`;
}

class InputGrounder {
  vectorStore: Chroma | null = null;

  constructor(private embeddings: EmbeddingsClient, private llmClient: CustomClient, private userClient: UserClient) {}

  async initializeVectorStore(): Promise<void> {
    // Initialize vectorstore with all current users.
    console.log('🔍 Loading all users for initial vectorstore...');
    const users = await this.userClient.getAllUsers();
    const documents = users.map(user => ({
      id: String(user.id),
      pageContent: formatUserDocument(user),
      metadata: { userId: String(user.id) },
    }));
    const batches = [];
    const batchSize = 50;
    for (let i = 0; i < documents.length; i += batchSize) {
      batches.push(documents.slice(i, i + batchSize));
    }

    this.vectorStore = new Chroma(this.embeddings, {
      collectionName: 'users',
    });
    const tasks = [];
    for (const batch of batches) {
      tasks.push(this.vectorStore.addDocuments(batch));
    }
    await Promise.all(tasks);
    console.log(`✅ Vector store initialized with ${documents.length} users.`);
  }

  async updateVectorStore() {
    const users = await this.userClient.getAllUsers();
    const data = await this.vectorStore!.collection!.get();
    
    const usersInStore = new Set(
      data.metadatas?.map((metadata: any) => metadata?.userId).filter(Boolean) || []
    );
    const newUsers = users.filter(user => !usersInStore.has(user.id));
    
    // Find document IDs to delete (need ChromaDB document IDs, not user IDs)
    const userIdSet = new Set(users.map(u => String(u.id)));
    const docIdsToDelete = (data.ids || [])
      .map((docId: string | number, index: number) => {
        const metadata = data.metadatas?.[index];
        const userId = metadata?.userId ? String(metadata.userId) : null;
        // If user no longer exists, mark this document for deletion
        return userId && !userIdSet.has(userId) ? String(docId) : null;
      })
      .filter(Boolean) as string[];

    if (docIdsToDelete.length > 0) {
      await this.vectorStore!.delete({ ids: docIdsToDelete });
      console.log(`🗑️ Deleted ${docIdsToDelete.length} users from vector store.`);
    }

    if (newUsers.length === 0) {
      console.log('No new users to add to vector store.');
      return;
    }

    const newDocuments = newUsers.map(user => ({
      id: String(user.id),
      pageContent: formatUserDocument(user),
      metadata: { userId: String(user.id) },
    }));

    await this.vectorStore!.addDocuments(newDocuments);
    console.log(`✅ Vector store updated with ${newUsers.length} new users.`);
  }

  async retrieveContext(query: string, k = 10, score = 0.3): Promise<string> {
    // Retrieve context, with optional automatic vectorstore update.
    if (!this.vectorStore) {
      await this.initializeVectorStore();
    } else {
      await this.updateVectorStore();
    }

    console.log('🔍 Retrieving context from vector store...');
    const results = await this.vectorStore!.similaritySearch(query, k);
    console.log(`✅ Retrieved ${results.length} relevant users from vector store.`);

    const contextParts = [];
    for (const res of results) {
      contextParts.push(res.pageContent);
    }

    return contextParts.join('\n\n');
  }

  augmentProps(prompt: string, context: string): string {
    return USER_PROMPT
      .replace('{context}', context)
      .replace('{query}', prompt);
  }

  async generateAnswer(augmentedPrompt: string): Promise<GroupingResults> {
    const parser = StructuredOutputParser.fromZodSchema(GroupingResultsSchema);

    const messages = [
      { role: Role.System, content: SYSTEM_PROMPT.replace('{format_instructions}', parser.getFormatInstructions()) },
      { role: Role.User, content: augmentedPrompt },
    ];

    console.log('Completion messages:', messages);
    const completion = await this.llmClient.getCompletion(messages);

    
    const searchRequests = await parser.parse(completion.content as string);
    console.log('searchRequests:', searchRequests);

    return searchRequests;
  }
}

class OutputGrounder {
  constructor(private userClient: UserClient) {}

  async groundResponse(groupingResults: GroupingResults): Promise<void> {
    for (const group of groupingResults.groupingResults) {
      console.log(`🔍 Hobby: ${group.hobby}`);
      const users = await this.findUsers(group.userIds);
      console.log(`🔍 Users: `, users);
    }
  }

  private async findUsers(userIds: string[]): Promise<User[]> {
    const users: User[] = [];
    for (const userId of userIds) {
      const user = await this.userClient.getUserById(userId);
      if (user) {
        users.push(user);
      }
    }
    return users;
  }
}

async function main(): Promise<void> {
  const embeddingsClient = new EmbeddingsClient('text-embedding-3-small-1');
  const llmClient = new CustomClient('gpt-4o', { temperature: 0 });
  const userClient = new UserClient();

  const inputGrounder = new InputGrounder(embeddingsClient, llmClient, userClient);
  const outputGrounder = new OutputGrounder(userClient);

  await inputGrounder.initializeVectorStore();

  console.log('Query samples:');
  console.log(' - I need people who love to go to mountains');
  console.log(' - Find people who love to watch stars and night sky');
  console.log(' - I need people to go to fishing together');

  while (true) {
    const userQuestion = await prompt("Type your question or 'exit' to quit: ");
    if (userQuestion.toLowerCase() === 'exit') {
      console.log('Exiting the application.');
      break;
    }

    const context = await inputGrounder.retrieveContext(userQuestion);
    const augmentedPrompt = inputGrounder.augmentProps(userQuestion, context);
    const groupingResults = await inputGrounder.generateAnswer(augmentedPrompt);
    await outputGrounder.groundResponse(groupingResults);
  }
}

main();
