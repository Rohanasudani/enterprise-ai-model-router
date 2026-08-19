"use client";

import { useEffect, useMemo, useState } from "react";
import {
  models as seedModels,
  promptCases as seedPromptCases,
  seedRunHistory,
  teams as seedTeams,
  users as seedUsers,
} from "@/lib/data";
import { runMockEval } from "@/lib/mockEval";
import { defaultRouterWeights, recommendModel } from "@/lib/router";
import type {
  AppUser,
  BootstrapPayload,
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

function categoryLabel(value: string) {
  return value.replaceAll("_", " ");
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

export default function Home() {
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
  const [isRunning, setIsRunning] = useState(false);
  const [isJudging, setIsJudging] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [runMessage, setRunMessage] = useState("Ready to run model comparison.");
  const [judgeMessage, setJudgeMessage] = useState("Run an eval, then judge the saved outputs.");
  const [policyMessage, setPolicyMessage] = useState("Ready to route enterprise request.");
  const [promptMessage, setPromptMessage] = useState("Edit an existing prompt case or create a new dataset item.");

  const selectedPrompt = promptCases.find((prompt) => prompt.id === selectedPromptId) ?? promptCases[0] ?? seedPromptCases[0];
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? users[0] ?? seedUsers[0];
  const selectedTeam = teams.find((team) => team.id === selectedUser.teamId) ?? teams[0] ?? seedTeams[0];
  const requestedModel = models.find((model) => model.id === requestedModelId) ?? models[0];
  const policySelectedModel = policyDecision
    ? models.find((model) => model.id === policyDecision.selectedModelId)
    : undefined;
  const decision = useMemo(
    () => recommendModel(selectedPrompt, latestResults, weights, models),
    [latestResults, selectedPrompt, weights, models],
  );
  const winner = models.find((model) => model.id === decision.modelId) ?? models[0];
  const winnerResult = latestResults.find((result) => result.modelId === winner.id) ?? latestResults[0];
  const averageQuality = latestResults.reduce((sum, result) => sum + result.score, 0) / latestResults.length;
  const bestCost = Math.min(...latestResults.map((result) => result.totalCostUsd));
  const fastestLatency = Math.min(...latestResults.map((result) => result.latencyMs));

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
    async function loadBootstrapData() {
      try {
        const response = await fetch("/api/bootstrap");
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
        setDataSource("database");
      } catch {
        setDataSource("seed");
      }
    }

    void loadBootstrapData();
  }, []);

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
    setPromptMessage("Saving prompt case to PostgreSQL...");
    try {
      const response = await fetch("/api/prompt-cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(promptDraft),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorPayload?.error ?? "Prompt save failed");
      }

      const payload = (await response.json()) as PromptCasePayload;
      setPromptCases((current) => {
        const exists = current.some((prompt) => prompt.id === payload.promptCase.id);
        return exists
          ? current.map((prompt) => (prompt.id === payload.promptCase.id ? payload.promptCase : prompt))
          : [...current, payload.promptCase];
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
    setPolicyMessage("Routing request through enterprise policy...");
    try {
      const response = await fetch("/api/policy-decisions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promptId: selectedPrompt.id,
          userId: selectedUser.id,
          requestedModelId,
        }),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorPayload?.error ?? "Policy route failed");
      }

      const payload = (await response.json()) as PolicyDecisionPayload;
      setPolicyDecision(payload.decision);
      setRecentPolicyDecisions((current) => [payload.decision, ...current].slice(0, 10));
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
    } catch (error) {
      setPolicyMessage(error instanceof Error ? error.message : "Policy route failed.");
    } finally {
      setIsRouting(false);
    }
  }

  async function runEval() {
    setIsRunning(true);
    setRunMessage(evalMode === "live_openai" ? "Running live OpenAI eval..." : "Running mock eval...");
    try {
      const response = await fetch("/api/eval-runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
      setDataSource("database");
      setRunMessage(payload.mode === "live_openai" ? "Live OpenAI eval saved to PostgreSQL." : "Mock eval saved to PostgreSQL.");
    } catch (error) {
      const nextResults = runMockEval(selectedPrompt, models);
      setLatestResults(nextResults);
      setHistory((current) => [...nextResults, ...current].slice(0, 10));
      setDataSource("seed");
      setRunMessage(error instanceof Error ? `${error.message}. Showing mock fallback.` : "Eval failed. Showing mock fallback.");
    } finally {
      setIsRunning(false);
    }
  }

  async function judgeLatestResults() {
    setIsJudging(true);
    setJudgeMessage("Judging latest saved outputs against the rubric...");
    try {
      const response = await fetch("/api/judge-results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-mark">MR</div>
            <div>
              <h1>AI Model Router</h1>
              <p>Eval-driven model selection for cost, quality, latency, and context fit</p>
            </div>
          </div>
          <div className="top-actions">
            <span className="status-pill">{dataSource === "database" ? "PostgreSQL connected" : "Seed fallback"}</span>
            <span className="status-pill">{evalMode === "live_openai" ? "Live OpenAI mode" : "Mock mode"}</span>
            <span className="status-pill">{models.length} models</span>
            <span className="status-pill">{promptCases.length} prompt cases</span>
            <button className="secondary-button" onClick={judgeLatestResults} disabled={isJudging}>
              {isJudging ? "Judging..." : "Judge Latest"}
            </button>
            <button className="primary-button" onClick={runEval} disabled={isRunning}>
              {isRunning ? "Running..." : "Run Eval"}
            </button>
          </div>
        </div>
      </header>

      <div className="content">
        <div className="dashboard-grid">
          <aside className="panel">
            <div className="panel-header">
              <p className="panel-title">Eval Setup</p>
              <p className="panel-subtitle">Choose a prompt case and tune the router priorities.</p>
            </div>
            <div className="panel-body">
              <div className="control-group">
                <label htmlFor="prompt-case">Prompt Case</label>
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

              <button className="secondary-button" onClick={newPromptCase}>
                New Prompt Case
              </button>

              <div className="control-group">
                <label>Provider Mode</label>
                <div className="segmented-control" aria-label="Provider mode">
                  <button
                    className={evalMode === "mock" ? "segment active" : "segment"}
                    type="button"
                    onClick={() => setEvalMode("mock")}
                  >
                    Mock
                  </button>
                  <button
                    className={evalMode === "live_openai" ? "segment active" : "segment"}
                    type="button"
                    onClick={() => setEvalMode("live_openai")}
                  >
                    Live OpenAI
                  </button>
                </div>
                <p className="helper-text">{runMessage}</p>
                <p className="helper-text">{judgeMessage}</p>
              </div>

              <div className="control-group">
                <label htmlFor="policy-user">Requester</label>
                <select
                  className="select"
                  id="policy-user"
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
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
                <label htmlFor="requested-model">Requested Model</label>
                <select
                  className="select"
                  id="requested-model"
                  value={requestedModelId}
                  onChange={(event) => setRequestedModelId(event.target.value)}
                >
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} · {model.provider}
                    </option>
                  ))}
                </select>
                <p className="helper-text">{policyMessage}</p>
              </div>

              <div className="control-group">
                <label>Quality Weight</label>
                <div className="slider-row">
                  <input
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
                    type="range"
                    min="1"
                    max="100"
                    value={weights.context}
                    onChange={(event) => updateWeight("context", Number(event.target.value))}
                  />
                  <span className="slider-value">{weights.context}</span>
                </div>
              </div>

              <button className="secondary-button" onClick={() => setWeights(defaultRouterWeights)}>
                Reset Weights
              </button>
              <button className="primary-button policy-button" onClick={routePolicyRequest} disabled={isRouting}>
                {isRouting ? "Routing..." : "Route Request"}
              </button>
            </div>
          </aside>

          <section>
            <div className="metric-strip">
              <div className="metric">
                <div className="metric-label">Savings</div>
                <div className="metric-value">{currency(savingsReport?.totalSavingsUsd ?? 0)}</div>
                <div className="metric-note">{savingsReport?.savingsPercent ?? 0}% saved by policy</div>
              </div>
              <div className="metric">
                <div className="metric-label">Recommended</div>
                <div className="metric-value">{winner.name}</div>
                <div className="metric-note">{winner.provider}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Router Score</div>
                <div className="metric-value">{decision.routerScore}</div>
                <div className="metric-note">weighted decision score</div>
              </div>
              <div className="metric">
                <div className="metric-label">Best Cost</div>
                <div className="metric-value">{currency(bestCost)}</div>
                <div className="metric-note">lowest eval run cost</div>
              </div>
              <div className="metric">
                <div className="metric-label">Fastest</div>
                <div className="metric-value">{fastestLatency} ms</div>
                <div className="metric-note">lowest measured latency</div>
              </div>
            </div>

            <div className="main-grid">
              <div className="panel">
                <div className="panel-header">
                  <p className="panel-title">Dataset and Rubric Manager</p>
                  <p className="panel-subtitle">Create or update prompt cases that persist to PostgreSQL.</p>
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
                        <button className="icon-button" type="button" onClick={() => removeRubricCriterion(index)}>
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

              <div className="panel">
                <div className="panel-header">
                  <p className="panel-title">Savings Report</p>
                  <p className="panel-subtitle">Enterprise spend governance across policy-routed requests.</p>
                </div>
                <div className="panel-body recommendation">
                  <div className="policy-stats">
                    <div>
                      <span>Requested</span>
                      <strong>{currency(savingsReport?.totalRequestedCostUsd ?? 0)}</strong>
                    </div>
                    <div>
                      <span>Routed</span>
                      <strong>{currency(savingsReport?.totalRoutedCostUsd ?? 0)}</strong>
                    </div>
                    <div>
                      <span>Decisions</span>
                      <strong>{savingsReport?.decisionCount ?? 0}</strong>
                    </div>
                  </div>
                  <div className="action-grid">
                    <div>
                      <span className="mini-action allow">allow</span>
                      <strong>{savingsReport?.actionCounts.allow ?? 0}</strong>
                    </div>
                    <div>
                      <span className="mini-action block">block</span>
                      <strong>{savingsReport?.actionCounts.block ?? 0}</strong>
                    </div>
                    <div>
                      <span className="mini-action downgrade">downgrade</span>
                      <strong>{savingsReport?.actionCounts.downgrade ?? 0}</strong>
                    </div>
                    <div>
                      <span className="mini-action escalate">escalate</span>
                      <strong>{savingsReport?.actionCounts.escalate ?? 0}</strong>
                    </div>
                  </div>
                  <div className="export-row">
                    <a className="secondary-link" href="/api/reports/savings" target="_blank">
                      Export JSON
                    </a>
                    <a className="secondary-link" href="/api/reports/savings?format=csv">
                      Export CSV
                    </a>
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <p className="panel-title">Model Comparison</p>
                  <p className="panel-subtitle">Average quality for this run: {averageQuality.toFixed(1)}/100</p>
                </div>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Model</th>
                        <th>Quality</th>
                        <th>Score Source</th>
                        <th>Latency</th>
                        <th>Cost</th>
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
                                {result.scoreSource === "llm_judge" ? "LLM judge" : "heuristic"}
                              </span>
                            </td>
                            <td>{result.latencyMs.toLocaleString()} ms</td>
                            <td>{currency(result.totalCostUsd)}</td>
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

              <div className="panel">
                <div className="panel-header">
                  <p className="panel-title">Router Decision</p>
                  <p className="panel-subtitle">Explainable selection based on your current weights.</p>
                </div>
                <div className="panel-body recommendation">
                  <div className="recommendation-head">
                    <div>
                      <span className="model-badge">{winner.provider}</span>
                      <h2>{winner.name}</h2>
                      <p className="panel-subtitle">
                        Best fit for {selectedPrompt.taskType} with difficulty {selectedPrompt.difficulty}/100.
                      </p>
                    </div>
                    <div className="score-large">{decision.routerScore}</div>
                  </div>
                  <ul className="reason-list">
                    {decision.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                  <div>
                    <p className="panel-title">Winning Output</p>
                    <pre className="output-box mono">{winnerResult.output}</pre>
                    {winnerResult.judgeExplanation ? (
                      <p className="judge-note">{winnerResult.judgeExplanation}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <p className="panel-title">Enterprise Policy Decision</p>
                  <p className="panel-subtitle">
                    {selectedUser.name} · {selectedTeam.name} · {requestedModel.name} requested
                  </p>
                </div>
                <div className="panel-body recommendation">
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
                    <p className="panel-subtitle">Run a policy route to create the first audit decision.</p>
                  )}
                </div>
              </div>

              <div className="panel">
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

              <div className="panel">
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

              <div className="panel">
                <div className="panel-header">
                  <p className="panel-title">Policy Audit Log</p>
                  <p className="panel-subtitle">Recent enterprise routing decisions.</p>
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

              <div className="panel">
                <div className="panel-header">
                  <p className="panel-title">Team Budget Utilization</p>
                  <p className="panel-subtitle">Spend, budget, and savings by team.</p>
                </div>
                <div className="panel-body">
                  {(savingsReport?.teamSummaries ?? []).map((team) => (
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
                  {!savingsReport ? <p className="panel-subtitle">Savings report unavailable until the API responds.</p> : null}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
