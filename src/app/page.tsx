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
  ModelProfile,
  PolicyDecision,
  PolicyDecisionPayload,
  PromptCase,
  RouterWeights,
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

export default function Home() {
  const [models, setModels] = useState<ModelProfile[]>(seedModels);
  const [promptCases, setPromptCases] = useState<PromptCase[]>(seedPromptCases);
  const [teams, setTeams] = useState<Team[]>(seedTeams);
  const [users, setUsers] = useState<AppUser[]>(seedUsers);
  const [selectedPromptId, setSelectedPromptId] = useState(seedPromptCases[0].id);
  const [selectedUserId, setSelectedUserId] = useState(seedUsers[0].id);
  const [requestedModelId, setRequestedModelId] = useState(seedModels[0].id);
  const [weights, setWeights] = useState<RouterWeights>(defaultRouterWeights);
  const [latestResults, setLatestResults] = useState<EvalResult[]>(() => runMockEval(seedPromptCases[0], seedModels));
  const [history, setHistory] = useState<EvalResult[]>(seedRunHistory);
  const [recentPolicyDecisions, setRecentPolicyDecisions] = useState<PolicyDecision[]>([]);
  const [policyDecision, setPolicyDecision] = useState<PolicyDecision | null>(null);
  const [dataSource, setDataSource] = useState<"seed" | "database">("seed");
  const [evalMode, setEvalMode] = useState<EvalMode>("mock");
  const [isRunning, setIsRunning] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [runMessage, setRunMessage] = useState("Ready to run model comparison.");
  const [policyMessage, setPolicyMessage] = useState("Ready to route enterprise request.");

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
        setSelectedUserId(payload.users[0]?.id ?? seedUsers[0].id);
        setRequestedModelId(payload.models[0]?.id ?? seedModels[0].id);
        setLatestResults(runMockEval(initialPrompt, payload.models));
        setHistory(payload.recentResults);
        setRecentPolicyDecisions(payload.recentPolicyDecisions);
        setPolicyDecision(payload.recentPolicyDecisions[0] ?? null);
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
    setLatestResults(runMockEval(nextPrompt, models));
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
                  <p className="panel-title">Model Comparison</p>
                  <p className="panel-subtitle">Average quality for this run: {averageQuality.toFixed(1)}/100</p>
                </div>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Model</th>
                        <th>Quality</th>
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
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
