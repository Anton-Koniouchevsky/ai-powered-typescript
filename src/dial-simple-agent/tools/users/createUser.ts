import { User } from '../../../clients/UserClient';
import { BaseUserServiceTool } from './base';
import { UserCreateSchema } from './models/userInfo';

export class CreateUserTool extends BaseUserServiceTool {
    get name(): string {
        return "add_user";
    }

    get description(): string {
        return "Adds new user";
    }

    get inputSchema(): Record<string, any> {
        return UserCreateSchema;
    }

    async execute(user: Omit<User, 'id'>): Promise<string> {
        try {
            const result = await this.userClient.addUser(user);
            return `User successfully added: ` + JSON.stringify(result);
        } catch (error: any) {
            return `Error while creating a new user: ${error.message}`;
        }
    }
}
