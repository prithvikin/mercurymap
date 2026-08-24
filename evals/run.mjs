#!/usr/bin/env node
/**
 * MercuryMap recommendation eval runner.
 *
 * Fixture mode is the default and intentionally never constructs an Anthropic
 * client. `--live` is an explicit opt-in for the paid generation + judge pass.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateJudgeResult, validateResponse, validateSearch, summarizeChecks } from './validators.mjs';
import { checkPromptSync } from './prompt-sync.mjs';
import { geocoderApiKey, referenceKey, resolveSuggestions } from './geocoder.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CASES_DIR = path.join(HERE, 'cases');
const FIXTURES_DIR = path.join(HERE, 'fixtures');
const PROMPTS_DIR = path.join(HERE, 'prompts');
const RESULTS_DIR = path.join(HERE, 'results');
const OUTPUT_PATH = path.join(RESULTS_DIR, 'latest.json');
const args = new Set(process.argv.slice(2));
const live = args.has('--live');

const GENERATION_MODEL = 'claude-opus-5';
// The search parser is a small extraction call and ships on Haiku, so the eval
// exercises the model the endpoint actually uses rather than a stronger one.
const SEARCH_MODEL = 'claude-haiku-4-5-20251001';
// Mirrors SEARCH_SCHEMA in frontend/api/search.ts.
const SEARCH_SCHEMA = {
  type: 'object',
  properties: {
    keywords: { type: 'array', minItems: 0, items: { type: 'string' } },
    country: { type: ['string', 'null'] },
    date_from: { type: ['string', 'null'] },
    date_to: { type: ['string', 'null'] },
  },
  required: ['keywords', 'country', 'date_from', 'date_to'],
  additionalProperties: false,
};
// Kept exactly as requested for the inexpensive judge pass.
const JUDGE_MODEL = 'claude-haiku-4-5-20251001';
// Quality gate. A response that clears every deterministic check can still be
// generic filler, so a judge score below this fails the case.
const MIN_JUDGE_OVERALL = 4;
const MIN_JUDGE_DIMENSION = 1;
const PRICES_USD_PER_MTOK = {
  [GENERATION_MODEL]: { input: 5, output: 25 },
  [JUDGE_MODEL]: { input: 1, output: 5 },
};

const RECOMMENDATION_SCHEMA = {
  type: 'object',
  properties: {
    intro: { type: 'string' },
    suggestions: {
      type: 'array',
      // Anthropic structured outputs currently allow minItems 0 or 1 and do
      // not support maxItems. The 3-5 contract is checked after generation.
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          place: { type: 'string' },
          country: { type: 'string' },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          reason: { type: 'string' },
        },
        required: ['place', 'country', 'latitude', 'longitude', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['intro', 'suggestions'],
  additionalProperties: false,
};

const JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    intro_pattern_score: { type: 'integer' },
    reason_grounding_score: { type: 'integer' },
    tone_score: { type: 'integer' },
    overall_score: { type: 'integer' },
    explanation: { type: 'string' },
    reason_checks: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: { score: { type: 'integer' }, note: { type: 'string' } },
        required: ['score', 'note'],
        additionalProperties: false,
      },
    },
  },
  required: [
    'intro_pattern_score',
    'reason_grounding_score',
    'tone_score',
    'overall_score',
    'explanation',
    'reason_checks',
  ],
  additionalProperties: false,
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function endpointLabel(endpoint) {
  return endpoint === 'community' ? 'community' : 'personal';
}

function promptLocations(history) {
  const seen = new Set();
  return history
    .filter((photo) => photo?.title && photo.title !== 'Untitled' && photo.latitude != null && photo.longitude != null)
    .filter((photo) => {
      const key = `${photo.title}|${photo.country}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 50);
}

function locationList(history) {
  return history
    .map((photo) => `- ${photo.title}, ${photo.country} (${Number(photo.latitude).toFixed(2)}, ${Number(photo.longitude).toFixed(2)})${photo.taken_date ? ` -- ${photo.taken_date}` : ''}`)
    .join('\n');
}

function generationUserPrompt(testCase) {
  const locations = promptLocations(testCase.history);
  const subject = testCase.endpoint === 'community'
    ? "MercuryMap's community has photographed"
    : "I've photographed";
  const question = testCase.endpoint === 'community'
    ? 'What should a new visitor consider for their next trip?'
    : 'Where should I go next?';
  return `Here are the ${locations.length} places ${subject}:\n\n${locationList(locations)}\n\n${question}`;
}

function fillTemplate(template, replacements) {
  return Object.entries(replacements).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, value),
    template,
  );
}

function usageCost(model, usage) {
  if (!usage) return null;
  const price = PRICES_USD_PER_MTOK[model];
  if (!price) return null;
  const input = Number(usage.input_tokens ?? 0);
  const output = Number(usage.output_tokens ?? 0);
  return Number(((input / 1e6) * price.input + (output / 1e6) * price.output).toFixed(6));
}

function extractJsonText(message) {
  if (message.stop_reason === 'refusal') {
    const category = message.stop_details?.category ?? 'unknown';
    throw new Error(`model refusal (${category})`);
  }
  const textBlock = message.content?.find((block) => block.type === 'text');
  if (!textBlock) throw new Error(`model returned no text block (stop_reason=${message.stop_reason})`);
  try {
    return JSON.parse(textBlock.text);
  } catch (error) {
    throw new Error(`model returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function createClient() {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new Error('Live mode requires ANTHROPIC_API_KEY (or an authenticated ant profile). Use --env-file explicitly.');
  }
  const sdk = await import('../frontend/node_modules/@anthropic-ai/sdk/index.mjs');
  return new sdk.default();
}

async function generateLive(client, testCase) {
  const systemFile = testCase.endpoint === 'community' ? 'community-system.md' : 'personal-system.md';
  const message = await client.messages.create({
    model: GENERATION_MODEL,
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low', format: { type: 'json_schema', schema: RECOMMENDATION_SCHEMA } },
    system: readText(path.join(PROMPTS_DIR, systemFile)),
    messages: [{ role: 'user', content: generationUserPrompt(testCase) }],
  });
  return { value: extractJsonText(message), usage: message.usage ?? null, model: message.model ?? GENERATION_MODEL };
}

async function searchLive(client, testCase) {
  const message = await client.messages.create({
    model: SEARCH_MODEL,
    max_tokens: 768,
    output_config: { format: { type: 'json_schema', schema: SEARCH_SCHEMA } },
    system: readText(path.join(PROMPTS_DIR, 'search-system.md')),
    // Identical framing to parseQuery() in frontend/api/search.ts.
    messages: [{ role: 'user', content: `Search query: ${testCase.query}` }],
  });
  return { value: extractJsonText(message), usage: message.usage ?? null, model: message.model ?? SEARCH_MODEL };
}

async function judgeLive(client, testCase, output) {
  const system = readText(path.join(PROMPTS_DIR, 'judge-system.md'));
  const user = fillTemplate(readText(path.join(PROMPTS_DIR, 'judge-user.md')), {
    endpoint_label: endpointLabel(testCase.endpoint),
    pattern: testCase.expected.pattern ?? 'not applicable',
    history_json: JSON.stringify(testCase.history, null, 2),
    output_json: JSON.stringify(output, null, 2),
  });
  const message = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 1200,
    output_config: { format: { type: 'json_schema', schema: JUDGE_SCHEMA } },
    system,
    messages: [{ role: 'user', content: user }],
  });
  return { value: extractJsonText(message), usage: message.usage ?? null, model: message.model ?? JUDGE_MODEL };
}

function resultLine(testCase, result) {
  const prefix = `${testCase.id.padEnd(34)} `;
  if (result.status === 'EXPECTED_FAILURE') {
    return `${prefix}EXPECTED FAILURE CAUGHT  ${result.failureReasons.join('; ')}`;
  }
  if (result.status === 'PASS') {
    const score = result.judge?.value ? ` | judge ${result.judge.value.overall_score}/6` : '';
    return `${prefix}PASS${score}`;
  }
  return `${prefix}REGRESSION          ${result.failureReasons.join('; ')}`;
}

function printReport(report) {
  console.log(`MercuryMap LLM evaluation — ${report.mode}`);
  console.log(`Cases: ${report.summary.total} | passed: ${report.summary.passed} | expected failures: ${report.summary.expectedFailures} | regressions: ${report.summary.regressions}`);
  console.log('');
  for (const result of report.cases) console.log(resultLine(result.case, result));
  console.log('');
  if (report.metrics.judgeCases > 0) {
    console.log(`Judge average: ${report.metrics.judgeAverage.toFixed(2)}/6 across ${report.metrics.judgeCases} recommendation cases`);
  }
  console.log(`Deterministic checks: ${report.metrics.deterministicPassed}/${report.metrics.deterministicCases} normal cases passed`);
  console.log(`Prompt sync: ${report.metrics.promptSyncPassed}/${report.metrics.promptSyncChecks} endpoint prompts match`);
  console.log(`Estimated live spend: $${report.cost.estimatedUsd.toFixed(4)}${report.mode === 'fixtures' ? ' (not incurred)' : ''}`);
  console.log(`JSON report: ${OUTPUT_PATH}`);
}

async function main() {
  const promptSync = checkPromptSync();
  const promptDrift = promptSync.filter((item) => !item.inSync).length;
  if (live && promptDrift > 0) {
    throw new Error(`refusing live calls because ${promptDrift} endpoint prompt copy/copies drifted; run fixture mode to inspect the report`);
  }
  const caseFiles = fs.readdirSync(CASES_DIR).filter((name) => name.endsWith('.json')).sort();
  const cases = caseFiles.map((name) => readJson(path.join(CASES_DIR, name)));
  let client = null;
  let opencageKey = null;
  if (live) {
    client = await createClient();
    // Verified live, coordinates are checked against the same geocoder the app
    // uses rather than the 41-entry gazetteer, which cannot cover the whole
    // world the endpoints legitimately recommend from.
    opencageKey = geocoderApiKey();
    if (!opencageKey) {
      throw new Error(
        'Live mode requires OPENCAGE_API_KEY (or REACT_APP_OPENCAGE_API_KEY) to verify coordinates. ' +
          'It is already in frontend/.env.local; pass it with --env-file.'
      );
    }
  }

  const reportCases = [];
  let generationUsage = [];
  let judgeUsage = [];
  let searchUsage = [];

  for (const testCase of cases) {
    const expected = testCase.expected;
    let output;
    let generation = null;
    let judge = null;
    const failureReasons = [];

    try {
      // The negative sentinel is always fixture-backed. It exists to prove the
      // validators fail closed and must never become a paid model request.
      if (live && !expected.expectFailure && expected.kind === 'recommendations') {
        generation = await generateLive(client, testCase);
        output = generation.value;
        generationUsage.push(generation.usage);
      } else if (live && !expected.expectFailure && expected.kind === 'search') {
        generation = await searchLive(client, testCase);
        output = generation.value;
        searchUsage.push(generation.usage);
      } else {
        output = readJson(path.join(FIXTURES_DIR, expected.fixture));
      }
    } catch (error) {
      failureReasons.push(`generation: ${error instanceof Error ? error.message : String(error)}`);
    }

    // The sentinel stays gazetteer-backed: it must fail offline and for
    // reasons the runner controls, not because a geocoder happened to agree.
    const useGeocoder = live && !expected.expectFailure && expected.kind === 'recommendations';
    let referenceOptions = {};
    if (useGeocoder && output?.suggestions) {
      try {
        const table = await resolveSuggestions(output.suggestions, opencageKey);
        referenceOptions = {
          resolveReference: (place, country) => table.get(referenceKey(place, country)) ?? null,
          referenceLabel: 'OpenCage tolerance: 1°; places the geocoder cannot resolve are unverifiable',
        };
      } catch (error) {
        failureReasons.push(`geocoding: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const deterministic = output === undefined
      ? { passed: false, checks: [], value: null }
      : expected.kind === 'search'
      ? validateSearch(output, expected)
      : validateResponse(output, testCase.history, {
        endpoint: testCase.endpoint,
        expectedKind: expected.kind,
        expectedPhotoCount: testCase.history.length,
        ...referenceOptions,
      });

    if (!deterministic.passed) failureReasons.push(...summarizeChecks(deterministic));

    const wasExpectedFailure = Boolean(expected.expectFailure);
    if (wasExpectedFailure) {
      if (deterministic.passed) failureReasons.push('known-bad fixture unexpectedly passed all validators');
      reportCases.push({ case: testCase, status: deterministic.passed ? 'REGRESSION' : 'EXPECTED_FAILURE', deterministic, failureReasons, output });
      continue;
    }

    if (deterministic.passed && expected.kind === 'recommendations') {
      try {
        if (live) {
          judge = await judgeLive(client, testCase, output);
          judgeUsage.push(judge.usage);
        } else {
          judge = { value: readJson(path.join(FIXTURES_DIR, `${testCase.id}.judge.json`)), usage: null, model: JUDGE_MODEL };
        }
        const judgeValidation = validateJudgeResult(judge.value, output.suggestions?.length ?? null);
        judge.validation = judgeValidation;
        if (!judgeValidation.passed) failureReasons.push(...summarizeChecks(judgeValidation));
        if (judgeValidation.passed) {
          const score = judgeValidation.value;
          const weakDimensions = [
            ['intro_pattern_score', score.intro_pattern_score],
            ['reason_grounding_score', score.reason_grounding_score],
            ['tone_score', score.tone_score],
          ].filter(([, value]) => value < MIN_JUDGE_DIMENSION).map(([name]) => name);
          if (score.overall_score < MIN_JUDGE_OVERALL) {
            failureReasons.push(`judge overall score ${score.overall_score}/6 is below ${MIN_JUDGE_OVERALL}/6`);
          }
          if (weakDimensions.length > 0) {
            failureReasons.push(`judge weak dimension(s): ${weakDimensions.join(', ')}`);
          }
        }
      } catch (error) {
        failureReasons.push(`judge: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const status = failureReasons.length === 0 ? 'PASS' : 'REGRESSION';
    reportCases.push({ case: testCase, status, deterministic, judge, failureReasons, output });
  }

  const normalCases = reportCases.filter((item) => !item.case.expected.expectFailure);
  const judgeResults = reportCases.map((item) => item.judge?.value).filter((value) => value && Number.isFinite(value.overall_score));
  const allUsage = [...generationUsage, ...judgeUsage, ...searchUsage];
  const totalInputTokens = allUsage.reduce((sum, usage) => sum + Number(usage?.input_tokens ?? 0), 0);
  const totalOutputTokens = allUsage.reduce((sum, usage) => sum + Number(usage?.output_tokens ?? 0), 0);
  const estimatedUsd = generationUsage.reduce((sum, usage) => sum + (usageCost(GENERATION_MODEL, usage) ?? 0), 0)
    + judgeUsage.reduce((sum, usage) => sum + (usageCost(JUDGE_MODEL, usage) ?? 0), 0)
    + searchUsage.reduce((sum, usage) => sum + (usageCost(SEARCH_MODEL, usage) ?? 0), 0);
  const recommendationCases = normalCases.filter((item) => item.case.expected.kind === 'recommendations').length;
  // Search adds a Haiku extraction call per case, an order of magnitude cheaper
  // than an Opus generation, so it barely moves the planning estimate.
  const searchCases = normalCases.filter((item) => item.case.expected.kind === 'search').length;
  const maxEstimatedUsd = recommendationCases * 0.012 + recommendationCases * 0.003 + searchCases * 0.001;

  const regressions = reportCases.filter((item) => item.status === 'REGRESSION').length + promptDrift;
  const report = {
    generatedAt: new Date().toISOString(),
    mode: live ? 'live' : 'fixtures',
    models: { generation: GENERATION_MODEL, judge: JUDGE_MODEL, search: SEARCH_MODEL },
    promptSync,
    summary: {
      total: reportCases.length,
      passed: reportCases.filter((item) => item.status === 'PASS').length,
      expectedFailures: reportCases.filter((item) => item.status === 'EXPECTED_FAILURE').length,
      regressions,
      promptDrift,
    },
    metrics: {
      deterministicCases: normalCases.length,
      deterministicPassed: normalCases.filter((item) => item.deterministic.passed).length,
      judgeCases: judgeResults.length,
      judgeAverage: judgeResults.length ? judgeResults.reduce((sum, value) => sum + value.overall_score, 0) / judgeResults.length : 0,
      promptSyncChecks: promptSync.length,
      promptSyncPassed: promptSync.filter((item) => item.inSync).length,
    },
    cost: {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      incurredUsd: Number(estimatedUsd.toFixed(6)),
      // Conservative planning estimate for a full live run at roughly 800
      // generation input / 350 output and 500 judge input / 300 output tokens.
      estimatedUsd: Number(maxEstimatedUsd.toFixed(4)),
      pricingUsdPerMillionTokens: PRICES_USD_PER_MTOK,
    },
    cases: reportCases,
  };

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  printReport(report);
  if (regressions > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Evaluation runner failed before completing the suite: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
