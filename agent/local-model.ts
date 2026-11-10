import { fileURLToPath } from "node:url";

const load = async () => {
  const transformers = await import("@huggingface/transformers");
  transformers.env.allowRemoteModels = false;
  transformers.env.useFSCache = false;
  transformers.env.localModelPath = "";
  const generator = await transformers.pipeline(
    "text-generation",
    fileURLToPath(new URL("./node_modules/.cache/supra-50m/", import.meta.url)),
    {
      dtype: "q8",
      device: "cpu",
      local_files_only: true,
      session_options: {
        intraOpNumThreads: 1,
        interOpNumThreads: 1,
        enableCpuMemArena: false,
        enableMemPattern: false,
      },
    },
  );
  return { transformers, generator };
};
let model: ReturnType<typeof load> | undefined;

export async function generate(input: string, signal: AbortSignal) {
  signal.throwIfAborted();
  const { transformers, generator } = await (model ??= load());
  signal.throwIfAborted();
  const stop = new transformers.InterruptableStoppingCriteria();
  const criteria = new transformers.StoppingCriteriaList();
  criteria.push(stop);
  const interrupt = () => stop.interrupt();
  signal.addEventListener("abort", interrupt, { once: true });
  try {
    const options = {
      max_new_tokens: 192,
      do_sample: false,
      repetition_penalty: 1.15,
      stopping_criteria: criteria,
    };
    const prompt = `Below is an instruction that describes a task, paired with an input that provides further context. Write a response that appropriately completes the request.\n\n### Instruction:\nReply briefly and helpfully.\n\n### Input:\n${input}\n\n### Response:\n`;
    const inputTokens = generator.tokenizer.encode(prompt).length;
    if (inputTokens + options.max_new_tokens > 1024)
      throw new Error(
        "Supra context exceeded (1024 tokens). Shorten the instructions or input.",
      );
    const output = await generator(prompt, {
      ...options,
      return_full_text: false,
    });
    signal.throwIfAborted();
    const result = output[0];
    if (
      !result ||
      Array.isArray(result) ||
      typeof result.generated_text !== "string"
    )
      throw new Error("The local model returned no reply.");
    const text = result.generated_text.trim();
    if (!text) throw new Error("The local model returned no reply.");
    return text;
  } finally {
    signal.removeEventListener("abort", interrupt);
  }
}
