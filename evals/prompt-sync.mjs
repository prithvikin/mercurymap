/**
 * Prompt drift guard.
 *
 * The evaluation prompts under evals/prompts/ must be byte-identical copies of
 * the SYSTEM_PROMPT constants in the two serverless endpoints. If they drift,
 * a live pass measures a prompt the app never sends, and every conclusion the
 * report draws is about the wrong system. This module extracts the shipped
 * prompts and compares them; the endpoints themselves are never modified.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API_DIR = path.join(HERE, '..', 'frontend', 'api');
const PROMPTS_DIR = path.join(HERE, 'prompts');

const PAIRS = [
  { endpoint: 'personal', source: 'recommendations.ts', copy: 'personal-system.md' },
  { endpoint: 'community', source: 'community-recommendations.ts', copy: 'community-system.md' },
];

function extractSystemPrompt(sourcePath) {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const match = source.match(/const SYSTEM_PROMPT = `([\s\S]*?)`;/);
  if (!match) throw new Error(`could not find SYSTEM_PROMPT in ${sourcePath}`);
  return match[1];
}

export function checkPromptSync() {
  return PAIRS.map(({ endpoint, source, copy }) => {
    const sourcePath = path.join(API_DIR, source);
    const copyPath = path.join(PROMPTS_DIR, copy);
    try {
      const shipped = extractSystemPrompt(sourcePath).trim();
      const evaluated = fs.readFileSync(copyPath, 'utf8').trim();
      return {
        endpoint,
        source: sourcePath,
        copy: copyPath,
        inSync: shipped === evaluated,
        detail: shipped === evaluated ? 'identical to the shipped prompt' : 'evals/prompts copy has drifted from the endpoint SYSTEM_PROMPT',
      };
    } catch (error) {
      return {
        endpoint,
        source: sourcePath,
        copy: copyPath,
        inSync: false,
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  });
}
