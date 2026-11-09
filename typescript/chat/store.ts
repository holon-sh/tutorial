import { randomUUID } from "node:crypto";
import type { Message } from "./tools.ts";

export class ChatStore {
  private readonly messages: Message[] = [];

  list() {
    return this.messages;
  }

  //#region send-message
  send(input: Omit<Message, "id">): Message[] {
    this.messages.push({ id: randomUUID(), ...input });
    return this.list();
  }
  //#endregion send-message
}
