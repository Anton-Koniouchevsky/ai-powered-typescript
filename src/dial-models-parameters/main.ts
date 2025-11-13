import 'dotenv/config';
import CustomClient, { ClientOptions } from "../clients/CustomClient";
import Conversation from "../models/Conversation";
import Role from "../models/Role";
import { prompt } from '../utils/input';

async function run(deploymentName: string, options?: ClientOptions): Promise<void> {
  const client = new CustomClient(deploymentName, options);
  const conversation = new Conversation();
  conversation.addMessage({ role: Role.System, content: process.env.DEFAULT_SYSTEM_PROMPT || "" });
  
  while (true) {
    const userPrompt = await prompt("Type your question or 'exit' to quit: ");
    if (userPrompt.toLowerCase() === 'exit') {
      console.log('Exiting the application.');
      break;
    }

    conversation.addMessage({ role: Role.User, content: userPrompt });
    
    const response = await client.getCompletion(conversation.getMessages());
    conversation.addMessage(response);
    console.log(`AI: ${response.content}`);
  }
}

export default run;
