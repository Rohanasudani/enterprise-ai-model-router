"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  models as seedModels,
  promptCases as seedPromptCases,
  seedRunHistory,
  teams as seedTeams,
  users as seedUsers,
} from "@/lib/data";
import { runMockEval } from "@/lib/mockEval";
import { makePolicyDecision } from "@/lib/policyEngine";
import { defaultRouterWeights, recommendModel } from "@/lib/router";
import {
  higherEducationModels,
  higherEducationPromptCases,
  higherEducationTeams,
  higherEducationUsers,
  scenarioCopy,
} from "@/lib/scenarios";
import type {
  AppUser,
  BootstrapPayload,
  DeploymentScenario,
  EvalMode,
  EvalResult,
  EvalRunPayload,
  JudgeResultsPayload,
  ModelProfile,
  PolicyDecision,
  PolicyDecisionPayload,
  PromptCase,
  PromptCasePayload,
  RouterWeights,
  RubricCriterion,
  SavingsReport,
  Team,
} from "@/lib/types";

function currency(value: number) {
  return `$${value.toFixed(5)}`;
}

function percent(value: number) {
  return `${Math.round(value)}%`;
}

function resourceMarks(model: ModelProfile) {
  if (model.resourceTier) {
    return "$".repeat(model.resourceTier);
  }

  const blendedPrice = model.inputCostPerMTok + model.outputCostPerMTok;
  if (blendedPrice <= 1) return "$";
  if (blendedPrice <= 5) return "$$";
  if (blendedPrice <= 18) return "$$$";
  if (blendedPrice <= 30) return "$$$$";
  return "$$$$$";
}

function categoryLabel(value: string) {
  return value.replaceAll("_", " ");
}

function appendSentence(message: string, suffix: string) {
  return `${message.replace(/[.!?]+$/, "")}. ${suffix}`;
}

function createBlankPromptCase(): PromptCase {
  return {
    id: `custom-${Date.now()}`,
    dataset: "Custom evals",
    title: "",
    taskType: "coding",
    difficulty: 60,
    inputTokens: 800,
    expectedOutput: "",
    prompt: "",
    rubric: [
      {
        name: "Correctness",
        weight: 0.5,
        description: "Answer satisfies the main task requirements.",
      },
      {
        name: "Clarity",
        weight: 0.3,
        description: "Answer is clear, concise, and easy to evaluate.",
      },
      {
        name: "Risk handling",
        weight: 0.2,
        description: "Answer identifies caveats, risks, or edge cases.",
      },
    ],
  };
}

function getStoredDemoAdminKey() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem("ai-router-demo-admin-key") ?? "";
}

