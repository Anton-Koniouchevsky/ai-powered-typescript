import { User } from "../clients/UserClient";

function formatUsers(context: Array<User>): string {
  let contextString = '';
  for (const user of context) {
    contextString += 'User:\n';
    for(const [key, value] of Object.entries(user)) {
      contextString += `  ${key}: ${value}\n`;
    }
    contextString += '\n';
  }
  return contextString;
}

export { formatUsers };