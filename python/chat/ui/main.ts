import { App, ToolCallError, createApps, exposeTools } from "#holon-ui";
import type { Resources } from "#holon-ui";
import "./styles.css";

type Snapshot = Resources["tutorial-chat"]["chat://messages"];
const form = document.querySelector<HTMLFormElement>("#send")!;
const send = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
const message = document.querySelector<HTMLInputElement>("#message")!;
const author = document.querySelector<HTMLInputElement>("#author")!;
const status = document.querySelector<HTMLElement>("#status")!;
const list = document.querySelector<HTMLUListElement>("#messages")!;
const empty = document.querySelector<HTMLElement>("#empty")!;
const view =
  import.meta.env.MODE === "mcp"
    ? new App({ name: "chat", version: "1.0.0" })
    : undefined;
const direct = createApps({
  "tutorial-chat": { endpoint: `${location.origin}/mcp/chat` },
})["tutorial-chat"];
const chat = view ?? direct;
const messages = chat.resources["chat://messages"];

function render({ messages, viewer }: Snapshot) {
  const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
  list.replaceChildren();
  for (const message of messages) {
    const row = document.createElement("li");
    row.classList.toggle(
      "outgoing",
      !!viewer &&
        message.author.issuer === viewer.issuer &&
        message.author.subject === viewer.subject,
    );
    const name = document.createElement("strong");
    name.textContent =
      message.author.name ?? message.author.subject ?? "Anonymous";
    const text = document.createElement("p");
    text.textContent = message.text;
    row.append(name, text);
    list.append(row);
  }
  if (atBottom) list.scrollTop = list.scrollHeight;
  empty.hidden = messages.length !== 0;
}

function describe(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    (("name" in error && error.name === "InsufficientScopeError") ||
      ("status" in error && error.status === 403))
  )
    return "You don't have permission to send messages.";
  if (error instanceof ToolCallError && error.text) return error.text;
  return error instanceof Error ? error.message : String(error);
}

const show = (error: unknown) => (status.textContent = describe(error));

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  send.disabled = true;
  status.textContent = "";
  try {
    await chat.tools.send_message({
      author: { name: author.value },
      text: message.value,
    });
    message.value = "";
    message.focus();
    render(await messages.read());
  } catch (error) {
    show(error);
  } finally {
    send.disabled = false;
  }
});

if (view) {
  document.documentElement.classList.add("mcp-app");
  view.ontoolresult = () => void messages.read().then(render, show);
  view.onhostcontextchanged = (context) => {
    if (context.theme)
      document.documentElement.style.colorScheme = context.theme;
  };
  view.onteardown = () => ({});
  await view.connect();
  await messages.read().then(render, show);
} else {
  void messages.watch(render).catch(show);
  await exposeTools(direct).catch((error) =>
    console.warn("WebMCP registration failed.", error),
  );
}
