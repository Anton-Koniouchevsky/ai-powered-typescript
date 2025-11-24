import 'dotenv/config';
import CustomClient from "../clients/CustomClient";
import EmbeddingsClient from "../clients/EmbeddingsClient";
import { prompt } from "../utils/input";
import TextProcessor, { SearchMode } from "./TextProcessor";
import Conversation from "../models/Conversation";
import Role from "../models/Role";


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
{question}`;

const embeddings = new EmbeddingsClient('text-embedding-3-small-1');
const completionClient = new CustomClient('gpt-4o', { temperature: 0.0 });

const textProcessor = new TextProcessor(embeddings, {
  host: 'localhost',
  port: 5433,
  database: 'vectordb',
  user: 'postgres',
  password: 'postgres',
});

async function main(): Promise<void> {
  console.log("🎯 Microwave RAG Assistant");
  console.log("=========================\n");

  const loadContext = await prompt("Do you want to load context to VectorDB? (y/n): ");
  if (loadContext.toLowerCase() === 'y') {
    await textProcessor.processTextFile(
      'microwave_manual.txt',
      400,
      40,
      1536
    );
  }

  const conversation = new Conversation();
  conversation.addMessage({ role: Role.System, content: SYSTEM_PROMPT });


  while (true) {
    const userQuestion = (await prompt("Type your question or 'exit' to quit: ")).trim();
    if (userQuestion.toLowerCase() === 'exit') {
      console.log('Exiting the application.');
      break;
    }

    console.log(`${"=".repeat(100)}\n🔍 STEP 1: RETRIEVAL\n${"-".repeat(100)}`);
    const context = await textProcessor.search(SearchMode.EUCLIDEAN_DISTANCE, userQuestion, 5, 0.01, 1536);

    console.log(`\n🔗 STEP 2: AUGMENTATION\n${"-".repeat(100)}`);
    const augmentedPrompt = USER_PROMPT.replace("{context}", context.join("\n\n")).replace("{question}", userQuestion);
    conversation.addMessage({ role: Role.User, content: augmentedPrompt });
    
    console.log(`\n🤖 STEP 3: GENERATION\n${"-".repeat(100)}`);
    const answer = await completionClient.getCompletion(conversation.getMessages());
              
    console.log(`\n📝 RESPONSE:\n${answer.content}`);

    conversation.addMessage({ role: Role.Assistant, content: answer.content });
  }
}

main();
