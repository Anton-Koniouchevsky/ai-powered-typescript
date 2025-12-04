import { BaseTool } from '../base';
import UserClient from '../../../clients/UserClient';

export abstract class BaseUserServiceTool extends BaseTool {
    protected userClient: UserClient;

    constructor(userClient: UserClient) {
        super();
        this.userClient = userClient;
    }
}
