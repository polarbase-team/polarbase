export const modelGroups = [
  {
    label: 'Cloud',
    items: [
      // OpenAI
      { label: 'GPT-5', value: 'gpt-5' },
      { label: 'GPT-5.1', value: 'gpt-5.1' },

      // Google Gemini
      { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
      { label: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro' },
      { label: 'Gemini 3 Flash Preview', value: 'gemini-3-flash-preview' },
      { label: 'Gemini 3 Pro Preview', value: 'gemini-3-pro-preview' },

      // Anthropic
      { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet' },
      { label: 'Claude Sonnet 4.5', value: 'claude-sonnet-4-5' },
      { label: 'Claude Opus 4.6', value: 'claude-opus-4-6' },
      { label: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku' },

      // xAI
      { label: 'Grok 3', value: 'grok-3' },
      { label: 'Grok 4', value: 'grok-4' },
    ],
  },
  {
    label: 'Local',
    items: [{ label: 'Local', value: 'local' }],
  },
];
