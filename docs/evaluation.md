# Evaluation Method

The application exposes multiple kinds of scores and measurements. They do not carry
the same evidentiary weight, so reports and UI labels keep their sources separate.

## Prompt Cases

A prompt case contains:

- dataset name and task type
- prompt and expected behavior
- estimated input-token count
- difficulty from 1 to 100
- weighted rubric criteria

Prompt cases are reusable inputs for comparing model profiles. The current schema does
not version edits, so a rigorous repeated campaign should create new immutable cases or
record an external snapshot before running.

## Mock Evaluations

`runMockEval` deterministically derives outputs, latency, token usage, cost, overall
score, and rubric scores from the prompt and model metadata. This makes the dashboard
stable and testable without API access.

Mock results validate product behavior:

- API and persistence flow
- router-weight interactions
- run-history rendering
- policy and reporting surfaces
- no-credit deployment behavior

They do not measure any provider model. Synthetic latency, quality, and token values
must not appear in model-performance claims.

## Live Evaluations

Live mode sends the selected prompt cases to configured OpenAI model profiles through
the Responses API. The application records returned text, provider token usage when
available, measured wall-clock latency, and estimated cost from the stored price table.

The initial live quality score is still a heuristic. It combines stored task fit,
difficulty, and a small output-length signal. This score supports the workflow but is
not a calibrated quality metric.

## LLM-As-Judge

The judge receives the original prompt, expected behavior, candidate answer, model
identity, and rubric. A strict JSON schema requires:

- overall score from 0 to 100
- one score per rubric criterion
- a concise explanation

The persisted result changes its score source to `llm_judge` and records the judge
model and timestamp. Judge scores remain model opinions. A production evaluation system
would calibrate them against human labels, test position and verbosity bias, and use
multiple judges or deterministic checks where appropriate.

## Router Score

For each result, the router calculates normalized components:

- quality from the result score
- cost relative to the most expensive candidate in the run
- latency against a fixed normalization band
- context fit from prompt size and model context window

The weighted sum is divided by the total selected weight and rounded for display. The
dashboard slider minimum is one, so the total cannot be zero through the UI.

Router scores are meaningful only within a run. They should not be compared across
different prompts, candidate sets, price tables, or weight configurations without
additional normalization.

## Policy And Savings Estimates

The policy engine estimates output tokens from prompt difficulty and combines them with
stored input/output prices. It compares the requested model with the routed model or a
block decision. Reported savings are:

```text
estimated requested cost - estimated routed cost
```

These values explain the router's counterfactual decision. They are not provider bills
and do not include retries, caching, batch discounts, tool calls, or other platform
charges.

## Automated Verification

The current automated suite covers:

- live-mode and admin-key gates
- rate limits and JSON request handling
- input-size caps and production error redaction
- dashboard loading and weight updates
- mock evaluation and policy workflows
- live-mode blocking in the public configuration
- production compilation and Prisma schema generation

Run it with:

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

## Next Evaluation Work

The next meaningful quality study should freeze a prompt dataset, model identifiers,
model profile metadata, judge model, rubric versions, and sampling configuration. It
should include repeated trials, provider errors, human-reviewed calibration examples,
and confidence intervals rather than a single aggregate score.
