import { BaseUserServiceTool } from './base';

export class GetUserByIdTool extends BaseUserServiceTool {
    get name(): string {
        return "get_user_by_id";
    }

    get description(): string {
        return "Provides full user information";
    }

    get inputSchema(): Record<string, any> {
        return {
            type: "object",
            properties: {
                id: {
                    type: "number",
                    description: "User ID"
                }
            },
            required: ["id"]
        };
    }

    async execute({ id }: { id: string }): Promise<string> {
        try {
            const result = await this.userClient.getUserById(id);
            return `User information: ` + JSON.stringify(result);
        } catch (error: any) {
            return `Error while retrieving user by id: ${error.message}`;
        }
    }
}
