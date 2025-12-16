import { BaseTool } from '../base';
import { UserClient } from './user-client';

export class GetUserByIdTool extends BaseTool {
  constructor(private userClient: UserClient) {
    super();
  }

  get name(): string {
    return 'get_user_by_id';
  }

  get description(): string {
    return 'Get a user by their ID';
  }

  get inputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The user ID',
        },
      },
      required: ['id'],
    };
  }

  async execute(arguments_: Record<string, any>): Promise<string> {
    const { id } = arguments_;
    
    if (!id) {
      throw new Error('User ID is required');
    }

    const user = await this.userClient.getUserById(id);
    
    if (!user) {
      return JSON.stringify({ error: 'User not found' });
    }

    return JSON.stringify(user);
  }
}
