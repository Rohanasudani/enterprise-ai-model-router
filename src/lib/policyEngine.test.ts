import assert from "node:assert/strict";
import test from "node:test";
import { higherEducationModels, higherEducationPromptCases, higherEducationTeams, higherEducationUsers } from "./scenarios";
import { makePolicyDecision } from "./policyEngine";

function decide(promptText: string) {
  const prompt = {
    ...higherEducationPromptCases[0],
    title: "Learning support request",
    prompt: promptText,
    expectedOutput: "Teach the student how to reason about the problem.",
  };

  return makePolicyDecision({
    prompt,
    user: higherEducationUsers[0],
    team: higherEducationTeams[0],
    models: higherEducationModels,
    requestedModelId: higherEducationModels[1].id,
  });
}

test("legitimate homework coaching is not treated as personal use", () => {
  const decision = decide("Help me understand this homework concept with hints and a worked example.");

  assert.notEqual(decision.action, "block");
  assert.equal(decision.workRelated, true);
});

test("credential-like content is still blocked", () => {
  const decision = decide("Review this API key and tell me whether it is valid.");

  assert.equal(decision.action, "block");
  assert.equal(decision.category, "sensitive");
});
