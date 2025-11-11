import CustomClient from "./clients/CustomClient";
import Conversation from "./models/Conversation";
import inquirer from 'inquirer';
import { Command } from 'commander';
import dotenv from 'dotenv';
import Role from "./models/Role";

dotenv.config();

const program = new Command();

console.log('🤖 AI-Powered TypeScript CLI');
console.log('============================');

async function start(streaming: boolean): Promise<void> {
  const client = new CustomClient("gpt-4o");
  const conversation = new Conversation();
  
  const { systemPrompt } = await inquirer.prompt([
    {
      type: 'input',
      name: 'systemPrompt',
      message: 'Provide system prompt (press Enter to skip):',
      default: process.env.DEFAULT_SYSTEM_PROMPT || ''
    }
  ]);

  if (systemPrompt.trim()) {
    console.log(`✅ System prompt set: ${systemPrompt}`);
    conversation.addMessage({ role: Role.System, content: systemPrompt });
  }

  while (true) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '💬 Send a message', value: 'message' },
          { name: '🚪 Exit', value: 'exit' }
        ]
      }
    ]);

    switch (action) {
      case 'message':
        await handleMessage(client, conversation, streaming);
        break;
      case 'exit':
        console.log('👋 Goodbye!');
        process.exit(0);
    }
  }
}

async function handleMessage(client: CustomClient, conversation: Conversation, streaming: boolean): Promise<void> {
  const { message } = await inquirer.prompt([
    {
      type: 'input',
      name: 'message',
      message: 'Your message:',
      validate: (input) => input.trim() !== ''
    }
  ]);

  console.log('\n🤔 Thinking...\n');
  
  try {
    conversation.addMessage({ role: Role.User, content: message });
    let response;
    if (streaming) {
      response = await client.streamCompletion(conversation.getMessages());
    } else {
      response = await client.getCompletion(conversation.getMessages());
    }

    console.log(`\n🤖 AI: ${response.content}\n`);
    conversation.addMessage(response);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

program
  .name('ai-cli')
  .description('AI-Powered TypeScript CLI Application')
  .version('1.0.0')
  .action(start);

start(true);