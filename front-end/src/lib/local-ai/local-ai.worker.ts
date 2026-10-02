/// <reference lib="webworker" />
/** Worker que hospeda a inferência on-device:
 *  - impl "webllm": @mlc-ai/web-llm (MLC, WebGPU) — tiers A/B
 *  - impl "onnx":   @huggingface/transformers (WebNN/WASM) — tier C
 *  Protocolo via postMessage; geração com streaming de tokens. */

export interface WorkerInitMessage {
  type: "init";
  impl: "webllm" | "onnx";
  /** webllm: id MLC | onnx: repoId HF ou slug de public/models/. */
  modelId: string;
  device: string;
  dtype: string;
  /** base self-hosted ("/models") quando os pesos estão em public/. */
  localBase: string | null;
  /** webllm self-hosted: arquivo .wasm dentro de <localBase>/<slug>/. */
  wasmLibFile: string | null;
  /** webllm self-hosted: slug local (modelId é o id MLC remoto). */
  localSlug: string | null;
}

export interface WorkerGenerateMessage {
  type: "generate";
  id: number;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  maxNewTokens: number;
}

export type WorkerInMessage =
  | WorkerInitMessage
  | WorkerGenerateMessage
  | { type: "dispose" };

export type WorkerOutMessage =
  | { type: "progress"; file: string; progress: number; loaded: number; total: number }
  | { type: "ready"; modelId: string }
  | { type: "token"; id: number; text: string }
  | { type: "done"; id: number; output: string }
  | { type: "error"; id?: number; message: string; fatal?: boolean };

const post = (msg: WorkerOutMessage) => (self as unknown as Worker).postMessage(msg);

interface MlcEngine {
  chat: {
    completions: {
      create: (req: {
        messages: { role: string; content: string }[];
        stream?: boolean;
        max_tokens?: number;
      }) => Promise<AsyncIterable<{ choices: { delta?: { content?: string } }[] }>>;
    };
  };
  unload?: () => Promise<void>;
}

type TextGen = (
  input: unknown,
  opts?: Record<string, unknown>,
) => Promise<{ generated_text?: unknown }[]>;

let mlcEngine: MlcEngine | null = null;
let onnxGenerator: TextGen | null = null;
let onnxTokenizer: unknown = null;

async function handleInit(msg: WorkerInitMessage) {
  if (msg.impl === "webllm") {
    const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
    const appConfig = msg.localBase
      ? {
          model_list: [
            {
              model: `${msg.localBase}/${msg.localSlug}/`,
              model_id: msg.modelId,
              model_lib: `${msg.localBase}/${msg.localSlug}/${msg.wasmLibFile}`,
            },
          ],
        }
      : undefined;
    mlcEngine = (await CreateMLCEngine(msg.modelId, {
      appConfig: appConfig as never,
      initProgressCallback: (report: { progress?: number; text?: string }) => {
        post({
          type: "progress",
          file: msg.localSlug ?? msg.modelId,
          progress: Math.round((report.progress ?? 0) * 100),
          loaded: 0,
          total: 0,
        });
      },
    } as never)) as unknown as MlcEngine;
    post({ type: "ready", modelId: msg.modelId });
    return;
  }

  const { pipeline, env } = await import("@huggingface/transformers");
  env.allowLocalModels = true;
  if (msg.localBase) {
    env.localModelPath = msg.localBase.endsWith("/") ? msg.localBase : `${msg.localBase}/`;
    env.allowRemoteModels = false;
  } else {
    env.allowRemoteModels = true;
  }
  const pipe = await pipeline("text-generation", msg.modelId, {
    device: msg.device as never,
    dtype: msg.dtype as never,
    progress_callback: (p: {
      status?: string;
      file?: string;
      progress?: number;
      loaded?: number;
      total?: number;
    }) => {
      if (p.status === "progress" || p.status === "download") {
        post({
          type: "progress",
          file: p.file ?? "",
          progress: p.progress ?? 0,
          loaded: p.loaded ?? 0,
          total: p.total ?? 0,
        });
      }
    },
  } as never);
  onnxGenerator = pipe as unknown as TextGen;
  onnxTokenizer = (pipe as unknown as { tokenizer: unknown }).tokenizer;
  post({ type: "ready", modelId: msg.modelId });
}

async function handleGenerate(msg: WorkerGenerateMessage) {
  if (mlcEngine) {
    try {
      const chunks = await mlcEngine.chat.completions.create({
        messages: msg.messages,
        stream: true,
        max_tokens: msg.maxNewTokens,
      });
      let acc = "";
      for await (const chunk of chunks) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) {
          acc += text;
          post({ type: "token", id: msg.id, text });
        }
      }
      post({ type: "done", id: msg.id, output: acc });
    } catch (err) {
      post({
        type: "error",
        id: msg.id,
        message: err instanceof Error ? err.message : String(err),
      });
    }
    return;
  }

  if (!onnxGenerator) {
    post({ type: "error", id: msg.id, message: "modelo não carregado" });
    return;
  }
  const { TextStreamer } = await import("@huggingface/transformers");
  const streamer = new TextStreamer(onnxTokenizer as never, {
    skip_prompt: true,
    callback_function: (text: string) => post({ type: "token", id: msg.id, text }),
  });
  try {
    const out = await onnxGenerator(msg.messages, {
      max_new_tokens: msg.maxNewTokens,
      do_sample: false,
      streamer,
      return_full_text: false,
    } as Record<string, unknown>);
    const generated = out?.[0]?.generated_text;
    const output = Array.isArray(generated)
      ? String((generated[generated.length - 1] as { content?: string })?.content ?? "")
      : String(generated ?? "");
    post({ type: "done", id: msg.id, output });
  } catch (err) {
    post({
      type: "error",
      id: msg.id,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

self.onmessage = (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data;
  if (msg.type === "init") {
    handleInit(msg).catch((err) =>
      post({
        type: "error",
        message: err instanceof Error ? err.message : String(err),
        fatal: true,
      }),
    );
  } else if (msg.type === "generate") {
    void handleGenerate(msg);
  } else if (msg.type === "dispose") {
    void mlcEngine?.unload?.();
    mlcEngine = null;
    onnxGenerator = null;
    onnxTokenizer = null;
  }
};
