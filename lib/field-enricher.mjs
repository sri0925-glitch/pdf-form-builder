import { LLMClient, LLMError } from "./llm-client.mjs";
import { buildPrompt, NCOER_SYSTEM_PROMPT } from "./prompt-templates.mjs";

function buildContextForField(field, previousNcoer) {
  const context = {};

  if (!previousNcoer) return context;

  const contextMapping = {
    part3_daily_duties: {
      previousDuties: previousNcoer.part3?.dailyDuties,
      position: previousNcoer.supplementalContext?.position,
      unit: previousNcoer.supplementalContext?.unit,
    },
    part3_special_emphasis: {
      previousEmphasis: previousNcoer.part3?.specialEmphasis,
    },
    part3_appointed_duties: {
      previousAppointed: previousNcoer.part3?.appointedDuties,
    },
    part4_pt: {
      previousPT: previousNcoer.part4?.ptComments,
    },
    part4_character: {
      previousCharacter: previousNcoer.part4?.cComments,
    },
    part4_presence: {
      previousPresence: previousNcoer.part4?.dComments,
    },
    part4_intellect: {
      previousIntellect: previousNcoer.part4?.eComments,
    },
    part4_leads: {
      previousLeads: previousNcoer.part4?.fComments,
    },
    part4_develops: {
      previousDevelops: previousNcoer.part4?.gComments,
    },
    part4_achieves: {
      previousAchieves: previousNcoer.part4?.hComments,
    },
    part4_overall: {
      previousOverall: previousNcoer.part4?.jComments,
    },
    part5_rater: {
      previousRater: previousNcoer.part5?.a,
    },
    part5_sr_potential: {
      previousSR: previousNcoer.part5?.b,
    },
    part5_sr_comments: {
      previousSRComments: previousNcoer.part5?.c,
    },
  };

  const promptKey = field.llm?.promptKey;
  if (promptKey && contextMapping[promptKey]) {
    Object.assign(context, contextMapping[promptKey]);
  }

  if (previousNcoer.supplementalContext) {
    Object.assign(context, previousNcoer.supplementalContext);
  }

  if (field.llm?.additionalContext) {
    Object.assign(context, field.llm.additionalContext);
  }

  return context;
}

export async function enrichFields(fields, previousNcoer, options = {}) {
  const { apiKey, model, verbose, dryRun } = options;

  const llmFields = fields.filter((f) => f.llm?.generate === true);

  if (llmFields.length === 0) {
    if (verbose) console.log("No fields marked for LLM generation");
    return fields;
  }

  if (verbose) {
    console.log(`Found ${llmFields.length} fields to generate with LLM`);
  }

  let client = null;
  if (!dryRun) {
    client = new LLMClient({ apiKey, model, verbose });
  }

  const enrichedFields = [...fields];

  for (let i = 0; i < enrichedFields.length; i++) {
    const field = enrichedFields[i];

    if (!field.llm?.generate) continue;

    const promptKey = field.llm.promptKey;
    if (!promptKey) {
      console.warn(`Field "${field.name}" has llm.generate=true but no promptKey`);
      continue;
    }

    const context = buildContextForField(field, previousNcoer);

    try {
      const { prompt, description, maxTokens } = buildPrompt(promptKey, context);

      if (verbose) {
        console.log(`\nGenerating: ${field.name} (${description})`);
      }

      if (dryRun) {
        console.log(`\n--- DRY RUN: ${field.name} ---`);
        console.log(`Prompt key: ${promptKey}`);
        console.log(`Max tokens: ${maxTokens}`);
        console.log(`Context keys: ${Object.keys(context).join(", ") || "(none)"}`);
        console.log(`Prompt preview:\n${prompt.slice(0, 300)}...`);
        continue;
      }

      const generated = await client.generateContent(
        prompt,
        NCOER_SYSTEM_PROMPT,
        field.llm.maxTokens || maxTokens
      );

      enrichedFields[i] = {
        ...field,
        value: generated.trim(),
        llm: {
          ...field.llm,
          generatedAt: new Date().toISOString(),
        },
      };

      if (verbose) {
        console.log(`  Generated ${generated.length} characters`);
      }
    } catch (error) {
      if (error instanceof LLMError && !error.retryable) {
        throw error;
      }

      console.error(`Error generating content for ${field.name}: ${error.message}`);

      if (field.llm.fallbackValue !== undefined) {
        enrichedFields[i] = {
          ...field,
          value: field.llm.fallbackValue,
          llm: {
            ...field.llm,
            error: error.message,
            usedFallback: true,
          },
        };
        if (verbose) console.log(`  Using fallback value`);
      } else if (field.llm.required !== false) {
        throw error;
      }
    }
  }

  return enrichedFields;
}

export function validateLLMConfig(fields) {
  const errors = [];
  const warnings = [];

  for (const field of fields) {
    if (!field.llm?.generate) continue;

    if (!field.llm.promptKey) {
      errors.push(`Field "${field.name}": missing llm.promptKey`);
    }

    if (field.type !== "text") {
      warnings.push(`Field "${field.name}": LLM generation on non-text field (type: ${field.type})`);
    }
  }

  return { errors, warnings, valid: errors.length === 0 };
}