export default function Home() {
  const [scenario, setScenario] = useState<DeploymentScenario>("enterprise");
  const [selectionMode, setSelectionMode] = useState<"auto" | "manual">("auto");
  const [models, setModels] = useState<ModelProfile[]>(seedModels);
  const [promptCases, setPromptCases] = useState<PromptCase[]>(seedPromptCases);
  const [teams, setTeams] = useState<Team[]>(seedTeams);
  const [users, setUsers] = useState<AppUser[]>(seedUsers);
  const [selectedPromptId, setSelectedPromptId] = useState(seedPromptCases[0].id);
  const [promptDraft, setPromptDraft] = useState<PromptCase>(seedPromptCases[0]);
  const [selectedUserId, setSelectedUserId] = useState(seedUsers[0].id);
  const [requestedModelId, setRequestedModelId] = useState(seedModels[0].id);
  const [weights, setWeights] = useState<RouterWeights>(defaultRouterWeights);
  const [latestResults, setLatestResults] = useState<EvalResult[]>(() => runMockEval(seedPromptCases[0], seedModels));
  const [history, setHistory] = useState<EvalResult[]>(seedRunHistory);
  const [recentPolicyDecisions, setRecentPolicyDecisions] = useState<PolicyDecision[]>([]);
  const [policyDecision, setPolicyDecision] = useState<PolicyDecision | null>(null);
  const [savingsReport, setSavingsReport] = useState<SavingsReport | null>(null);
  const [dataSource, setDataSource] = useState<"seed" | "database">("seed");
  const [evalMode, setEvalMode] = useState<EvalMode>("mock");
  const [demoAdminKey, setDemoAdminKey] = useState(getStoredDemoAdminKey);
  const bootstrapAdminKeyRef = useRef(demoAdminKey);
  const [isRunning, setIsRunning] = useState(false);
  const [isJudging, setIsJudging] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [runMessage, setRunMessage] = useState("Ready to run model comparison.");
  const [judgeMessage, setJudgeMessage] = useState("Run an eval, then judge the saved outputs.");
  const [policyMessage, setPolicyMessage] = useState("Ready to route organization request.");
  const [promptMessage, setPromptMessage] = useState("Edit an existing prompt case or create a new dataset item.");
  const enterpriseSnapshotRef = useRef<{
    models: ModelProfile[];
    promptCases: PromptCase[];
    teams: Team[];
    users: AppUser[];
    history: EvalResult[];
    recentPolicyDecisions: PolicyDecision[];
    policyDecision: PolicyDecision | null;
    savingsReport: SavingsReport | null;
    source: "seed" | "database";
  }>({
    models: seedModels,
    promptCases: seedPromptCases,
    teams: seedTeams,
    users: seedUsers,
    history: seedRunHistory,
    recentPolicyDecisions: [],
    policyDecision: null,
    savingsReport: null,
    source: "seed",
  });

  const selectedPrompt = promptCases.find((prompt) => prompt.id === selectedPromptId) ?? promptCases[0] ?? seedPromptCases[0];
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? users[0] ?? seedUsers[0];
  const selectedTeam = teams.find((team) => team.id === selectedUser.teamId) ?? teams[0] ?? seedTeams[0];
  const policySelectedModel = policyDecision
    ? models.find((model) => model.id === policyDecision.selectedModelId)
    : undefined;
  const policyDecisionUser = policyDecision ? users.find((user) => user.id === policyDecision.userId) : undefined;
  const policyDecisionTeam = policyDecision ? teams.find((team) => team.id === policyDecision.teamId) : undefined;
  const policyDecisionRequestedModel = policyDecision
    ? models.find((model) => model.id === policyDecision.requestedModelId)
    : undefined;
  const decision = useMemo(
    () =>
      recommendModel(selectedPrompt, latestResults, weights, models, {
        resourceDisplay: scenario === "higher_education" ? "tier" : "estimated_cost",
      }),
    [latestResults, selectedPrompt, weights, models, scenario],
  );
  const winner = models.find((model) => model.id === decision.modelId) ?? models[0];
  const winnerResult = latestResults.find((result) => result.modelId === winner.id) ?? latestResults[0];
  const effectiveRequestedModelId = selectionMode === "auto" ? decision.modelId : requestedModelId;
  const effectiveRequestedModel = models.find((model) => model.id === effectiveRequestedModelId) ?? winner;
  const hasUnsavedPolicyInputs = policyDecision
    ? policyDecision.promptId !== selectedPrompt.id ||
      policyDecision.userId !== selectedUser.id ||
      policyDecision.requestedModelId !== effectiveRequestedModelId
    : false;
  const averageQuality = latestResults.reduce((sum, result) => sum + result.score, 0) / latestResults.length;
  const bestCost = Math.min(...latestResults.map((result) => result.totalCostUsd));
  const fastestLatency = Math.min(...latestResults.map((result) => result.latencyMs));
  const qualityAlternative = [...latestResults].sort((left, right) => right.score - left.score)[0];
  const budgetAlternative = [...latestResults].sort((left, right) => left.totalCostUsd - right.totalCostUsd)[0];
  const qualityAlternativeModel = models.find((model) => model.id === qualityAlternative?.modelId) ?? winner;
  const budgetAlternativeModel = models.find((model) => model.id === budgetAlternative?.modelId) ?? winner;
  const scenarioDetails = scenarioCopy[scenario];
  const shadowRequestedCost = recentPolicyDecisions.reduce(
    (sum, item) => sum + item.estimatedRequestedCostUsd,
    0,
  );
  const shadowRoutedCost = recentPolicyDecisions.reduce((sum, item) => sum + item.estimatedRoutedCostUsd, 0);
  const shadowSavings = recentPolicyDecisions.reduce((sum, item) => sum + item.savingsUsd, 0);
  const actionCount = (action: PolicyDecision["action"]) =>
    scenario === "higher_education"
      ? recentPolicyDecisions.filter((item) => item.action === action).length
      : savingsReport?.actionCounts[action] ?? 0;

  function guardedHeaders() {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const trimmedKey = demoAdminKey.trim();

    if (trimmedKey) {
      headers["x-demo-admin-key"] = trimmedKey;
    }

    return headers;
  }

  function updateDemoAdminKey(value: string) {
    setDemoAdminKey(value);
    window.localStorage.setItem("ai-router-demo-admin-key", value);
  }

  function updatePolicyUser(userId: string) {
    setSelectedUserId(userId);
    if (policyDecision) {
      setPolicyMessage("Requester changed. Click Route Request to create a new policy decision.");
    }
  }

  function updateRequestedModel(modelId: string) {
    setRequestedModelId(modelId);
    if (policyDecision) {
      setPolicyMessage("Requested model changed. Click Route Request to create a new policy decision.");
    }
  }

  async function refreshSavingsReport() {
    try {
      const response = await fetch("/api/reports/savings");
      if (!response.ok) {
        throw new Error("Savings report API unavailable");
      }
      const report = (await response.json()) as SavingsReport;
      setSavingsReport(report);
    } catch {
      setSavingsReport(null);
    }
  }

  useEffect(() => {
    async function loadBootstrapData(adminKey: string) {
      try {
        const trimmedKey = adminKey.trim();
        const response = await fetch("/api/bootstrap", {
          headers: trimmedKey ? { "x-demo-admin-key": trimmedKey } : undefined,
        });
        if (!response.ok) {
          throw new Error("Bootstrap API unavailable");
        }
        const payload = (await response.json()) as BootstrapPayload;
        if (payload.models.length === 0 || payload.promptCases.length === 0) {
          return;
        }
        const initialPrompt = payload.promptCases[0];
        setModels(payload.models);
        setPromptCases(payload.promptCases);
        setTeams(payload.teams);
        setUsers(payload.users);
        setSelectedPromptId(initialPrompt.id);
        setPromptDraft(initialPrompt);
        setSelectedUserId(payload.users[0]?.id ?? seedUsers[0].id);
        setRequestedModelId(payload.models[0]?.id ?? seedModels[0].id);
        setLatestResults(runMockEval(initialPrompt, payload.models));
        setHistory(payload.recentResults);
        setRecentPolicyDecisions(payload.recentPolicyDecisions);
        setPolicyDecision(payload.recentPolicyDecisions[0] ?? null);
        void refreshSavingsReport();
        const bootstrapSource = payload.source ?? "database";
        setDataSource(bootstrapSource);
        enterpriseSnapshotRef.current = {
          models: payload.models,
          promptCases: payload.promptCases,
          teams: payload.teams,
          users: payload.users,
          history: payload.recentResults,
          recentPolicyDecisions: payload.recentPolicyDecisions,
          policyDecision: payload.recentPolicyDecisions[0] ?? null,
          savingsReport: null,
          source: bootstrapSource,
        };
      } catch {
        setDataSource("seed");
      }
    }

    void loadBootstrapData(bootstrapAdminKeyRef.current);
  }, []);

  function changeScenario(nextScenario: DeploymentScenario) {
    if (nextScenario === scenario) {
      return;
    }

    if (scenario === "enterprise" && nextScenario === "higher_education") {
      enterpriseSnapshotRef.current = {
        models,
        promptCases,
        teams,
        users,
        history,
        recentPolicyDecisions,
        policyDecision,
        savingsReport,
        source: dataSource,
      };
    }

    const nextData =
      nextScenario === "higher_education"
        ? {
            models: higherEducationModels,
            promptCases: higherEducationPromptCases,
            teams: higherEducationTeams,
            users: higherEducationUsers,
            history: [] as EvalResult[],
            recentPolicyDecisions: [] as PolicyDecision[],
            policyDecision: null as PolicyDecision | null,
            savingsReport: null as SavingsReport | null,
            source: "seed" as const,
          }
        : enterpriseSnapshotRef.current;
    const firstPrompt = nextData.promptCases[0];
    const firstUser = nextData.users[0];
    const firstModel = nextData.models[0];

    setScenario(nextScenario);
    setModels(nextData.models);
    setPromptCases(nextData.promptCases);
    setTeams(nextData.teams);
    setUsers(nextData.users);
    setHistory(nextData.history);
    setSelectedPromptId(firstPrompt.id);
    setPromptDraft(firstPrompt);
    setSelectedUserId(firstUser.id);
    setRequestedModelId(firstModel.id);
    setLatestResults(runMockEval(firstPrompt, nextData.models));
    setPolicyDecision(nextData.policyDecision);
    setRecentPolicyDecisions(nextData.recentPolicyDecisions);
    setSavingsReport(nextData.savingsReport);
    setSelectionMode("auto");
    setEvalMode("mock");
    setDataSource(nextData.source);
    setRunMessage(
      nextScenario === "higher_education"
        ? "Synthetic shadow-mode estimates are ready. No university systems or user data are connected."
        : "Ready to run model comparison.",
    );
    setJudgeMessage("Run an eval, then judge the saved outputs.");
    setPolicyMessage(
      nextScenario === "higher_education"
        ? "Ready to preview campus guidance without changing live traffic."
        : "Ready to route organization request.",
    );

    if (nextScenario === "enterprise" && !nextData.savingsReport) {
      void refreshSavingsReport();
    }
  }

  function updatePrompt(promptId: string) {
    const nextPrompt = promptCases.find((prompt) => prompt.id === promptId) ?? promptCases[0];
    setSelectedPromptId(promptId);
    setPromptDraft(nextPrompt);
    setLatestResults(runMockEval(nextPrompt, models));
  }

  function updatePromptDraft<K extends keyof PromptCase>(key: K, value: PromptCase[K]) {
    setPromptDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateRubricCriterion(index: number, patch: Partial<RubricCriterion>) {
    setPromptDraft((current) => ({
      ...current,
      rubric: current.rubric.map((criterion, currentIndex) =>
        currentIndex === index ? { ...criterion, ...patch } : criterion,
      ),
    }));
  }

  function addRubricCriterion() {
    setPromptDraft((current) => ({
      ...current,
      rubric: [
        ...current.rubric,
        {
          name: "New criterion",
          weight: 0.2,
          description: "Describe what a high-scoring answer should do.",
        },
      ],
    }));
  }

  function removeRubricCriterion(index: number) {
    setPromptDraft((current) => ({
      ...current,
      rubric: current.rubric.filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  function newPromptCase() {
    const blank = createBlankPromptCase();
    setPromptDraft(blank);
    setSelectedPromptId(blank.id);
    setPromptMessage("Drafting a new prompt case. Save it to add it to the dataset.");
  }

  async function savePromptCase() {
    setIsSavingPrompt(true);
    setPromptMessage(
      scenario === "higher_education" ? "Saving this case locally for the prototype..." : "Saving prompt case to PostgreSQL...",
    );
    try {
      if (scenario === "higher_education") {
        setPromptCases((current) => {
          const exists = current.some((prompt) => prompt.id === promptDraft.id);
          return exists
            ? current.map((prompt) => (prompt.id === promptDraft.id ? promptDraft : prompt))
            : [...current, promptDraft];
        });
        setSelectedPromptId(promptDraft.id);
        setLatestResults(runMockEval(promptDraft, models));
        setPromptMessage("Synthetic prompt case saved locally. Nothing was sent to an external service.");
        return;
      }

      const response = await fetch("/api/prompt-cases", {
        method: "POST",
        headers: guardedHeaders(),
        body: JSON.stringify(promptDraft),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorPayload?.error ?? "Prompt save failed");
      }

      const payload = (await response.json()) as PromptCasePayload;
      setPromptCases((current) => {
        const exists = current.some((prompt) => prompt.id === payload.promptCase.id);
        const nextPromptCases = exists
          ? current.map((prompt) => (prompt.id === payload.promptCase.id ? payload.promptCase : prompt))
          : [...current, payload.promptCase];
        enterpriseSnapshotRef.current = {
          ...enterpriseSnapshotRef.current,
          promptCases: nextPromptCases,
        };
        return nextPromptCases;
      });
      setSelectedPromptId(payload.promptCase.id);
      setPromptDraft(payload.promptCase);
      setLatestResults(runMockEval(payload.promptCase, models));
      setDataSource("database");
      setPromptMessage("Prompt case saved and ready for eval runs.");
    } catch (error) {
      setPromptMessage(error instanceof Error ? error.message : "Prompt save failed.");
    } finally {
      setIsSavingPrompt(false);
    }
  }

  async function routePolicyRequest() {
    setIsRouting(true);
    setPolicyMessage(
      scenario === "higher_education"
        ? "Generating a synthetic campus-guidance preview..."
        : "Routing request through organization policy...",
    );
    try {
      if (scenario === "higher_education") {
        const draft = makePolicyDecision({
          prompt: selectedPrompt,
          user: selectedUser,
          team: selectedTeam,
          models,
          requestedModelId: effectiveRequestedModelId,
        });
        const preview: PolicyDecision = {
          ...draft,
          id: `shadow-preview-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        setPolicyDecision(preview);
        setRecentPolicyDecisions((current) => [preview, ...current].slice(0, 10));
        setPolicyMessage("Shadow-mode preview generated. It did not change live traffic or store prompt content.");
        return;
      }

      const response = await fetch("/api/policy-decisions", {
        method: "POST",
        headers: guardedHeaders(),
        body: JSON.stringify({
          promptId: selectedPrompt.id,
          userId: selectedUser.id,
          requestedModelId: effectiveRequestedModelId,
        }),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorPayload?.error ?? "Policy route failed");
      }

      const payload = (await response.json()) as PolicyDecisionPayload;
      setPolicyDecision(payload.decision);
      setRecentPolicyDecisions((current) => [payload.decision, ...current].slice(0, 10));
      if (payload.persisted === false) {
        setPolicyMessage("Policy preview generated. Production persistence requires admin access.");
      } else {
        setTeams((current) =>
          current.map((team) =>
            team.id === payload.decision.teamId
              ? { ...team, currentSpendUsd: team.currentSpendUsd + payload.decision.estimatedRoutedCostUsd }
              : team,
          ),
        );
        void refreshSavingsReport();
        setPolicyMessage("Policy decision saved to audit log.");
        setDataSource("database");
      }
    } catch (error) {
      setPolicyMessage(error instanceof Error ? error.message : "Policy route failed.");
    } finally {
      setIsRouting(false);
    }
  }

  async function runEval() {
    setIsRunning(true);
    setRunMessage(
      scenario === "higher_education"
        ? "Running synthetic university workload comparison..."
        : evalMode === "live_openai"
          ? "Running live OpenAI eval..."
          : "Running mock eval...",
    );
    try {
      if (scenario === "higher_education") {
        const nextResults = runMockEval(selectedPrompt, models);
        setLatestResults(nextResults);
        setHistory((current) => [...nextResults, ...current].slice(0, 10));
        setDataSource("seed");
        setRunMessage("Synthetic comparison complete. Scores are illustrative until validated in an approved sandbox.");
        return;
      }

      const response = await fetch("/api/eval-runs", {
        method: "POST",
        headers: guardedHeaders(),
        body: JSON.stringify({
          promptId: selectedPrompt.id,
          mode: evalMode,
          weights,
        }),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorPayload?.error ?? "Eval API unavailable");
      }

      const payload = (await response.json()) as EvalRunPayload;
      setLatestResults(payload.results);
      setHistory((current) => [...payload.results, ...current].slice(0, 10));
      setDataSource(payload.persisted === false ? "seed" : "database");
      setRunMessage(
        payload.persisted === false
          ? "Mock preview generated. Production persistence requires admin access."
          : payload.mode === "live_openai"
            ? "Live OpenAI eval saved to PostgreSQL."
            : "Mock eval saved to PostgreSQL.",
      );
    } catch (error) {
      const nextResults = runMockEval(selectedPrompt, models);
      setLatestResults(nextResults);
      setHistory((current) => [...nextResults, ...current].slice(0, 10));
      setDataSource("seed");
      setRunMessage(
        error instanceof Error ? appendSentence(error.message, "Showing mock fallback.") : "Eval failed. Showing mock fallback.",
      );
    } finally {
      setIsRunning(false);
    }
  }

  async function judgeLatestResults() {
    if (scenario === "higher_education") {
      setJudgeMessage("LLM-as-judge scoring is disabled in the shadow-mode pilot.");
      return;
    }

    setIsJudging(true);
    setJudgeMessage("Judging latest saved outputs against the rubric...");
    try {
      const response = await fetch("/api/judge-results", {
        method: "POST",
        headers: guardedHeaders(),
        body: JSON.stringify({
          resultIds: latestResults.map((result) => result.id),
        }),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorPayload?.error ?? "Judge scoring failed");
      }

      const payload = (await response.json()) as JudgeResultsPayload;
      setLatestResults((current) =>
        current.map((result) => payload.results.find((judged) => judged.id === result.id) ?? result),
      );
      setHistory((current) =>
        current.map((result) => payload.results.find((judged) => judged.id === result.id) ?? result),
      );
      setJudgeMessage("LLM-as-judge scores saved to PostgreSQL.");
    } catch (error) {
      setJudgeMessage(error instanceof Error ? error.message : "Judge scoring failed.");
    } finally {
      setIsJudging(false);
    }
  }

  function updateWeight(key: keyof RouterWeights, value: number) {
    setWeights((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <main className="app-shell" data-testid="dashboard">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">MR</div>
            <div>
              <h1>AI Model Router</h1>
              <p>Explainable model recommendations for governed organizations</p>
            </div>
          </div>
          <div className="top-actions">
            <span className="status-pill status-accent">{scenarioDetails.label}</span>
            <span className="status-pill">
              {scenario === "higher_education"
                ? "Synthetic shadow mode"
                : dataSource === "database"
                  ? "PostgreSQL connected"
                  : "Seed fallback"}
            </span>
            <span className="status-pill">{models.length} models</span>
            <button
              className="secondary-button"
              onClick={judgeLatestResults}
              disabled={isJudging || scenario === "higher_education"}
              title={scenario === "higher_education" ? "Requires an approved live sandbox" : undefined}
            >
              {isJudging ? "Judging..." : "Judge Latest"}
            </button>
            <button className="primary-button" onClick={runEval} disabled={isRunning}>
              {isRunning ? "Running..." : "Run Eval"}
            </button>
          </div>
        </div>
      </header>

      <div className="content">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <span className="eyebrow">{scenarioDetails.eyebrow}</span>
            <h2 id="hero-title">Match models to tasks using capability, speed, and resource needs.</h2>
            <p>
              Compare task fit, quality, speed, context, and resource needs. Every recommendation stays explainable,
              reviewable, and easy to override.
            </p>
            <div className="workflow-strip" aria-label="Recommendation workflow">
              <span><strong>1</strong> Choose a setting</span>
              <span><strong>2</strong> Select a real task</span>
              <span><strong>3</strong> Review the recommendation</span>
            </div>
          </div>
          <div className="scenario-card">
            <span className="scenario-label">Scenario</span>
            <div className="scenario-switch" role="group" aria-label="Deployment scenario">
              <button
                className={scenario === "enterprise" ? "scenario-option active" : "scenario-option"}
                onClick={() => changeScenario("enterprise")}
                type="button"
              >
                <span>Enterprise</span>
                <small>Companies and platform teams</small>
              </button>
              <button
                className={scenario === "higher_education" ? "scenario-option active" : "scenario-option"}
                onClick={() => changeScenario("higher_education")}
                type="button"
              >
                <span>Higher Education</span>
                <small>Students, research, and operations</small>
              </button>
            </div>
            <p>{scenarioDetails.description}</p>
            {scenario === "higher_education" ? (
              <div className="pilot-note">
                Illustrative prototype only. Not affiliated with or connected to any university production system.
              </div>
            ) : null}
          </div>
        </section>

        <div className="dashboard-grid">
          <aside className="panel setup-panel">
            <div className="panel-header">
              <span className="section-kicker">Recommendation setup</span>
              <p className="panel-title">What should the model help with?</p>
              <p className="panel-subtitle">Choose a representative workload and set the organization’s priorities.</p>
            </div>
            <div className="panel-body">
              <div className="control-group">
                <label htmlFor="prompt-case">Task</label>
                <select
                  className="select"
                  id="prompt-case"
                  value={selectedPromptId}
                  onChange={(event) => updatePrompt(event.target.value)}
                >
                  {promptCases.map((prompt) => (
                    <option key={prompt.id} value={prompt.id}>
                      {prompt.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="control-group">
                <label htmlFor="prompt-body">Prompt</label>
                <textarea className="textarea" id="prompt-body" value={selectedPrompt.prompt} readOnly />
              </div>

              <button className="text-button" onClick={newPromptCase}>
                New Prompt Case
              </button>

              <div className="control-group">
                <label>Evaluation evidence</label>
                <div className="segmented-control" aria-label="Provider mode">
                  <button
                    className={evalMode === "mock" ? "segment active" : "segment"}
                    type="button"
                    onClick={() => setEvalMode("mock")}
                  >
                    Simulated
                  </button>
                  <button
                    className={evalMode === "live_openai" ? "segment active" : "segment"}
                    type="button"
                    onClick={() => setEvalMode("live_openai")}
                    disabled={scenario === "higher_education"}
                  >
                    Live OpenAI
                  </button>
                </div>
                <p className="helper-text" data-testid="run-message">
                  {runMessage}
                </p>
                <p className="helper-text" data-testid="judge-message">
                  {judgeMessage}
                </p>
              </div>

              <div className={scenario === "higher_education" ? "control-group visually-muted" : "control-group"}>
                <label htmlFor="demo-admin-key">Demo Admin Key</label>
                <input
                  autoComplete="off"
                  className="select"
                  id="demo-admin-key"
                  placeholder="Required for live/admin actions"
                  type="password"
                  value={demoAdminKey}
                  onChange={(event) => updateDemoAdminKey(event.target.value)}
                  disabled={scenario === "higher_education"}
                />
              </div>

              <div className="control-group">
                <label htmlFor="policy-user">Requester</label>
                <select
                  className="select"
                  id="policy-user"
                  value={selectedUserId}
                  onChange={(event) => updatePolicyUser(event.target.value)}
                >
                  {users.map((user) => {
                    const team = teams.find((candidate) => candidate.id === user.teamId);
                    return (
                      <option key={user.id} value={user.id}>
                        {user.name} · {team?.name ?? "Team"}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="control-group">
                <label>Selection behavior</label>
                <div className="segmented-control" aria-label="Selection behavior">
                  <button
                    className={selectionMode === "auto" ? "segment active" : "segment"}
                    type="button"
                    onClick={() => setSelectionMode("auto")}
                  >
                    Auto — Recommended
                  </button>
                  <button
                    className={selectionMode === "manual" ? "segment active" : "segment"}
                    type="button"
                    onClick={() => setSelectionMode("manual")}
                  >
                    Manual choice
                  </button>
                </div>
              </div>

              <div className="control-group">
                <label htmlFor="requested-model">
                  {selectionMode === "auto" ? "Current recommendation" : "Requested model"}
                </label>
                <select
                  className="select"
                  id="requested-model"
                  value={selectionMode === "auto" ? effectiveRequestedModelId : requestedModelId}
                  onChange={(event) => updateRequestedModel(event.target.value)}
                  disabled={selectionMode === "auto"}
                >
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} · {model.provider}
                    </option>
                  ))}
                </select>
                <p className="helper-text" data-testid="policy-message">
                  {policyMessage}
                </p>
              </div>

              <div className="priority-heading">
                <span>Routing priorities</span>
                <button className="text-button" type="button" onClick={() => setWeights(defaultRouterWeights)}>
                  Reset
                </button>
              </div>

              <div className="control-group">
                <label>Quality Weight</label>
                <div className="slider-row">
                  <input
                    aria-label="Quality Weight"
                    type="range"
                    min="1"
                    max="100"
                    value={weights.quality}
                    onChange={(event) => updateWeight("quality", Number(event.target.value))}
                  />
                  <span className="slider-value">{weights.quality}</span>
                </div>
              </div>

              <div className="control-group">
                <label>Cost Weight</label>
                <div className="slider-row">
                  <input
                    aria-label="Cost Weight"
                    type="range"
                    min="1"
                    max="100"
                    value={weights.cost}
                    onChange={(event) => updateWeight("cost", Number(event.target.value))}
                  />
                  <span className="slider-value">{weights.cost}</span>
                </div>
              </div>

              <div className="control-group">
                <label>Latency Weight</label>
                <div className="slider-row">
                  <input
                    aria-label="Latency Weight"
                    type="range"
                    min="1"
                    max="100"
                    value={weights.latency}
                    onChange={(event) => updateWeight("latency", Number(event.target.value))}
                  />
                  <span className="slider-value">{weights.latency}</span>
                </div>
              </div>

              <div className="control-group">
                <label>Context Weight</label>
                <div className="slider-row">
                  <input
                    aria-label="Context Weight"
                    type="range"
                    min="1"
                    max="100"
                    value={weights.context}
                    onChange={(event) => updateWeight("context", Number(event.target.value))}
                  />
                  <span className="slider-value">{weights.context}</span>
                </div>
              </div>

              <button className="primary-button policy-button" onClick={routePolicyRequest} disabled={isRouting}>
                {isRouting
                  ? "Analyzing..."
                  : scenario === "higher_education"
                    ? "Preview Campus Guidance"
                    : "Route Request"}
              </button>
            </div>
          </aside>

          <section>
            <div className="metric-strip">
              <div className="metric">
                <div className="metric-label">Resource tier</div>
                <div className="metric-value resource-marks">{resourceMarks(winner)}</div>
                <div className="metric-note">relative within this model catalog</div>
              </div>
              <div className="metric">
                <div className="metric-label">Recommended Preview</div>
                <div className="metric-value" data-testid="recommended-preview">
                  {winner.name}
                </div>
                <div className="metric-note">updates as weights change</div>
              </div>
              <div className="metric">
                <div className="metric-label">Router Preview</div>
                <div className="metric-value" data-testid="router-preview-score">
                  {decision.routerScore}
                </div>
                <div className="metric-note">not persisted until Run Eval</div>
              </div>
              <div className="metric">
                <div className="metric-label">Budget Alternative</div>
                <div className="metric-value compact-value">{budgetAlternativeModel.name}</div>
                <div className="metric-note">{scenario === "higher_education" ? resourceMarks(budgetAlternativeModel) : currency(bestCost)}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Fastest</div>
                <div className="metric-value">{fastestLatency} ms</div>
                <div className="metric-note">lowest measured latency</div>
              </div>
            </div>

            <div className="main-grid">
              <div className="panel dataset-panel" data-testid="dataset-manager-panel">
                <div className="panel-header">
                  <p className="panel-title">Dataset and Rubric Manager</p>
                  <p className="panel-subtitle">
                    {scenario === "higher_education"
                      ? "Edit the synthetic evaluation case locally. Persistence requires an approved integration."
                      : "Create or update prompt cases that persist to PostgreSQL."}
                  </p>
                </div>
                <div className="panel-body prompt-editor">
                  <div className="form-grid two">
                    <div className="control-group">
                      <label htmlFor="draft-dataset">Dataset</label>
                      <input
                        className="select"
                        id="draft-dataset"
                        value={promptDraft.dataset}
                        onChange={(event) => updatePromptDraft("dataset", event.target.value)}
                      />
                    </div>
                    <div className="control-group">
                      <label htmlFor="draft-title">Title</label>
                      <input
                        className="select"
                        id="draft-title"
                        value={promptDraft.title}
                        onChange={(event) => updatePromptDraft("title", event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-grid three">
                    <div className="control-group">
                      <label htmlFor="draft-task-type">Task Type</label>
                      <select
                        className="select"
                        id="draft-task-type"
                        value={promptDraft.taskType}
                        onChange={(event) => updatePromptDraft("taskType", event.target.value as PromptCase["taskType"])}
                      >
                        <option value="coding">coding</option>
                        <option value="summarization">summarization</option>
                        <option value="reasoning">reasoning</option>
                        <option value="support">support</option>
                      </select>
                    </div>
                    <div className="control-group">
                      <label htmlFor="draft-difficulty">Difficulty</label>
                      <input
                        className="select"
                        id="draft-difficulty"
                        max="100"
                        min="1"
                        type="number"
                        value={promptDraft.difficulty}
                        onChange={(event) => updatePromptDraft("difficulty", Number(event.target.value))}
                      />
                    </div>
                    <div className="control-group">
                      <label htmlFor="draft-input-tokens">Input Tokens</label>
                      <input
                        className="select"
                        id="draft-input-tokens"
                        min="1"
                        type="number"
                        value={promptDraft.inputTokens}
                        onChange={(event) => updatePromptDraft("inputTokens", Number(event.target.value))}
                      />
                    </div>
                  </div>
                  <div className="control-group">
                    <label htmlFor="draft-prompt">Prompt</label>
                    <textarea
                      className="textarea"
                      id="draft-prompt"
                      value={promptDraft.prompt}
                      onChange={(event) => updatePromptDraft("prompt", event.target.value)}
                    />
                  </div>
                  <div className="control-group">
                    <label htmlFor="draft-expected-output">Expected Output</label>
                    <textarea
                      className="textarea compact"
                      id="draft-expected-output"
                      value={promptDraft.expectedOutput}
                      onChange={(event) => updatePromptDraft("expectedOutput", event.target.value)}
                    />
                  </div>
                  <div className="rubric-editor">
                    {promptDraft.rubric.map((criterion, index) => (
                      <div className="rubric-edit-row" key={`${criterion.name}-${index}`}>
                        <input
                          className="select"
                          value={criterion.name}
                          onChange={(event) => updateRubricCriterion(index, { name: event.target.value })}
                        />
                        <input
                          className="select"
                          min="0.05"
                          step="0.05"
                          type="number"
                          value={criterion.weight}
                          onChange={(event) => updateRubricCriterion(index, { weight: Number(event.target.value) })}
                        />
                        <input
                          className="select"
                          value={criterion.description}
                          onChange={(event) => updateRubricCriterion(index, { description: event.target.value })}
                        />
                        <button
                          aria-label={`Remove ${criterion.name || "rubric"} criterion`}
                          className="icon-button"
                          title="Remove rubric criterion"
                          type="button"
                          onClick={() => removeRubricCriterion(index)}
                        >
                          -
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="editor-actions">
                    <button className="secondary-button" type="button" onClick={addRubricCriterion}>
                      Add Criterion
                    </button>
                    <button className="primary-button" type="button" onClick={savePromptCase} disabled={isSavingPrompt}>
                      {isSavingPrompt ? "Saving..." : "Save Prompt"}
                    </button>
                  </div>
                  <p className="helper-text">{promptMessage}</p>
                </div>
              </div>

              <div className="panel savings-panel" data-testid="savings-report-panel">
                <div className="panel-header">
                  <p className="panel-title">Savings Report</p>
                  <p className="panel-subtitle">Organization-wide resource governance across policy decisions.</p>
                </div>
                <div className="panel-body recommendation">
                  <div className="policy-stats">
                    <div>
                      <span>Requested</span>
                      <strong>{currency(scenario === "higher_education" ? shadowRequestedCost : savingsReport?.totalRequestedCostUsd ?? 0)}</strong>
                    </div>
                    <div>
                      <span>Routed</span>
                      <strong>{currency(scenario === "higher_education" ? shadowRoutedCost : savingsReport?.totalRoutedCostUsd ?? 0)}</strong>
                    </div>
                    <div>
                      <span>Decisions</span>
                      <strong>{scenario === "higher_education" ? recentPolicyDecisions.length : savingsReport?.decisionCount ?? 0}</strong>
                    </div>
                  </div>
                  <div className="action-grid">
                    <div>
                      <span className="mini-action allow">allow</span>
                      <strong>{actionCount("allow")}</strong>
                    </div>
                    <div>
                      <span className="mini-action block">block</span>
                      <strong>{actionCount("block")}</strong>
                    </div>
                    <div>
                      <span className="mini-action downgrade">downgrade</span>
                      <strong>{actionCount("downgrade")}</strong>
                    </div>
                    <div>
                      <span className="mini-action escalate">escalate</span>
                      <strong>{actionCount("escalate")}</strong>
                    </div>
                  </div>
                  {scenario === "higher_education" ? (
                    <div className="savings-callout">
                      <span>Illustrative resource savings</span>
                      <strong>{currency(shadowSavings)}</strong>
                      <small>Calculated from synthetic shadow-mode decisions only.</small>
                    </div>
                  ) : (
                    <div className="export-row">
                      <a className="secondary-link" href="/api/reports/savings" target="_blank">
                        Export JSON
                      </a>
                      <a className="secondary-link" href="/api/reports/savings?format=csv">
                        Export CSV
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="panel comparison-panel" data-testid="model-comparison-panel">
                <div className="panel-header">
                  <p className="panel-title">Model Comparison</p>
                  <p className="panel-subtitle">
                    Average quality: {averageQuality.toFixed(1)}/100 · {scenario === "higher_education" ? "synthetic estimates" : "latest evaluation"}
                  </p>
                </div>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Model</th>
                        <th>Quality</th>
                        <th>Score Source</th>
                        <th>Latency</th>
                        <th>Resources</th>
                        <th>Context</th>
                        <th>Strengths</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestResults.map((result) => {
                        const model = models.find((candidate) => candidate.id === result.modelId) ?? models[0];
                        return (
                          <tr key={result.id}>
                            <td>
                              <strong>{model.name}</strong>
                              <div className="provider">{model.provider}</div>
                            </td>
                            <td>
                              <strong>{result.score}</strong>
                              <div className="bar-track">
                                <div className="bar-fill" style={{ width: percent(result.score) }} />
                              </div>
                            </td>
                            <td>
                              <span className={`source-badge ${result.scoreSource}`}>
                                {result.scoreSource === "llm_judge" ? "LLM judge" : "simulated"}
                              </span>
                            </td>
                            <td>{result.latencyMs.toLocaleString()} ms</td>
                            <td>
                              <strong className="resource-cell">{resourceMarks(model)}</strong>
                              <div className="provider">
                                {scenario === "higher_education" ? "relative tier" : currency(result.totalCostUsd)}
                              </div>
                            </td>
                            <td>{model.contextWindow.toLocaleString()}</td>
                            <td>
                              <div className="tag-row">
                                {model.strengths.map((strength) => (
                                  <span className="tag" key={strength}>
                                    {strength}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="panel recommendation-panel" data-testid="router-preview-panel">
                <div className="panel-header">
                  <span className="section-kicker">Auto — Recommended</span>
                  <p className="panel-title">Explainable Model Recommendation</p>
                  <p className="panel-subtitle">
                    Updates instantly as the task and priorities change. Manual override always remains available.
                  </p>
                </div>
                <div className="panel-body recommendation">
                  <div className="recommendation-head">
                    <div>
                      <div className="badge-row">
                        <span className="model-badge">{winner.provider}</span>
                        <span className="evidence-badge">
                          {scenario === "higher_education"
                            ? "Synthetic estimate"
                            : evalMode === "mock"
                              ? "Simulated"
                              : "Live evidence"}
                        </span>
                      </div>
                      <h2>{winner.name}</h2>
                      <p className="panel-subtitle">
                        {winner.bestFor ?? `Best fit for ${selectedPrompt.taskType}`} · difficulty {selectedPrompt.difficulty}/100
                      </p>
                    </div>
                    <div className="recommendation-score">
                      <span>Fit score</span>
                      <strong>{decision.routerScore}</strong>
                      <small>{resourceMarks(winner)} resources</small>
                    </div>
                  </div>
                  <ul className="reason-list">
                    {decision.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                  <div className="alternative-grid">
                    <article>
                      <span>Lower-resource option</span>
                      <strong>{budgetAlternativeModel.name}</strong>
                      <small>{resourceMarks(budgetAlternativeModel)} · {budgetAlternative?.score ?? 0}/100 quality</small>
                    </article>
                    <article>
                      <span>Highest-quality option</span>
                      <strong>{qualityAlternativeModel.name}</strong>
                      <small>{resourceMarks(qualityAlternativeModel)} · {qualityAlternative?.score ?? 0}/100 quality</small>
                    </article>
                  </div>
                  <div>
                    <p className="panel-title">Evaluation sample</p>
                    <pre className="output-box mono">{winnerResult.output}</pre>
                    {winnerResult.judgeExplanation ? (
                      <p className="judge-note">{winnerResult.judgeExplanation}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="panel policy-panel" data-testid="saved-policy-decision-panel">
                <div className="panel-header">
                  <p className="panel-title">Saved Policy Decision</p>
                  <p className="panel-subtitle">
                    {policyDecision
                      ? `${policyDecisionUser?.name ?? "Requester"} · ${policyDecisionTeam?.name ?? "Team"} · ${
                          policyDecisionRequestedModel?.name ?? "Requested model"
                        } requested`
                      : `${selectedUser.name} · ${selectedTeam.name} · ${effectiveRequestedModel.name} ready to preview`}
                  </p>
                </div>
                <div className="panel-body recommendation">
                  {hasUnsavedPolicyInputs ? (
                    <div className="notice-banner" data-testid="unsaved-policy-banner">
                      Controls changed after this decision. Preview again to update the result.
                    </div>
                  ) : null}
                  {policyDecision ? (
                    <>
                      <div className="recommendation-head">
                        <div>
                          <span className={`action-badge ${policyDecision.action}`}>{policyDecision.action}</span>
                          <h2>{policySelectedModel?.name ?? "Blocked"}</h2>
                          <p className="panel-subtitle">
                            {categoryLabel(policyDecision.category)} · complexity {policyDecision.complexityScore}/100
                          </p>
                        </div>
                        <div className="score-large">{currency(policyDecision.savingsUsd)}</div>
                      </div>
                      <div className="policy-stats">
                        <div>
                          <span>Requested</span>
                          <strong>{currency(policyDecision.estimatedRequestedCostUsd)}</strong>
                        </div>
                        <div>
                          <span>Routed</span>
                          <strong>{currency(policyDecision.estimatedRoutedCostUsd)}</strong>
                        </div>
                        <div>
                          <span>Budget Left</span>
                          <strong>{currency(policyDecision.budgetRemainingUsd)}</strong>
                        </div>
                      </div>
                      <ul className="reason-list">
                        {policyDecision.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="panel-subtitle">Preview guidance to create the first explainable policy decision.</p>
                  )}
                </div>
              </div>

              <div className="panel rubric-panel">
                <div className="panel-header">
                  <p className="panel-title">Rubric Scores</p>
                  <p className="panel-subtitle">{selectedPrompt.expectedOutput}</p>
                </div>
                <div className="panel-body rubric-grid">
                  {selectedPrompt.rubric.map((criterion) => (
                    <div className="rubric-item" key={criterion.name}>
                      <strong>{criterion.name}</strong>
                      <div>
                        <div className="bar-track">
                          <div
                            className="bar-fill"
                            style={{ width: percent(winnerResult.rubricScores[criterion.name] ?? 0) }}
                          />
                        </div>
                        <div className="run-meta">{criterion.description}</div>
                      </div>
                      <strong>{winnerResult.rubricScores[criterion.name] ?? 0}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel history-panel">
                <div className="panel-header">
                  <p className="panel-title">Recent Runs</p>
                  <p className="panel-subtitle">Last 10 eval results across model and prompt cases.</p>
                </div>
                <div className="panel-body">
                  {history.slice(0, 6).map((run) => {
                    const model = models.find((candidate) => candidate.id === run.modelId) ?? models[0];
                    const prompt = promptCases.find((candidate) => candidate.id === run.promptId) ?? promptCases[0];
                    return (
                      <article className="run-card" key={run.id}>
                        <div className="run-title">
                          <span>{prompt.title}</span>
                          <span>{run.score}</span>
                        </div>
                        <div className="run-meta">
                          {model.name} · {run.latencyMs.toLocaleString()} ms · {currency(run.totalCostUsd)}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="panel audit-panel">
                <div className="panel-header">
                  <p className="panel-title">Policy Audit Log</p>
                  <p className="panel-subtitle">Recent organization policy and guidance decisions.</p>
                </div>
                <div className="panel-body">
                  {recentPolicyDecisions.slice(0, 6).map((decision) => {
                    const user = users.find((candidate) => candidate.id === decision.userId);
                    const selected = models.find((candidate) => candidate.id === decision.selectedModelId);
                    return (
                      <article className="run-card" key={decision.id}>
                        <div className="run-title">
                          <span>{user?.name ?? "Requester"}</span>
                          <span className={`mini-action ${decision.action}`}>{decision.action}</span>
                        </div>
                        <div className="run-meta">
                          {selected?.name ?? "Blocked"} · {categoryLabel(decision.category)} · saved{" "}
                          {currency(decision.savingsUsd)}
                        </div>
                      </article>
                    );
                  })}
                  {recentPolicyDecisions.length === 0 ? <p className="panel-subtitle">No policy decisions yet.</p> : null}
                </div>
              </div>

              <div className="panel budget-panel">
                <div className="panel-header">
                  <p className="panel-title">Team Budget Utilization</p>
                  <p className="panel-subtitle">Spend, budget, and savings by team.</p>
                </div>
                <div className="panel-body">
                  {(scenario === "higher_education"
                    ? teams.map((team) => ({
                        teamId: team.id,
                        teamName: team.name,
                        monthlyBudgetUsd: team.monthlyBudgetUsd,
                        currentSpendUsd: team.currentSpendUsd,
                        savingsUsd: recentPolicyDecisions
                          .filter((item) => item.teamId === team.id)
                          .reduce((sum, item) => sum + item.savingsUsd, 0),
                        budgetUsedPercent: Math.round((team.currentSpendUsd / team.monthlyBudgetUsd) * 100),
                        decisionCount: recentPolicyDecisions.filter((item) => item.teamId === team.id).length,
                      }))
                    : savingsReport?.teamSummaries ?? []
                  ).map((team) => (
                    <article className="team-budget" key={team.teamId}>
                      <div className="run-title">
                        <span>{team.teamName}</span>
                        <span>{team.budgetUsedPercent}%</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: percent(Math.min(team.budgetUsedPercent, 100)) }} />
                      </div>
                      <div className="run-meta">
                        {currency(team.currentSpendUsd)} used of {currency(team.monthlyBudgetUsd)} · saved{" "}
                        {currency(team.savingsUsd)} across {team.decisionCount} decisions
                      </div>
                    </article>
                  ))}
                  {scenario === "enterprise" && !savingsReport ? (
                    <p className="panel-subtitle">Savings report unavailable until the API responds.</p>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
