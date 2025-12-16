import { UserInfo } from '../../models/user-info';

export class UserClient {
  private users: Map<string, UserInfo> = new Map();
  private currentId = 1;

  async getUserById(id: string): Promise<UserInfo | null> {
    return this.users.get(id) || null;
  }

  async searchUsers(query: Record<string, any>): Promise<UserInfo[]> {
    const users = Array.from(this.users.values());
    
    if (!query || Object.keys(query).length === 0) {
      return users;
    }

    return users.filter(user => {
      return Object.entries(query).every(([key, value]) => {
        const userValue = user[key];
        if (typeof userValue === 'string' && typeof value === 'string') {
          return userValue.toLowerCase().includes(value.toLowerCase());
        }
        return userValue === value;
      });
    });
  }

  async createUser(userData: Omit<UserInfo, 'id'>): Promise<UserInfo> {
    const id = (this.currentId++).toString();
    const user = { id, ...userData } as UserInfo;
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, userData: Partial<UserInfo>): Promise<UserInfo | null> {
    const user = this.users.get(id);
    if (!user) {
      return null;
    }
    const updatedUser = { ...user, ...userData, id };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }
}
