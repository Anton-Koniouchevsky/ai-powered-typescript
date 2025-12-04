import { User } from '../../../clients/UserClient';
import { BaseUserServiceTool } from './base';
import { UserUpdateSchema } from './models/userInfo';

export class UpdateUserTool extends BaseUserServiceTool {
    get name(): string {
        return "update_user";
    }

    get description(): string {
        return "Updates user info";
    }

    get inputSchema(): Record<string, any> {
        return {
            type: "object",
            properties: {
                id: {
                    type: "number",
                    description: "User ID that should be updated."
                },
                new_info: UserUpdateSchema
            },
            required: ["id"]
        };
    }

    async execute(user: User): Promise<string> {
        try {
            const userId = user.id;
            const response = await this.userClient.updateUser(userId, user);
            return `User successfully updated: ` + JSON.stringify(response);
        } catch (error: any) {
            return `Error while updating user: ${error.message}`;
        }
    }
}
