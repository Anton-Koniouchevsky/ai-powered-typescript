import { BaseTool } from '../base';
import { UserClient } from './user-client';

export class UpdateUserTool extends BaseTool {
  constructor(private userClient: UserClient) {
    super();
  }

  get name(): string {
    return 'update_user';
  }

  get description(): string {
    return 'Update an existing user';
  }

  get inputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'User ID',
        },
        name: {
          type: 'string',
          description: 'User name',
        },
        email: {
          type: 'string',
          description: 'User email address',
        },
      },
      required: ['id'],
    };
  }

  async execute(arguments_: Record<string, any>): Promise<string> {
    const { id, ...userData } = arguments_;
    
    if (!id) {
      throw new Error('User ID is required');
    }

    const user = await this.userClient.updateUser(id, userData);
    
    if (!user) {
      return JSON.stringify({ error: 'User not found' });
    }

    return JSON.stringify(user);
  }
}
