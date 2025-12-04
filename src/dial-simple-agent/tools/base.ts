export abstract class BaseTool {
    abstract execute(arguments_: Record<string, any>): Promise<string> | string;
    abstract get name(): string;
    abstract get description(): string;
    abstract get inputSchema(): Record<string, any>;

    get schema(): Record<string, any> {
        return {
            type: "function",
            function: {
                name: this.name,
                description: this.description,
                parameters: this.inputSchema
            }
        };
    }
}
