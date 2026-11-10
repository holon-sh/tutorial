import { App, ToolCallError, createApps, exposeTools } from "#holon-ui";
import type { Resources } from "#holon-ui";
import "./styles.css";

type Snapshot = Resources["tutorial-chat"]["chat://messages"];
const form = document.querySelector<HTMLFormElement>("#send")!;
const message = document.querySelector<HTMLInputElement>("#message")!;
const author = document.querySelector<HTMLInputElement>("#author")!;
const status = document.querySelector<HTMLElement>("#status")!;
const readStatus = document.querySelector<HTMLElement>("#read-status")!;
const refresh = document.querySelector<HTMLButtonElement>("#refresh")!;
const list = document.querySelector<HTMLUListElement>("#messages")!;
const empty = document.querySelector<HTMLElement>("#empty")!;
const readDenied = "You don't have permission to read messages.";
const view =
  import.meta.env.MODE === "mcp"
    ? new App({ name: "chat", version: "1.0.0" })
    : undefined;
const direct = createApps({
  "tutorial-chat": { endpoint: `${location.origin}/mcp/chat` },
})["tutorial-chat"];
const chat = view ?? direct;
const read = () => chat.resources["chat://messages"].read();

function render({ messages, viewer }: Snapshot) {
  readStatus.textContent = "";
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

const isPermissionDenied = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  (("name" in error && error.name === "InsufficientScopeError") ||
    ("status" in error && error.status === 403));

const describe = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

async function call(denied: string, run: () => Promise<unknown>) {
  try {
    await run();
    render(await read());
  } catch (error) {
    if (isPermissionDenied(error)) throw new Error(denied);
    if (error instanceof ToolCallError && error.text)
      throw new Error(error.text);
    throw error;
  }
}

const listMessages = () =>
  call(readDenied, () => chat.tools.list_messages({}));

async function action(
  control: HTMLButtonElement,
  run: () => Promise<unknown>,
  output = status,
) {
  control.disabled = true;
  output.textContent = "";
  try {
    await run();
    return true;
  } catch (error) {
    output.textContent = describe(error);
    return false;
  } finally {
    control.disabled = false;
  }
}

function clearMessages() {
  list.replaceChildren();
  empty.hidden = true;
}

let live: AbortController | undefined;

function startLive() {
  live?.abort();
  live = new AbortController();
  void chat.resources["chat://messages"]
    .watch(render, { signal: live.signal })
    .catch((error) => {
      readStatus.textContent = isPermissionDenied(error)
        ? readDenied
        : describe(error);
      if (isPermissionDenied(error)) clearMessages();
    });
}

refresh.addEventListener("click", () => {
  live?.abort();
  void action(
    refresh,
    async () => {
      clearMessages();
      await listMessages();
    },
    readStatus,
  ).then(() => {
    if (!view) startLive();
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (
    await action(
      form.querySelector<HTMLButtonElement>('button[type="submit"]')!,
      () =>
        call("You don't have permission to send messages.", () =>
          chat.tools.send_message({
            author: { name: author.value },
            text: message.value,
          }),
        ),
    )
  ) {
    message.value = "";
    message.focus();
  }
});

if (view) {
  document.documentElement.classList.add("mcp-app");
  view.ontoolresult = () => {
    void read()
      .then(render)
      .catch((error) => (status.textContent = describe(error)));
  };
  view.onhostcontextchanged = (context) => {
    if (context.theme)
      document.documentElement.style.colorScheme = context.theme;
  };
  view.onteardown = () => ({});
  await view.connect();
  await listMessages().catch((error) => {
    readStatus.textContent = describe(error);
    clearMessages();
  });
} else {
  startLive();
  await exposeTools(direct).catch((error) =>
    console.warn("WebMCP registration failed.", error),
  );
}
