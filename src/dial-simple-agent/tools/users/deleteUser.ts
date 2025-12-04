import { BaseUserServiceTool } from './base';

export class DeleteUserTool extends BaseUserServiceTool {
    get name(): string {
        return "delete_users";
    }

    get description(): string {
        return "Deletes user from the system";
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
            const result = await this.userClient.deleteUser(id);
            return `User successfully deleted: ` + JSON.stringify(result);
        } catch (error: any) {
            return `Error while deleting user by id: ${error.message}`;
        }
    }
}
