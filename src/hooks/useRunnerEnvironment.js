import { useState, useEffect } from 'react';
import { backend } from '@/api/backend';

// built-in fallbacks if the environment endpoint isn't reachable yet
const FALLBACK_MODELS = [
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8', note: 'Most capable', default: true },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', note: 'Balanced' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', note: 'Fast' },
];

// reads this machine's real folders + available models from the local server
export function useRunnerEnvironment() {
  const [env, setEnv] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () => backend.getEnvironment().then((e) => alive && setEnv(e)).catch(() => {});
    load();
    const t = setInterval(load, 15000); // pick up new folders without a refresh
    return () => { alive = false; clearInterval(t); };
  }, []);

  const models = env?.models?.length ? env.models : FALLBACK_MODELS;
  const folders = env?.folders ?? [];
  const defaultModel = models.find((m) => m.default)?.id ?? models[0].id;

  return { models, folders, defaultModel, online: !!env, hostname: env?.hostname ?? null };
}
