from pathlib import Path

from mcp.server.apps import APP_MIME_TYPE
from mcp.server.mcpserver import Context, MCPServer
from mcp.types import CallToolResult, ToolAnnotations
from pydantic import TypeAdapter

from store import ChatStore
from tools import AuthorName, Snapshot, messages_uri, result

frontend = Path(__file__).parent / "dist"
resource_uri = "ui://chat/app.html"
chat = ChatStore()

server = MCPServer("io.github.holon-sh/tutorial-chat", version="1.0.0")


@server.resource(
    messages_uri,
    name="Messages",
    mime_type="application/json",
    meta={"sh.holon/outputSchema": TypeAdapter(Snapshot).json_schema()},
)
def read_messages() -> Snapshot:
    return {"messages": chat.messages}


@server.tool(
    annotations=ToolAnnotations(read_only_hint=True),
    meta={"ui": {"resourceUri": resource_uri}},
)
def list_messages() -> CallToolResult:
    """Read the shared conversation and open its interactive view."""
    return result(chat.messages)


# region send-message-handler
@server.tool(
    annotations=ToolAnnotations(destructive_hint=False),
)
async def send_message(author: AuthorName, text: str, ctx: Context) -> CallToolResult:
    """Send a message to the shared conversation.

    The author is a display name, not a verified identity.
    """
    messages = chat.send({"author": {"name": author.name}, "text": text})
    await ctx.notify_resource_updated(messages_uri)
    return result(messages)


# endregion send-message-handler


@server.resource(
    resource_uri,
    name="Chat",
    mime_type=APP_MIME_TYPE,
)
def read_app() -> str:
    return (frontend / "index.html").read_text().replace("<html", "<html data-mcp-app", 1)
