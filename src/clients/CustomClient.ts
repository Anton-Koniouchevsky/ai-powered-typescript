import { BaseTool } from "../dial-simple-agent/tools/base";
import Message from "../models/Message";
import Role from "../models/Role";

interface Choice {
  message: {
    content: string;
    custom_content?: {
      attachments: Array<{
        type: string;
        url: string;
      }>;
    };
    tool_calls?: any;
  };
  delta: {
    content: string;
  };
  finish_reason: string;
}

interface ClientData {
  choices: Choice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ClientOptions {
  temperature?: number;
  n?: number;
  seed?: number;
  max_tokens?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
  custom_fields?: {
    configuration?: {
      size?: '1024x1024' | '1024x1792' | '792x1024',
      style?: 'vivid' | 'natural',
      quality?: 'standard' | 'hd'
    }
  }
}

class CustomClient {
  private endpoint: string;
  private apiKey: string;
  private options: ClientOptions;
  private tools: BaseTool[];
  private toolSchemas: object[];

  constructor(modelName: string, options: ClientOptions = {}, tools: BaseTool[] = []) {
    this.endpoint = `${process.env.DIAL_ENDPOINT}/openai/deployments/${modelName}/chat/completions`;
    this.apiKey = process.env.DIAL_API_KEY ?? "";
    this.options = options;
    this.tools = tools;
    this.toolSchemas = tools.map(tool => tool.schema);
  }

  async getCompletion(messages: Message[]): Promise<Message> {
    const headers = {
      "Content-Type": "application/json",
      "api-key": this.apiKey,
    };

    const requestData = {
      messages,
      tools: this.toolSchemas,
      ...this.options,
    };

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      console.log(response);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const { choices, usage } = await response.json() as ClientData;

    if (choices && choices.length > 0) {
      if (choices.length > 1) {
        const combinedContent = choices.map(choice => choice.message.content).join('\n---\n');
        return { role: Role.Assistant, content: combinedContent };
      }

      const choice = choices[0]!;

      if (choice.finish_reason === 'tool_calls') {
        const toolMessages = await this.processToolCall(choice.message.tool_calls);

        return this.getCompletion([
          ...messages,
          { 
            role: Role.Assistant, 
            content: choice.message.content || '',
            tool_calls: choice.message.tool_calls
          },
          ...toolMessages,
        ]);
      }

      const content = choice.message.content;
      const custom_content = choice.message.custom_content;

      return { role: Role.Assistant, content, custom_content, metadata: { ...usage } };
    }
    
    throw new Error("No choices returned from API");
  }

  private async processToolCall(tool_calls: any): Promise<Message[]> {
    const toolMessages = [];

    for (const call of tool_calls) {
      const toolCallId = call.id;
      const toolFunction = call.function;
      const toolName = toolFunction.name;
      const toolArgs = JSON.parse(toolFunction.arguments);

      const toolExecutionResult = await this.callTool(toolName, toolArgs);

      toolMessages.push({
        role: Role.Tool,
        name: toolName,
        tool_call_id: toolCallId,
        content: toolExecutionResult,
      });
    }

    return toolMessages
  }

  private async callTool(toolName: string, toolArgs: object): Promise<string> {
    const tool = this.tools?.find(t => t.name === toolName);

    if (tool) {
      const result = await tool.execute(toolArgs);
      return result;
    }

    return `Tool ${toolName} not found.`;
  }

  async streamCompletion(messages: Message[]): Promise<Message> {
    const contentChunks = await this.stream(messages);

    return { role: Role.Assistant, content: contentChunks.join('') };
  }

  async stream(messages: Message[]): Promise<string[]> {
    const headers = {
      "Content-Type": "application/json",
      "api-key": this.apiKey,
    };

    const requestData = {
      stream: true,
      messages
    };

    const contentChunks: string[] = [];

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (response.status === 200 && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const lineStr = line.trim();
          
          if (lineStr.startsWith('data: ')) {
            const data = lineStr.substring(6).trim();
            
            if (data === '[DONE]') {
              break;
            }

            const contentSnippet = this.getContentSnippet(data);
            if (contentSnippet) {
              contentChunks.push(contentSnippet);
            }
          }
        }
      }
    } else {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return contentChunks;
  }

  private getContentSnippet(data: string): string {
    try {
      const parsedData = JSON.parse(data);
      const choices = parsedData.choices;
      
      if (choices && choices.length > 0) {
        const delta = choices[0].delta;
        return delta?.content || '';
      }
      
      return '';
    } catch {
      return '';
    }
  }
}

export default CustomClient;