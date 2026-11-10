import { randomUUID } from "node:crypto";
import type { Message } from "./tools.ts";

export class ChatStore {
  private readonly messages: Message[] = [];

  list() {
    return this.messages;
  }

  //#region send-message
  send(input: Omit<Message, "id">): Message[] {
    throw new Error("Implement send in the Build an app tutorial.");
  }
  //#endregion send-message
}
