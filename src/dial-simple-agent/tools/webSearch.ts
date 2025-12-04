import { BaseTool } from './base';

export class WebSearchTool extends BaseTool {
    private apiKey: string;
    private endpoint: string;

    constructor(apiKey: string, endpoint: string) {
        super();
        this.apiKey = apiKey;
        this.endpoint = `${endpoint}/openai/deployments/gemini-2.5-pro/chat/completions`;
    }

    get name(): string {
        return "web_search_tool";
    }

    get description(): string {
        return "Tool for WEB searching.";
    }

    get inputSchema(): Record<string, any> {
        return {
            type: "object",
            properties: {
                request: {
                    type: "string",
                    description: "The search query or question to search for on the web"
                }
            },
            required: ["request"]
        };
    }

    async execute(arguments_: Record<string, any>): Promise<string> {
        try {
            const response = await fetch(this.endpoint, {
                method: "POST",
                headers: {
                    "api-key": this.apiKey,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: "user",
                            content: String(arguments_.request)
                        }
                    ],
                    tools: [
                        {
                            type: "static_function",
                            static_function: {
                                name: "google_search",
                                description: "Grounding with Google Search",
                                configuration: {}
                            }
                        }
                    ],
                    temperature: 0
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                return `Error: ${response.status} ${errorText}`;
            }

            const data = await response.json() as any;
            
            if (data.error) {
                return data.error;
            }
            return data.choices[0].message.content;
        } catch (error: any) {
            return `Error: ${error.message}`;
        }
    }
}
