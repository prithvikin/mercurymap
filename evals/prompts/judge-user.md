Grade this {{endpoint_label}} recommendation case.

Reference expectation (an evaluation hint, not a phrase the answer must copy): {{pattern}}

Photographed history:
{{history_json}}

Model output:
{{output_json}}

Return only a JSON object with exactly these keys:
{
  "intro_pattern_score": integer 0-2,
  "reason_grounding_score": integer 0-2,
  "tone_score": integer 0-2,
  "overall_score": integer 0-6,
  "explanation": string,
  "reason_checks": [
    {"score": integer 0-2, "note": string}
  ]
}
