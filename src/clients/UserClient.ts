
export interface User {
  id: string;
  name: string;
  surname?: string;
  email?: string;
  gender?: string;
  [key: string]: any;
}

const headers = {
  'Content-Type': 'application/json'
};
  
class UserClient {
  async getAllUsers(): Promise<User[]> {
    const response = await fetch(`${process.env.USER_SERVICE_ENDPOINT}/v1/users`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as User[];
    console.log(`Get ${data.length} users successfully.`);
    return data;
  }

  async getUserById(userId: string): Promise<User> {
    const response = await fetch(`${process.env.USER_SERVICE_ENDPOINT}/v1/users/${userId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as User;
    console.log(`Get user ${userId} successfully.`);
    return data;
  }

  async searchUsers({name, surname, email, gender}: {name?: string, surname?: string, email?: string, gender?: string}): Promise<User[]> {
    const queryParams = new URLSearchParams();
    if (name) queryParams.append('name', name);
    if (surname) queryParams.append('surname', surname);
    if (email) queryParams.append('email', email);
    if (gender) queryParams.append('gender', gender);
    
    const response = await fetch(`${process.env.USER_SERVICE_ENDPOINT}/v1/users/search?${queryParams.toString()}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as User[];
    console.log(`Search users successfully. Found ${data.length} users.`);
    return data;
  }

  async addUser(user: Omit<User, 'id'>): Promise<User> {
    const response = await fetch(`${process.env.USER_SERVICE_ENDPOINT}/v1/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify(user),
    });

    if (!response.ok) {
      console.log(response);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as User;
    return data;
  }

  async updateUser(userId: string, user: Partial<User>): Promise<User> {
    const response = await fetch(`${process.env.USER_SERVICE_ENDPOINT}/v1/users/${userId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(user),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as User;
    return data;
  }

  async deleteUser(userId: string): Promise<void> {
    const response = await fetch(`${process.env.USER_SERVICE_ENDPOINT}/v1/users/${userId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return;
  }

  async health(): Promise<any> {
    const response = await fetch(`${process.env.USER_SERVICE_ENDPOINT}/health`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

export default UserClient;
