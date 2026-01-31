import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

export class LLMError extends Error {
  constructor(message, type, retryable = false) {
    super(message);
    this.name = "LLMError";
    this.type = type;
    this.retryable = retryable;
  }
}

function resolveApiKey(cliKey) {
  if (cliKey) return cliKey;
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;

  const configPath = path.join(process.cwd(), "llm-config.json");
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (config.apiKey) return config.apiKey;
  }

  throw new LLMError(
    "No API key found. Set ANTHROPIC_API_KEY environment variable or use --api-key flag",
    "auth",
    false
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class LLMClient {
  constructor(options = {}) {
    const apiKey = resolveApiKey(options.apiKey);
    this.client = new Anthropic({ apiKey });
    // Use Sonnet 4 with extended thinking (Opus 4.5 requires special access)
    this.model = options.model || "claude-sonnet-4-20250514";
    this.maxRetries = options.maxRetries ?? 3;
    this.verbose = options.verbose ?? false;
    this.useThinking = options.useThinking ?? true;
  }

  async generateContent(prompt, systemPrompt, maxTokens = 500) {
    let lastError;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (this.verbose && attempt > 0) {
          console.log(`  Retry attempt ${attempt}/${this.maxRetries}...`);
        }

        const requestParams = {
          model: this.model,
          max_tokens: this.useThinking ? 16000 : maxTokens,
          messages: [{ role: "user", content: prompt }],
        };

        // Extended thinking for Opus 4.5
        if (this.useThinking && this.model.includes("opus")) {
          requestParams.thinking = {
            type: "enabled",
            budget_tokens: 5000
          };
          // System prompt goes in user message for thinking mode
          requestParams.messages[0].content = `${systemPrompt}\n\n${prompt}`;
        } else {
          requestParams.system = systemPrompt;
        }

        const response = await this.client.messages.create(requestParams);

        // Extract text content (skip thinking blocks)
        if (response.content && response.content.length > 0) {
          const textBlock = response.content.find(block => block.type === "text");
          if (textBlock) {
            return textBlock.text;
          }
        }

        throw new LLMError("Empty response from API", "empty_response", true);
      } catch (error) {
        lastError = error;

        if (error instanceof LLMError && !error.retryable) {
          throw error;
        }

        if (error.status === 401) {
          throw new LLMError("Invalid API key", "auth", false);
        }

        if (error.status === 429) {
          const delay = Math.pow(2, attempt + 1) * 1000;
          if (this.verbose) {
            console.log(`  Rate limited, waiting ${delay}ms...`);
          }
          await sleep(delay);
          continue;
        }

        if (error.status >= 500) {
          const delay = 2000 * (attempt + 1);
          if (this.verbose) {
            console.log(`  Server error, waiting ${delay}ms...`);
          }
          await sleep(delay);
          continue;
        }

        if (attempt < this.maxRetries) {
          await sleep(1000);
          continue;
        }
      }
    }

    throw new LLMError(
      `Failed after ${this.maxRetries + 1} attempts: ${lastError?.message || "Unknown error"}`,
      "max_retries",
      false
    );
  }
}
