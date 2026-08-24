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
  { endpoint: 'personal', source: 'recommendations.ts', constant: 'SYSTEM_PROMPT', copy: 'personal-system.md' },
  { endpoint: 'community', source: 'community-recommendations.ts', constant: 'SYSTEM_PROMPT', copy: 'community-system.md' },
  { endpoint: 'search', source: 'search.ts', constant: 'SEARCH_SYSTEM_PROMPT', copy: 'search-system.md' },
];

function extractSystemPrompt(sourcePath, constant) {
  const source = fs.readFileSync(sourcePath, 'utf8');
  // Anchored to a line start so SEARCH_SYSTEM_PROMPT cannot be matched by a
  // pattern meant for SYSTEM_PROMPT.
  const match = source.match(new RegExp(`^const ${constant} = \`([\\s\\S]*?)\`;`, 'm'));
  if (!match) throw new Error(`could not find ${constant} in ${sourcePath}`);
  return match[1];
}

export function checkPromptSync() {
  return PAIRS.map(({ endpoint, source, constant, copy }) => {
    const sourcePath = path.join(API_DIR, source);
    const copyPath = path.join(PROMPTS_DIR, copy);
    try {
      const shipped = extractSystemPrompt(sourcePath, constant).trim();
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
