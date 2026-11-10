from typing import NotRequired, TypedDict

from mcp.types import CallToolResult, TextContent
from pydantic import BaseModel


class Author(TypedDict):
    name: NotRequired[str]
    issuer: NotRequired[str]
    subject: NotRequired[str]


class Viewer(TypedDict):
    name: NotRequired[str]
    issuer: str
    subject: str


class NewMessage(TypedDict):
    author: Author
    text: str


class Message(TypedDict):
    id: str
    author: Author
    text: str


class Snapshot(TypedDict):
    messages: list[Message]
    viewer: NotRequired[Viewer]


class AuthorName(BaseModel):
    model_config = {"extra": "forbid"}

    name: str


messages_uri = "chat://messages"


def author_label(author: Author) -> str:
    return author.get("name", author.get("subject", "Anonymous"))


def result(messages: list[Message], viewer: Viewer | None = None) -> CallToolResult:
    snapshot: dict[str, object] = {"messages": messages}
    if viewer is not None:
        snapshot["viewer"] = viewer
    return CallToolResult(
        content=[
            TextContent(
                type="text",
                text="\n".join(
                    f"{author_label(message['author'])}: {message['text']}"
                    for message in messages
                )
                if messages
                else "No messages yet.",
            )
        ],
        structured_content=snapshot,
    )
