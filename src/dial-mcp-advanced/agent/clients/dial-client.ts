import { AzureOpenAI } from 'openai';
import { MCPClient } from './mcp-client';
import { CustomMCPClient } from './custom-mcp-client';
import Message from '../../../models/Message';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
import Role from '../../../models/Role';

interface ToolDelta {
  index: number;
  id?: string;
  type?: string;
  function: {
    name?: string;
    arguments?: string;
  };
}

export class DialClient {
  private tools: any[];
  private toolNameClientMap: Map<string, MCPClient | CustomMCPClient>;
  private openai: AzureOpenAI;

  constructor(
    apiKey: string,
    endpoint: string,
    tools: any[],
    toolNameClientMap: Map<string, MCPClient | CustomMCPClient>
  ) {
    this.tools = tools;
    this.toolNameClientMap = toolNameClientMap;
    this.openai = new AzureOpenAI({
      apiKey,
      endpoint,
      apiVersion: '',
    });
  }

  private collectToolCalls(toolDeltas: ToolDelta[]): any[] {
    const toolDict: Record<number, any> = {};

    for (const delta of toolDeltas) {
      const idx = delta.index;
      
      if (!toolDict[idx]) {
        toolDict[idx] = {
          id: null,
          function: { arguments: '', name: null },
          type: null,
        };
      }

      if (delta.id) toolDict[idx].id = delta.id;
      if (delta.function.name) toolDict[idx].function.name = delta.function.name;
      if (delta.function.arguments) {
        toolDict[idx].function.arguments += delta.function.arguments;
      }
      if (delta.type) toolDict[idx].type = delta.type;
    }

    return Object.values(toolDict);
  }

  private async streamResponse(messages: Message[]): Promise<Message> {
    const stream = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages as Array<ChatCompletionMessageParam>,
      tools: this.tools,
      temperature: 0.0,
      stream: true,
    });

    let content = '';
    const toolDeltas: ToolDelta[] = [];

    process.stdout.write('🤖: ');

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        process.stdout.write(delta.content);
        content += delta.content;
      }

      if (delta?.tool_calls) {
        toolDeltas.push(...(delta.tool_calls as any));
      }
    }

    console.log();

    return {
      role: Role.Assistant,
      content,
      tool_calls: toolDeltas.length > 0 ? this.collectToolCalls(toolDeltas) : undefined,
    };
  }

  async getCompletion(messages: Message[]): Promise<Message> {
    const aiMessage = await this.streamResponse(messages);

    if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
      messages.push(aiMessage);
      await this.callTools(aiMessage, messages);
      return await this.getCompletion(messages);
    }

    return aiMessage;
  }

  private async callTools(aiMessage: Message, messages: Message[]): Promise<void> {
    if (!aiMessage.tool_calls) return;

    for (const toolCall of aiMessage.tool_calls) {
      const toolName = toolCall.function.name;
      const toolArgs = JSON.parse(toolCall.function.arguments);

      try {
        const client = this.toolNameClientMap.get(toolName);
        if (!client) {
          throw new Error(`Unable to call ${toolName}. MCP client not found.`);
        }

        const toolResult = await client.callTool(toolName, toolArgs);

        messages.push({
          role: Role.Tool,
          content: String(toolResult),
          tool_call_id: toolCall.id,
        });
      } catch (error: any) {
        const errorMsg = `Error: ${error.message || error}`;
        console.log(`Error: ${errorMsg}`);
        messages.push({
          role: Role.Tool,
          content: errorMsg,
          tool_call_id: toolCall.id,
        });
      }
    }
  }
}
