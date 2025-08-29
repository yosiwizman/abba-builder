export const DEFAULT_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      { id: 'gpt-4', name: 'GPT-4', provider: { name: 'OpenAI', id: 'openai' } },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: { name: 'OpenAI', id: 'openai' } },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: [
      { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: { name: 'Anthropic', id: 'anthropic' } },
    ],
  },
];
