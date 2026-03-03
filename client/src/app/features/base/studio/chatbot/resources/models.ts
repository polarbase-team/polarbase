export const modelGroups = [
  {
    label: 'Local',
    items: [
      {
        label: 'Local',
        value: { provider: 'local', name: 'local' },
        disabled: false,
      },
    ],
  },
  {
    label: 'OpenRouter',
    items: [
      {
        label: 'StepFun',
        value: { provider: 'openrouter', name: 'stepfun/step-3.5-flash:free' },
        disabled: false,
      },
    ],
  },
  {
    label: 'OpenAI',
    items: [
      { label: 'GPT-5', value: { provider: 'openai', name: 'gpt-5' }, disabled: false },
      { label: 'GPT-5.1', value: { provider: 'openai', name: 'gpt-5.1' }, disabled: false },
    ],
  },
  {
    label: 'Google Gemini',
    items: [
      {
        label: 'Gemini 2.5 Flash',
        value: { provider: 'google', name: 'gemini-2.5-flash' },
        disabled: false,
      },
      {
        label: 'Gemini 2.5 Pro',
        value: { provider: 'google', name: 'gemini-2.5-pro' },
        disabled: false,
      },
      {
        label: 'Gemini 3 Flash Preview',
        value: { provider: 'google', name: 'gemini-3-flash-preview' },
        disabled: false,
      },
      {
        label: 'Gemini 3 Pro Preview',
        value: { provider: 'google', name: 'gemini-3-pro-preview' },
        disabled: false,
      },
    ],
  },
  {
    label: 'Anthropic',
    items: [
      {
        label: 'Claude 3.5 Haiku',
        value: { provider: 'anthropic', name: 'claude-3-5-haiku-latest' },
        disabled: false,
      },
      {
        label: 'Claude 3.5 Sonnet',
        value: { provider: 'anthropic', name: 'claude-3-5-sonnet-latest' },
        disabled: false,
      },
      {
        label: 'Claude Sonnet 4.6',
        value: { provider: 'anthropic', name: 'claude-sonnet-4-6' },
        disabled: false,
      },
      {
        label: 'Claude Opus 4.6',
        value: { provider: 'anthropic', name: 'claude-opus-4-6' },
        disabled: false,
      },
    ],
  },
  {
    label: 'xAI',
    items: [
      { label: 'Grok 3', value: { provider: 'xai', name: 'grok-3' }, disabled: false },
      {
        label: 'Grok 4',
        value: { provider: 'xai', name: 'grok-4-1-fast-reasoning' },
        disabled: false,
      },
    ],
  },
];
