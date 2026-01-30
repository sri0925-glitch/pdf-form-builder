export const NCOER_SYSTEM_PROMPT = `You are an expert Army NCOER (Noncommissioned Officer Evaluation Report) writer with deep knowledge of AR 623-3 standards.

Guidelines for NCOER writing:
- Use strong action verbs (led, managed, trained, developed, executed, coordinated)
- Include quantifiable results when possible (numbers, percentages, metrics)
- Be specific to the rated NCO's duties and accomplishments
- Match the professional tone of official Army evaluations
- Focus on impact and results, not just activities
- Use bullet-style format for Part 4 comments
- Stay within character limits appropriate for each block
- Avoid generic phrases; every statement should be specific and meaningful

Do NOT include any preamble or explanation. Output ONLY the evaluation content that would go directly into the form field.`;

export const PROMPT_TEMPLATES = {
  // Part 3 - Duty Description
  part3_daily_duties: {
    description: "Part 3c - Daily Duties and Scope",
    template: (ctx) => `Generate content for NCOER Part 3c (Daily Duties and Scope).

${ctx.previousDuties ? `Previous NCOER content for reference:\n${ctx.previousDuties}\n` : ""}
${ctx.position ? `Current position: ${ctx.position}` : ""}
${ctx.unit ? `Unit: ${ctx.unit}` : ""}
${ctx.keyDuties ? `Key duties to highlight: ${ctx.keyDuties}` : ""}

Write a professional description of daily duties and scope of responsibility. Include people supervised, equipment/facilities managed, and dollar value responsibility if applicable. Format as a flowing narrative paragraph.`,
    maxTokens: 400,
  },

  part3_special_emphasis: {
    description: "Part 3d - Areas of Special Emphasis",
    template: (ctx) => `Generate content for NCOER Part 3d (Areas of Special Emphasis).

${ctx.previousEmphasis ? `Previous content:\n${ctx.previousEmphasis}\n` : ""}
${ctx.focusAreas ? `Focus areas: ${ctx.focusAreas}` : "Focus areas: Training, readiness, soldier welfare"}

Describe areas of special emphasis assigned by the rating chain. These are specific areas the NCO was directed to focus on during the rating period.`,
    maxTokens: 300,
  },

  part3_appointed_duties: {
    description: "Part 3e - Appointed Duties",
    template: (ctx) => `Generate content for NCOER Part 3e (Appointed Duties).

${ctx.previousAppointed ? `Previous content:\n${ctx.previousAppointed}\n` : ""}
${ctx.additionalDuties ? `Additional duties: ${ctx.additionalDuties}` : ""}

List appointed duties beyond primary responsibilities. These are additional duties assigned such as Safety NCO, Unit Movement Officer, Key Control Custodian, etc.`,
    maxTokens: 250,
  },

  // Part 4 - Performance Assessment
  part4_pt: {
    description: "Part 4 - Physical Training Comments",
    template: (ctx) => `Generate NCOER Part 4 Physical Training/ACFT comments.

${ctx.previousPT ? `Previous comments:\n${ctx.previousPT}\n` : ""}
${ctx.ptScore ? `Current ACFT score: ${ctx.ptScore}` : ""}
${ctx.ptAchievements ? `PT achievements: ${ctx.ptAchievements}` : ""}

Write bullet-style comments about physical fitness, ACFT performance, and physical readiness. Focus on scores, improvement, and leadership of PT programs.`,
    maxTokens: 200,
  },

  part4_character: {
    description: "Part 4c - Character Comments",
    template: (ctx) => `Generate NCOER Part 4c Character comments.

${ctx.previousCharacter ? `Previous comments:\n${ctx.previousCharacter}\n` : ""}
${ctx.characterExamples ? `Examples: ${ctx.characterExamples}` : ""}

Write bullet-style comments about Army Values, empathy, warrior ethos, and discipline. Focus on specific examples demonstrating character.`,
    maxTokens: 200,
  },

  part4_presence: {
    description: "Part 4d - Presence Comments",
    template: (ctx) => `Generate NCOER Part 4d Presence comments.

${ctx.previousPresence ? `Previous comments:\n${ctx.previousPresence}\n` : ""}
${ctx.presenceExamples ? `Examples: ${ctx.presenceExamples}` : ""}

Write bullet-style comments about military bearing, fitness, confidence, and resilience. Focus on how the NCO presents themselves as a leader.`,
    maxTokens: 200,
  },

  part4_intellect: {
    description: "Part 4e - Intellect Comments",
    template: (ctx) => `Generate NCOER Part 4e Intellect comments.

${ctx.previousIntellect ? `Previous comments:\n${ctx.previousIntellect}\n` : ""}
${ctx.intellectExamples ? `Examples: ${ctx.intellectExamples}` : ""}
${ctx.education ? `Education/training: ${ctx.education}` : ""}

Write bullet-style comments about mental agility, sound judgment, innovation, and professional development. Include education and self-improvement efforts.`,
    maxTokens: 200,
  },

  part4_leads: {
    description: "Part 4f - Leads Comments",
    template: (ctx) => `Generate NCOER Part 4f Leads comments.

${ctx.previousLeads ? `Previous comments:\n${ctx.previousLeads}\n` : ""}
${ctx.leadsExamples ? `Examples: ${ctx.leadsExamples}` : ""}

Write bullet-style comments about leading others, extending influence, building trust, and creating a positive environment. Focus on leadership actions and their impact.`,
    maxTokens: 200,
  },

  part4_develops: {
    description: "Part 4g - Develops Comments",
    template: (ctx) => `Generate NCOER Part 4g Develops comments.

${ctx.previousDevelops ? `Previous comments:\n${ctx.previousDevelops}\n` : ""}
${ctx.developsExamples ? `Examples: ${ctx.developsExamples}` : ""}

Write bullet-style comments about developing self and others, creating positive climate, preparing self, and stewardship of the profession. Focus on mentorship and training.`,
    maxTokens: 200,
  },

  part4_achieves: {
    description: "Part 4h - Achieves Comments",
    template: (ctx) => `Generate NCOER Part 4h Achieves comments.

${ctx.previousAchieves ? `Previous comments:\n${ctx.previousAchieves}\n` : ""}
${ctx.achievesExamples ? `Examples: ${ctx.achievesExamples}` : ""}

Write bullet-style comments about getting results. Focus on specific accomplishments, mission success, and quantifiable achievements.`,
    maxTokens: 200,
  },

  part4_overall: {
    description: "Part 4j - Overall Performance Comments",
    template: (ctx) => `Generate NCOER Part 4j Overall Performance comments.

${ctx.previousOverall ? `Previous comments:\n${ctx.previousOverall}\n` : ""}
${ctx.overallSummary ? `Key points: ${ctx.overallSummary}` : ""}
${ctx.rating ? `Performance rating: ${ctx.rating}` : ""}

Write a comprehensive summary of overall performance. This should tie together the NCO's achievements across all competencies.`,
    maxTokens: 300,
  },

  // Part 5 - Potential
  part5_rater: {
    description: "Part 5a - Rater Overall Assessment",
    template: (ctx) => `Generate NCOER Part 5a Rater Overall Assessment.

${ctx.previousRater ? `Previous assessment:\n${ctx.previousRater}\n` : ""}
${ctx.potentialIndicators ? `Potential indicators: ${ctx.potentialIndicators}` : ""}

Write the rater's assessment of the NCO's potential for increased responsibility. Focus on readiness for promotion and next-level assignments.`,
    maxTokens: 250,
  },

  part5_sr_potential: {
    description: "Part 5b - Senior Rater Potential Evaluation",
    template: (ctx) => `Generate NCOER Part 5b Senior Rater Potential Evaluation.

${ctx.previousSR ? `Previous evaluation:\n${ctx.previousSR}\n` : ""}
${ctx.srPotential ? `Potential indicators: ${ctx.srPotential}` : ""}

Write the senior rater's evaluation of potential. This is the most influential block for promotion boards.`,
    maxTokens: 250,
  },

  part5_sr_comments: {
    description: "Part 5c - Senior Rater Comments",
    template: (ctx) => `Generate NCOER Part 5c Senior Rater Comments.

${ctx.previousSRComments ? `Previous comments:\n${ctx.previousSRComments}\n` : ""}
${ctx.srComments ? `Key points: ${ctx.srComments}` : ""}

Write the senior rater's comments about potential. Include recommendations for future assignments, schools, and broadening opportunities.`,
    maxTokens: 300,
  },
};

export function buildPrompt(promptKey, context) {
  const template = PROMPT_TEMPLATES[promptKey];
  if (!template) {
    throw new Error(`Unknown prompt key: ${promptKey}. Available keys: ${Object.keys(PROMPT_TEMPLATES).join(", ")}`);
  }

  return {
    prompt: template.template(context),
    description: template.description,
    maxTokens: template.maxTokens,
  };
}

export function getAvailablePromptKeys() {
  return Object.entries(PROMPT_TEMPLATES).map(([key, val]) => ({
    key,
    description: val.description,
  }));
}
