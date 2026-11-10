import { readFile } from "node:fs/promises";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { ChatStore } from "./store.ts";
import { tools, result, messagesUri, messagesResource } from "./tools.ts";

export const frontend = new URL("./dist/web/", import.meta.url);
const resourceUri = "ui://chat/app.html";
const chat = new ChatStore();

export function createServer() {
  const server = new McpServer(
    { name: "io.github.holon-sh/tutorial-chat", version: "1.0.0" },
    { capabilities: { resources: { subscribe: true } } },
  );
  server.registerResource("Messages", messagesUri, messagesResource, () => ({
    contents: [
      {
        uri: messagesUri,
        mimeType: "application/json",
        text: JSON.stringify({ messages: chat.list() }),
      },
    ],
  }));
  server.registerTool(
    "list_messages",
    { ...tools.list_messages, _meta: { ui: { resourceUri } } },
    () => result(chat.list()),
  );
  //#region send-message-handler
  server.registerTool("send_message", tools.send_message, (input) => {
    const messages = chat.send(input);
    handler.notify.resourceUpdated(messagesUri);
    return result(messages);
  });
  //#endregion send-message-handler
  server.registerResource(
    "Chat",
    resourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => ({
      contents: [
        {
          uri: resourceUri,
          mimeType: RESOURCE_MIME_TYPE,
          text: await readFile(
            new URL("./dist/mcp/index.html", import.meta.url),
            "utf8",
          ),
        },
      ],
    }),
  );
  return server;
}

const handler = createMcpHandler(createServer, { legacy: "reject" });
export default handler;
