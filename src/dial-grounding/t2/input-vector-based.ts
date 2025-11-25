import 'dotenv/config';
import CustomClient from '../../clients/CustomClient';
import UserClient, { User } from '../../clients/UserClient';
import Role from '../../models/Role';
import { prompt } from '../../utils/input';
import EmbeddingsClient from '../../clients/EmbeddingsClient';
import { formatUsers } from '../../utils/user-formatter';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { existsSync } from 'fs';

const SYSTEM_PROMPT = `You are a RAG-powered assistant that assists users with their questions about user information.
            
## Structure of User message:
'RAG CONTEXT' - Retrieved documents relevant to the query.
'USER QUESTION' - The user's actual question.

## Instructions:
- Use information from 'RAG CONTEXT' as context when answering the 'USER QUESTION'.
- Cite specific sources when using information from the context.
- Answer ONLY based on conversation history and RAG context.
- If no relevant information exists in 'RAG CONTEXT' or conversation history, state that you cannot answer the question.`;

const USER_PROMPT = `##RAG CONTEXT:
{context}

##USER QUESTION: 
{query}`;

class UserRAG {
  private vectorStore: FaissStore | undefined;

  constructor(
    private userClient: UserClient,
    private llmClient: CustomClient,
    private embeddings: EmbeddingsClient
  ) {}

  async initUserRAG() {
    if (existsSync('users_faiss_index')) {
      this.vectorStore = await FaissStore.load(
        'users_faiss_index',
        this.embeddings,
      );
      console.log("✅ Loaded existing FAISS index");
    } else {
      this.vectorStore = await this.setupVectorStore();
    }
  }

  async setupVectorStore(): Promise<FaissStore> {
    const documents = await this.loadUserDocuments();

    const batches = [];
    const batchSize = 100;
    for (let i = 0; i < documents.length; i += batchSize) {
      batches.push(documents.slice(i, i + batchSize));
    }

    let vectorStore: FaissStore | undefined = undefined;

    for (const batch of batches) {
      if (vectorStore) {
        await vectorStore.addDocuments(batch);
      } else {
        vectorStore = await FaissStore.fromDocuments(batch, this.embeddings);
      }
    }

    vectorStore!.save("users_faiss_index");
    return vectorStore as FaissStore;
  }

  async loadUserDocuments(): Promise<Array<{
    id: string;
    pageContent: string,
    metadata: { [key: string]: any }
  }>> {
    await this.userClient.health();
    const users: User[] = await this.userClient.getAllUsers();

    return users.map(user => ({
      id: user.id,
      pageContent: formatUsers([user]),
      metadata: { userId: user.id }
    }));
  }

  async retrieveContext(query: string, k = 4, scoreThreshold = 0.1) {
    console.log('Retrieving context...');

    const embeddedQuery = await this.embeddings.embedQuery(query);
    const relevantDocs = await this.vectorStore!.similaritySearchVectorWithScore(
      embeddedQuery,
      k
    );

    const contextParts = [];
    for (const [doc, scoreValue] of relevantDocs) {
      if (scoreValue >= scoreThreshold) {
        contextParts.push(doc.pageContent);
        console.log(` - Included doc: ${doc.pageContent} with score: ${scoreValue}`);
      }
    }

    return contextParts.join('\n\n');
  }

  augmentPrompt(query: string, context: string): string {
    return USER_PROMPT
      .replace('{context}', context)
      .replace('{query}', query);
  }

  async generateAnswer(augmentedPrompt: string): Promise<string> {
    console.log('Generating answer from LLM...');
    const messages = [
        { role: Role.System, content: SYSTEM_PROMPT },
        { role: Role.User, content: augmentedPrompt }
    ];

    const response = await this.llmClient.getCompletion(messages);
    return response.content as string;
  }
}


async function main(): Promise<void> {
  console.log("🔄 Initializing User Vector-based RAG System...");
  
  const userClient = new UserClient();
  const llmClient = new CustomClient('gpt-4o', { temperature: 0 });
  const embeddings = new EmbeddingsClient('text-embedding-3-small-1');

  const userRAG = new UserRAG(userClient, llmClient, embeddings);
  await userRAG.initUserRAG();

  console.log('Query samples:');
  console.log(' - I need user emails that filled with hiking and psychology');
  console.log(' - Who is John?');

  while (true) {
    const userQuestion = await prompt("Type your question or 'exit' to quit: ");
    if (userQuestion.toLowerCase() === 'exit') {
      console.log('Exiting the application.');
      break;
    }

    const trimmedQuestion = userQuestion.trim();
    const context = await userRAG.retrieveContext(trimmedQuestion);
    const augmentedPrompt = userRAG.augmentPrompt(trimmedQuestion, context);
    const answer = await userRAG.generateAnswer(augmentedPrompt);
              
    console.log(`\n📝 Final Answer:\n${answer}`);
  }
}

main();

/*
# The problems with Vector based Grounding approach are:
#   - In current solution we fetched all users once, prepared Vector store (Embed takes money) but we didn't play
#     around the point that new users added and deleted every 5 minutes. (Actually, it can be fixed, we can create once
#     Vector store and with new request we will fetch all the users, compare new and deleted with version in Vector
#     store and delete the data about deleted users and add new users).
#   - Limit with top_k (we can set up to 100, but what if the real number of similarity search 100+?)
#   - With some requests works not so perfectly. (Here we can play and add extra chain with LLM that will refactor the
#     user question in a way that will help for Vector search, but it is also not okay in the point that we have
#     changed original user question).
#   - Need to play with balance between top_k and score_threshold
# Benefits are:
#   - Similarity search by context
#   - Any input can be used for search
#   - Costs reduce
*/