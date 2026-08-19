"use client";

import { useEffect, useMemo, useState } from "react";
import { models as seedModels, promptCases as seedPromptCases, seedRunHistory } from "@/lib/data";
import { runMockEval } from "@/lib/mockEval";
import { defaultRouterWeights, recommendModel } from "@/lib/router";
import type { BootstrapPayload, EvalResult, EvalRunPayload, ModelProfile, PromptCase, RouterWeights } from "@/lib/types";

function currency(value: number) {
  return `$${value.toFixed(5)}`;
}

function percent(value: number) {
  return `${Math.round(value)}%`;
}

export default function Home() {
  const [models, setModels] = useState<ModelProfile[]>(seedModels);
  const [promptCases, setPromptCases] = useState<PromptCase[]>(seedPromptCases);
  const [selectedPromptId, setSelectedPromptId] = useState(seedPromptCases[0].id);
  const [weights, setWeights] = useState<RouterWeights>(defaultRouterWeights);
  const [latestResults, setLatestResults] = useState<EvalResult[]>(() => runMockEval(seedPromptCases[0], seedModels));
  const [history, setHistory] = useState<EvalResult[]>(seedRunHistory);
  const [dataSource, setDataSource] = useState<"seed" | "database">("seed");
  const [isRunning, setIsRunning] = useState(false);

  const selectedPrompt = promptCases.find((prompt) => prompt.id === selectedPromptId) ?? promptCases[0] ?? seedPromptCases[0];
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
        setSelectedPromptId(initialPrompt.id);
        setLatestResults(runMockEval(initialPrompt, payload.models));
        setHistory(payload.recentResults);
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

  async function runEval() {
    setIsRunning(true);
    try {
      const response = await fetch("/api/eval-runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promptId: selectedPrompt.id,
          weights,
        }),
      });

      if (!response.ok) {
        throw new Error("Eval API unavailable");
      }

      const payload = (await response.json()) as EvalRunPayload;
      setLatestResults(payload.results);
      setHistory((current) => [...payload.results, ...current].slice(0, 10));
      setDataSource("database");
    } catch {
      const nextResults = runMockEval(selectedPrompt, models);
      setLatestResults(nextResults);
      setHistory((current) => [...nextResults, ...current].slice(0, 10));
      setDataSource("seed");
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
            <span className="status-pill">Mock providers active</span>
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
                  <p className="panel-subtitle">
                    Average quality for this run: {averageQuality.toFixed(1)}/100
                  </p>
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
                  <p className="panel-subtitle">Last 10 mocked eval results across model and prompt cases.</p>
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
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
