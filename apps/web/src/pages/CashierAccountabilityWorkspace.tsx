import { useEffect, useMemo, useState } from "react";
import {
  getCashierAccountabilityReport,
  type CashierAccountabilityReportEntry,
  type CashierAccountabilityReportOperator,
  type CashierAccountabilityReportResponse
} from "../api";
import type { WorkspaceId } from "../types";

interface CashierAccountabilityWorkspaceProps {
  storeId: string;
  storeName: string;
}

const workspaceLabels: Record<WorkspaceId, string> = {
  desktop: "Desktop",
  sales: "Sales",
  service: "Service",
  parts: "Parts",
  analytics: "Analytics",
  website: "Website",
  audit: "Audit",
  reports: "Reports",
  boatInventory: "Inventory"
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric"
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit"
});

function formatDateInput(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string) {
  const [year, month, day] = value.split("-").map((segment) => Number(segment));
  return dateFormatter.format(new Date(year, month - 1, day));
}

function formatDisplayDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function formatWorkspaceLabel(workspaceId: WorkspaceId) {
  return workspaceLabels[workspaceId] ?? workspaceId;
}

function getDefaultStartDate() {
  const value = new Date();
  value.setDate(value.getDate() - 1);
  return formatDateInput(value);
}

function getToneLabel(entry: CashierAccountabilityReportEntry) {
  return entry.tone === "attention"
    ? "Needs review"
    : entry.tone === "accent"
      ? "Important"
      : entry.tone === "neutral"
        ? "Tracked"
        : "Completed";
}

function buildWorkspaceTotals(entries: CashierAccountabilityReportEntry[]) {
  const totals = new Map<WorkspaceId, number>();

  for (const entry of entries) {
    totals.set(entry.workspaceId, (totals.get(entry.workspaceId) ?? 0) + 1);
  }

  return Array.from(totals.entries())
    .map(([workspaceId, count]) => ({ workspaceId, count }))
    .sort((left, right) => right.count - left.count || formatWorkspaceLabel(left.workspaceId).localeCompare(formatWorkspaceLabel(right.workspaceId)));
}

