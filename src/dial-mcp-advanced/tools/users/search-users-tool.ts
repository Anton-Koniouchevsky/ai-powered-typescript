import { BaseTool } from '../base';
import { UserClient } from './user-client';

export class SearchUsersTool extends BaseTool {
  constructor(private userClient: UserClient) {
    super();
  }

  get name(): string {
    return 'search_users';
  }

  get description(): string {
    return 'Search for users based on query parameters';
  }

  get inputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Search by name (partial match)',
        },
        email: {
          type: 'string',
          description: 'Search by email (partial match)',
        },
      },
    };
  }

  async execute(arguments_: Record<string, any>): Promise<string> {
    const users = await this.userClient.searchUsers(arguments_);
    return JSON.stringify(users);
  }
}
