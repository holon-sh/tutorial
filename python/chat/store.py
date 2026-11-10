from uuid import uuid4

from mcp.server.mcpserver.exceptions import ToolError

from tools import Message, NewMessage


class ChatStore:
    def __init__(self) -> None:
        self.messages: list[Message] = []

    # region send-message
    def send(self, message: NewMessage) -> list[Message]:
        raise ToolError("Implement send in the Build an app tutorial.")
    # endregion send-message
