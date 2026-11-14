import { ToolCallError, connect } from "#holon-ui";
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
const app = await connect();
const messages = app.resources["chat://messages"];

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
    await app.tools.send_message({
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

if (app.view) {
  app.view.addEventListener(
    "toolresult",
    () => void messages.read().then(render, show),
  );
  app.view.onhostcontextchanged = (context) => {
    if (context.theme)
      document.documentElement.style.colorScheme = context.theme;
  };
  app.view.onteardown = () => ({});
  await messages.read().then(render, show);
} else {
  void app.resources["chat://messages"].watch(render).catch(show);
}
