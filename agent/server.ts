import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { generate } from "./local-model.ts";

function createServer() {
  const server = new McpServer({
    name: "io.github.holon-sh/tutorial-agent",
    version: "1.0.0",
  });
  server.registerTool(
    "run",
    {
      description: "Ask the agent a question or give it a text task.",
      inputSchema: z.strictObject({ input: z.string() }),
      outputSchema: z.object({ finalOutput: z.string() }),
    },
    async ({ input }, ctx) => {
      const signal = AbortSignal.any([
        ctx.mcpReq.signal,
        AbortSignal.timeout(240_000),
      ]);
      const finalOutput = await generate(input, signal);
      return {
        content: [{ type: "text" as const, text: finalOutput }],
        structuredContent: { finalOutput },
      };
    },
  );
  return server;
}
export default createMcpHandler(createServer, { legacy: "reject" });
