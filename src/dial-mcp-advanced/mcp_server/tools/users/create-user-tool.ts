import { BaseTool } from '../base';
import { UserClient } from './user-client';

export class CreateUserTool extends BaseTool {
  constructor(private userClient: UserClient) {
    super();
  }

  get name(): string {
    return 'create_user';
  }

  get description(): string {
    return 'Create a new user';
  }

  get inputSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'User name',
        },
        email: {
          type: 'string',
          description: 'User email address',
        },
      },
      required: ['name', 'email'],
    };
  }

  async execute(arguments_: Record<string, any>): Promise<string> {
    const { name, email, ...rest } = arguments_;
    
    if (!name || !email) {
      throw new Error('Name and email are required');
    }

    const user = await this.userClient.createUser({ name, email, ...rest });
    return JSON.stringify(user);
  }
}
