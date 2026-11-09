from uuid import uuid4

from mcp.server.mcpserver.exceptions import ToolError

from tools import Message, NewMessage


class ChatStore:
    def __init__(self) -> None:
        self.messages: list[Message] = []

    # region send-message
    def send(self, message: NewMessage) -> list[Message]:
        self.messages.append({"id": str(uuid4()), **message})
        return self.messages
    # endregion send-message
