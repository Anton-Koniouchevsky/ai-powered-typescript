export abstract class BaseTool {
  abstract get name(): string;
  abstract get description(): string;
  abstract get inputSchema(): Record<string, any>;

  abstract execute(arguments_: Record<string, any>): Promise<string>;

  toMCPTool(): Record<string, any> {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.inputSchema,
    };
  }
}