function buildDailyRows(entries: CashierAccountabilityReportEntry[]) {
  const rows = new Map<string, { date: string; activityCount: number; operatorKeys: Set<string>; workspaceCounts: Map<WorkspaceId, number> }>();

  for (const entry of entries) {
    const date = entry.occurredAt.slice(0, 10);
    const currentRow = rows.get(date) ?? {
      date,
      activityCount: 0,
      operatorKeys: new Set<string>(),
      workspaceCounts: new Map<WorkspaceId, number>()
    };

    currentRow.activityCount += 1;
    currentRow.operatorKeys.add(entry.operatorKey);
    currentRow.workspaceCounts.set(entry.workspaceId, (currentRow.workspaceCounts.get(entry.workspaceId) ?? 0) + 1);
    rows.set(date, currentRow);
  }

  return Array.from(rows.values())
    .map((row) => {
      const busiestWorkspace = Array.from(row.workspaceCounts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
      return {
        date: row.date,
        activityCount: row.activityCount,
        operatorCount: row.operatorKeys.size,
        busiestWorkspace
      };
    })
    .sort((left, right) => right.date.localeCompare(left.date));
}

export function CashierAccountabilityWorkspace({ storeId, storeName }: CashierAccountabilityWorkspaceProps) {
  const [startDate, setStartDate] = useState(() => getDefaultStartDate());
  const [endDate, setEndDate] = useState(() => formatDateInput(new Date()));
  const [report, setReport] = useState<CashierAccountabilityReportResponse | null>(null);
  const [selectedOperatorKeys, setSelectedOperatorKeys] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function loadReport(preserveSelection: boolean) {
    if (startDate > endDate) {
      setErrorMessage("Start date must be on or before the end date.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextReport = await getCashierAccountabilityReport(storeId, startDate, endDate);
      setReport(nextReport);
      setSelectedOperatorKeys((current) => {
        const nextOperatorKeys = nextReport.operators.map((operator) => operator.operatorKey);

        if (!preserveSelection) {
          return nextOperatorKeys;
        }

        const nextKeySet = new Set(nextOperatorKeys);
        const preservedKeys = current.filter((operatorKey) => nextKeySet.has(operatorKey));

        return preservedKeys.length > 0 || nextOperatorKeys.length === 0 ? preservedKeys : nextOperatorKeys;
      });
    } catch (error) {
      setReport(null);
      setSelectedOperatorKeys([]);
      setErrorMessage(error instanceof Error ? error.message : "Unable to load cashier accountability data.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadReport(false);
  }, [storeId]);

  const selectedOperatorKeySet = useMemo(() => new Set(selectedOperatorKeys), [selectedOperatorKeys]);
  const operators = report?.operators ?? [];
  const filteredOperators = useMemo(
    () => operators.filter((operator) => selectedOperatorKeySet.has(operator.operatorKey)),
    [operators, selectedOperatorKeySet]
  );
  const filteredEntries = useMemo(
    () => (report?.entries ?? []).filter((entry) => selectedOperatorKeySet.has(entry.operatorKey)),
    [report, selectedOperatorKeySet]
  );
  const workspaceTotals = useMemo(() => buildWorkspaceTotals(filteredEntries), [filteredEntries]);
  const dailyRows = useMemo(() => buildDailyRows(filteredEntries), [filteredEntries]);
  const summary = useMemo(() => {
    const activeDayCount = new Set(filteredEntries.map((entry) => entry.occurredAt.slice(0, 10))).size;
    const latestActivity = filteredEntries[0] ?? null;

    return {
      operatorCount: filteredOperators.length,
      activityCount: filteredEntries.length,
      activeDayCount,
      latestActivity
    };
  }, [filteredEntries, filteredOperators.length]);

  function toggleOperator(operatorKey: string) {
    setSelectedOperatorKeys((current) =>
      current.includes(operatorKey) ? current.filter((currentKey) => currentKey !== operatorKey) : [...current, operatorKey]
    );
  }

  function toggleAllOperators(nextValue: boolean) {
    setSelectedOperatorKeys(nextValue ? operators.map((operator) => operator.operatorKey) : []);
  }

  return (
    <div className="cashier-accountability-page">
      <section className="cashier-accountability-hero">
        <div>
          <h2>Cashier Accountability</h2>
          <p>
            Pull store activity by date range, identify every operator with captured activity, then review what was done during that window.
          </p>
        </div>
        <div className="cashier-accountability-hero-meta">
          <span>{storeName}</span>
          <strong>
            {formatDisplayDate(startDate)} to {formatDisplayDate(endDate)}
          </strong>
        </div>
      </section>

      <section className="cashier-accountability-controls">
        <label className="cashier-accountability-field">
          <span>From Date</span>
          <input max={endDate} onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
        </label>
        <label className="cashier-accountability-field">
          <span>Through Date</span>
          <input min={startDate} onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
        </label>
        <button className="cashier-accountability-button" disabled={isLoading} onClick={() => void loadReport(true)} type="button">
          {isLoading ? "Finding Matching Data..." : "Find Matching Data"}
        </button>
        {errorMessage ? <div className="cashier-accountability-error">{errorMessage}</div> : null}
      </section>

      <div className="cashier-accountability-layout">
        <aside className="cashier-accountability-operators">
          <div className="cashier-accountability-panel-heading">
            <div>
              <strong>Matching Operators</strong>
              <span>{operators.length} operators matched the selected date range.</span>
            </div>
            <div className="cashier-accountability-inline-actions">
              <button onClick={() => toggleAllOperators(true)} type="button">
                Select All
              </button>
              <button onClick={() => toggleAllOperators(false)} type="button">
                Clear
              </button>
            </div>
          </div>

          <div className="cashier-accountability-operator-list">
            {operators.length === 0 ? (
              <div className="cashier-accountability-empty">No operators had recorded store activity in the selected range.</div>
            ) : (
              operators.map((operator) => {
                const isSelected = selectedOperatorKeySet.has(operator.operatorKey);

                return (
                  <label className={`cashier-accountability-operator-card${isSelected ? " is-selected" : ""}`} key={operator.operatorKey}>
                    <input checked={isSelected} onChange={() => toggleOperator(operator.operatorKey)} type="checkbox" />
                    <div>
                      <strong>{operator.name}</strong>
                      <span>{operator.title}</span>
                    </div>
                    <div className="cashier-accountability-operator-metrics">
                      <strong>{operator.activityCount}</strong>
                      <span>{operator.activeDateCount} day(s)</span>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </aside>

        <section className="cashier-accountability-report">
          <div className="cashier-accountability-summary-grid">
            <article className="cashier-accountability-summary-card">
              <span>Operators Included</span>
              <strong>{summary.operatorCount}</strong>
              <p>Users with at least one recorded store activity in the selected date range.</p>
            </article>
            <article className="cashier-accountability-summary-card">
              <span>Tracked Activities</span>
              <strong>{summary.activityCount}</strong>
              <p>Every captured action tied back to the selected operators and store.</p>
            </article>
            <article className="cashier-accountability-summary-card">
              <span>Active Days</span>
              <strong>{summary.activeDayCount}</strong>
              <p>Distinct business days where matched users recorded activity.</p>
            </article>
            <article className="cashier-accountability-summary-card">
              <span>Latest Recorded Action</span>
              <strong>{summary.latestActivity ? formatDisplayDateTime(summary.latestActivity.occurredAt) : "No activity"}</strong>
              <p>{summary.latestActivity ? `${summary.latestActivity.actorName} · ${summary.latestActivity.label}` : "Run a search to generate the report."}</p>
            </article>
          </div>

          <div className="cashier-accountability-section-grid">
            <section className="cashier-accountability-panel">
              <div className="cashier-accountability-panel-heading">
                <div>
                  <strong>Workspace Breakdown</strong>
                  <span>Which store lanes generated the selected activity.</span>
                </div>
              </div>
              <div className="cashier-accountability-breakdown-list">
                {workspaceTotals.length === 0 ? (
                  <div className="cashier-accountability-empty">No activity is selected.</div>
                ) : (
                  workspaceTotals.map((workspaceTotal) => (
                    <div className="cashier-accountability-breakdown-row" key={workspaceTotal.workspaceId}>
                      <span>{formatWorkspaceLabel(workspaceTotal.workspaceId)}</span>
                      <strong>{workspaceTotal.count}</strong>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="cashier-accountability-panel">
              <div className="cashier-accountability-panel-heading">
                <div>
                  <strong>Daily Rollup</strong>
                  <span>How much activity each day produced across the selected operators.</span>
                </div>
              </div>
              <div className="cashier-accountability-daily-list">
                {dailyRows.length === 0 ? (
                  <div className="cashier-accountability-empty">No daily activity matched the current operator filter.</div>
                ) : (
                  dailyRows.map((row) => (
                    <div className="cashier-accountability-daily-row" key={row.date}>
                      <div>
                        <strong>{formatDisplayDate(row.date)}</strong>
                        <span>{row.operatorCount} operators active</span>
                      </div>
                      <div>
                        <strong>{row.activityCount}</strong>
                        <span>{row.busiestWorkspace ? `${formatWorkspaceLabel(row.busiestWorkspace)} busiest` : "No workspace mix"}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <section className="cashier-accountability-panel">
            <div className="cashier-accountability-panel-heading">
              <div>
                <strong>Operator Rollup</strong>
                <span>Each matched operator with their latest recorded activity.</span>
              </div>
            </div>
            <div className="cashier-accountability-table-shell">
              <table className="cashier-accountability-table">
                <thead>
                  <tr>
                    <th>Operator</th>
                    <th>Title</th>
                    <th>Active Days</th>
                    <th>Activities</th>
                    <th>Latest Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOperators.length === 0 ? (
                    <tr>
                      <td className="cashier-accountability-table-empty" colSpan={5}>
                        No operators are selected.
                      </td>
                    </tr>
                  ) : (
                    filteredOperators.map((operator: CashierAccountabilityReportOperator) => (
                      <tr key={operator.operatorKey}>
                        <td>
                          <strong>{operator.name}</strong>
                        </td>
                        <td>{operator.title}</td>
                        <td>{operator.activeDateCount}</td>
                        <td>{operator.activityCount}</td>
                        <td>
                          <strong>{formatDisplayDateTime(operator.latestActivityAt)}</strong>
                          <span>{operator.latestActivityLabel}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="cashier-accountability-panel">
            <div className="cashier-accountability-panel-heading">
              <div>
                <strong>Cashier Accountability Report</strong>
                <span>What the selected operators did in the store during the requested date range.</span>
              </div>
            </div>
            <div className="cashier-accountability-table-shell">
              <table className="cashier-accountability-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Operator</th>
                    <th>Workspace</th>
                    <th>Action</th>
                    <th>Detail</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td className="cashier-accountability-table-empty" colSpan={6}>
                        No activity matched the current report filters.
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td>
                          <strong>{formatDisplayDateTime(entry.occurredAt)}</strong>
                        </td>
                        <td>
                          <strong>{entry.actorName}</strong>
                          <span>{entry.actorTitle}</span>
                        </td>
                        <td>{formatWorkspaceLabel(entry.workspaceId)}</td>
                        <td>
                          <strong>{entry.label}</strong>
                        </td>
                        <td>{entry.detail}</td>
                        <td>
                          <span className={`cashier-accountability-tone-chip is-${entry.tone}`}>{getToneLabel(entry)}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}