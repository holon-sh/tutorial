import { z } from "zod";

const authorSchema = z.object({
  name: z.string().optional(),
  issuer: z.string().optional(),
  subject: z.string().optional(),
});
export const viewerSchema = z.object({
  name: z.string().optional(),
  issuer: z.string(),
  subject: z.string(),
});
export type Viewer = z.infer<typeof viewerSchema>;

const messageSchema = z.object({
  id: z.string(),
  author: authorSchema,
  text: z.string(),
});
export type Message = z.infer<typeof messageSchema>;
export const snapshotSchema = z.object({
  messages: z.array(messageSchema),
  viewer: viewerSchema.optional(),
});

export const messagesUri = "chat://messages";
export const messagesResource = {
  mimeType: "application/json",
  _meta: { "sh.holon/outputSchema": z.toJSONSchema(snapshotSchema) },
};

export const tools = {
  list_messages: {
    description: "Read the shared conversation and open its interactive view.",
    inputSchema: z.strictObject({}),
    outputSchema: snapshotSchema,
    annotations: { readOnlyHint: true },
  },
  send_message: {
    description:
      "Send a message to the shared conversation. The author is a display name, not a verified identity.",
    inputSchema: z.strictObject({
      author: z.strictObject({ name: z.string() }),
      text: z.string(),
    }),
    outputSchema: snapshotSchema,
    annotations: { destructiveHint: false },
  },
};

export function result(messages: Message[], viewer?: Viewer) {
  return {
    content: [
      {
        type: "text" as const,
        text: messages.length
          ? messages.map(({ author, text }) => `${author.name ?? author.subject ?? "Anonymous"}: ${text}`).join("\n")
          : "No messages yet.",
      },
    ],
    structuredContent: { messages, viewer },
  };
}
