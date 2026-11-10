import { mkdir, access, rename } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const revision = "d97651fa7cbd9544383a7040b9b8964c69acff17";
const base = `https://huggingface.co/onnx-community/Supra-50M-Instruct-ONNX/resolve/${revision}/`;
for (const file of [
  "config.json",
  "generation_config.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "onnx/model_quantized.onnx",
]) {
  const target = new URL(`./node_modules/.cache/supra-50m/${file}`, import.meta.url);
  if (
    await access(target).then(
      () => true,
      () => false,
    )
  )
    continue;
  await mkdir(new URL(".", target), { recursive: true });
  const response = await fetch(new URL(file, file.startsWith("tokenizer") ? "https://huggingface.co/SupraLabs/Supra-50M-Instruct/resolve/b436d1b0a3181793f2ce99af0ca8ba4754766cf3/" : base));
  if (!response.ok || !response.body)
    throw new Error(`Download ${file}: ${response.status}`);
  const partial = new URL(`${target}.part`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(partial));
  await rename(partial, target);
}
