import { BaseTool } from '../base';
import { UserClient } from './user-client';

export class DeleteUserTool extends BaseTool {
  constructor(private userClient: UserClient) {
    super();
  }

  get name(): string {
    return 'delete_user';
  }

  get description(): string {
    return 'Delete a user by ID';
  }

  get inputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The user ID to delete',
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

    const deleted = await this.userClient.deleteUser(id);
    
    if (!deleted) {
      return JSON.stringify({ error: 'User not found' });
    }

    return JSON.stringify({ success: true, message: `User ${id} deleted` });
  }
}
