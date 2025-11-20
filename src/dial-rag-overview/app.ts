import 'dotenv/config';
import EmbeddingsClient from '../clients/EmbeddingsClient';
import CustomClient from '../clients/CustomClient';
import { existsSync } from 'fs';
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import Role from '../models/Role';
import { prompt } from '../utils/input';
import path from 'path';

const SYSTEM_PROMPT = `You are a RAG-powered assistant that assists users with their questions about microwave usage.
            
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

class MicrowaveRAG {
  private vectorStore: FaissStore | undefined;

  constructor(
    private llmClient: CustomClient,
    private embeddings: EmbeddingsClient,
  ) {}

  public async setupVectorStore(): Promise<void> {
    console.log("🔄 Initializing Microwave Manual RAG System...");

    if (existsSync('microwave_faiss_index')) {
        this.vectorStore = await FaissStore.load(
            'microwave_faiss_index',
            this.embeddings,
        );
        console.log("✅ Loaded existing FAISS index");
    } else {
        this.vectorStore = await this.createNewIndex();
        console.log("✅ RAG system initialized successfully!");
    }
  }

  private async createNewIndex(): Promise<FaissStore> {
    console.log("📖 Loading text document...");

    const fileName = 'microwave_manual.txt';
    const filePath = path.resolve(`assets/${fileName}`);
    const loader = new TextLoader(filePath);
    const documents = await loader.load();

    console.log("✂️ Splitting document into chunks...");
    const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 100, chunkOverlap: 50 });
    const chunks = await textSplitter.splitDocuments(documents);
    console.log(`✅ Created ${chunks.length} chunks`);

    console.log("🔍 Creating embeddings and FAISS index...");
    const vectorStore = await FaissStore.fromDocuments(chunks, this.embeddings);
    vectorStore.save("microwave_faiss_index");
    console.log("💾 Index saved for future use");

    return vectorStore;
  }

  public async retrieveContext(query: string, k = 4) {
    console.log(`${"=".repeat(100)}\n🔍 STEP 1: RETRIEVAL\n${"-".repeat(100)}`);
    console.log(`Query: '${query}'`);
    console.log(`Searching for top ${k} most relevant chunks:`);

    const relevantDocs = await this.vectorStore!.similaritySearchVectorWithScore(
      await this.embeddings.embedQuery(query),
      k
    );

    const contentParts = [];
    for (const [doc, scoreValue] of relevantDocs) {
      contentParts.push(doc.pageContent);
      console.log(`\n--- (Relevance Score: ${scoreValue.toFixed(3)}) ---`);
      console.log(`Content: ${doc.pageContent}`);
    }

    console.log("=".repeat(100));
    return contentParts.join("\n\n");
  }

  augmentPrompt(query: string, context: string): string {
    console.log(`\n🔗 STEP 2: AUGMENTATION\n${"-".repeat(100)}`);

    const augmentedPrompt = USER_PROMPT
      .replace("{context}", context)
      .replace("{query}", query);

    console.log(`${augmentedPrompt}\n${"=".repeat(100)}`);
    return augmentedPrompt;
  }

  async generateAnswer(augmentedPrompt: string): Promise<string> {
    console.log(`\n🤖 STEP 3: GENERATION\n${"-".repeat(100)}`);

    const messages = [
        { role: Role.System, content: SYSTEM_PROMPT },
        { role: Role.User, content: augmentedPrompt }
    ];

    const response = await this.llmClient.getCompletion(messages);

    console.log(`${response.content}\n${"=".repeat(100)}`);
    return response.content as string;
  }
}

async function main(rag: MicrowaveRAG): Promise<void> {
  console.log("🎯 Microwave RAG Assistant");

  await rag.setupVectorStore();

  while (true) {
    const userQuestion = await prompt("Type your question or 'exit' to quit: ");
    if (userQuestion.toLowerCase() === 'exit') {
      console.log('Exiting the application.');
      break;
    }

    const trimmedQuestion = userQuestion.trim();
    // Step 1: Retrieval
    const context = await rag.retrieveContext(trimmedQuestion);
    // Step 2: Augmentation
    const augmentedPrompt = rag.augmentPrompt(trimmedQuestion, context);
    // Step 3: Generation
    const answer = await rag.generateAnswer(augmentedPrompt);
              
    console.log(`\n📝 Final Answer:\n${answer}`);
  }
  
}

main(
  new MicrowaveRAG(
    new CustomClient('gpt-4o', { temperature: 0.0 }),
    new EmbeddingsClient('text-embedding-3-small-1'),
  )
);