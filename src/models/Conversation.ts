import { randomUUID } from "crypto";
import Message from "./Message";

class Conversation {
  id: string;
  messages: Message[];

  constructor(id: string = randomUUID()) {
    this.id = id;
    this.messages = [];
  }

  addMessage(message: Message): void {
    this.messages.push(message);
  }

  getMessages(): Message[] {
    return this.messages;
  }
}

export default Conversation;