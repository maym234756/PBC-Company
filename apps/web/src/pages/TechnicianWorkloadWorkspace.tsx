import { useEffect, useMemo, useRef, useState } from "react";
import {
  getTechnicianWorkloadReport,
  type TechnicianWorkloadReportTechnician,
  type TechnicianWorkloadReportTechnicianDetail
} from "../api";

interface TechnicianWorkloadWorkspaceProps {
  storeId: string;
  storeName: string;
}

type TechnicianReportMode = "summary" | "detail";
type TechnicianHoursMode = "billed" | "credited";

const dateLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "2-digit",
  day: "2-digit",
  year: "numeric"
});

const generatedAtFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit"
});

function formatInputDate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string) {
  const [year, month, day] = value.split("-").map((segment) => Number(segment));
  return dateLabelFormatter.format(new Date(year, month - 1, day));
}

function getDefaultStartDate() {
  const value = new Date();
  value.setDate(1);
  return formatInputDate(value);
}

function getUtilizationClass(percent: number) {
  if (percent >= 90) {
    return " is-overloaded";
  }

  if (percent >= 75) {
    return " is-busy";
  }

  return "";
}

function formatHours(value: number) {
  return value % 1 === 0 ? `${value}` : value.toFixed(1);
}

export function TechnicianWorkloadWorkspace({ storeId, storeName }: TechnicianWorkloadWorkspaceProps) {
  const startDateInputRef = useRef<HTMLInputElement | null>(null);
  const endDateInputRef = useRef<HTMLInputElement | null>(null);
  const [startDate, setStartDate] = useState(() => getDefaultStartDate());
  const [endDate, setEndDate] = useState(() => formatInputDate(new Date()));
  const [reportMode, setReportMode] = useState<TechnicianReportMode>("summary");
  const [hoursMode, setHoursMode] = useState<TechnicianHoursMode>("billed");
  const [showActive, setShowActive] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string>(() => new Date().toISOString());
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [technicianRows, setTechnicianRows] = useState<TechnicianWorkloadReportTechnician[]>([]);
  const [technicianDetails, setTechnicianDetails] = useState<TechnicianWorkloadReportTechnicianDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadTechnicianWorkloadReport() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await getTechnicianWorkloadReport(storeId, startDate, endDate);

        if (!isCancelled) {
          setTechnicianRows(response.technicians);
          setTechnicianDetails(response.technicianDetails);
          setGeneratedAt(response.generatedAt);
        }
      } catch (error) {
        if (!isCancelled) {
          setLoadError(error instanceof Error ? error.message : "Unable to load technician workload data.");
          setTechnicianRows([]);
          setTechnicianDetails([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadTechnicianWorkloadReport();

    return () => {
      isCancelled = true;
    };
  }, [endDate, refreshVersion, startDate, storeId]);

  useEffect(() => {
    setSelectedTechnicianIds((current) => {
      const currentSet = new Set(current);
      const nextSelectable = technicianRows.filter((row) => row.active).map((row) => row.id);
      const preserved = nextSelectable.filter((id) => currentSet.has(id));
      return preserved.length > 0 ? preserved : nextSelectable;
    });
  }, [technicianRows]);

  const visibleTechnicians = useMemo(
    () => technicianRows.filter((row) => (row.active && showActive) || (!row.active && showInactive)),
    [showActive, showInactive, technicianRows]
  );

  const selectedTechnicians = useMemo(() => {
    const selectedIdSet = new Set(selectedTechnicianIds);
    return technicianRows.filter((row) => selectedIdSet.has(row.id));
  }, [selectedTechnicianIds, technicianRows]);

  const selectedTechnicianDetails = useMemo(() => {
    const selectedIdSet = new Set(selectedTechnicianIds);
    return technicianDetails.filter((detail) => selectedIdSet.has(detail.technicianId));
  }, [selectedTechnicianIds, technicianDetails]);

  const summary = useMemo(() => {
    const totalAvailable = selectedTechnicians.reduce((total, row) => total + row.availableHours, 0);
    const totalHours = selectedTechnicians.reduce(
      (total, row) => total + (hoursMode === "billed" ? row.billedHours : row.creditedHours),
      0
    );

    return {
      technicianCount: selectedTechnicians.length,
      totalAvailable,
      totalHours,
      utilization: totalAvailable === 0 ? 0 : Math.round((totalHours / totalAvailable) * 100),
      repairOrderCount: selectedTechnicians.reduce((total, row) => total + row.repairOrderCount, 0)
    };
  }, [hoursMode, selectedTechnicians]);

  function toggleTechnician(technicianId: string) {
    setSelectedTechnicianIds((current) =>
      current.includes(technicianId) ? current.filter((currentId) => currentId !== technicianId) : [...current, technicianId]
    );
  }

  function handleGenerateReport() {
    setRefreshVersion((current) => current + 1);
  }

  function handlePrintPreview() {
    setGeneratedAt(new Date().toISOString());
    window.print();
  }

  function openDatePicker(input: HTMLInputElement | null) {
    if (!input) {
      return;
    }

    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
    pickerInput.showPicker?.();

    if (!pickerInput.showPicker) {
      input.focus();
      input.click();
    }
  }

  const hoursModeLabel = hoursMode === "billed" ? "Billed Hours" : "Credited Hours";
  const reportModeLabel = reportMode === "summary" ? "Summary" : "Detail";

  return (
    <div className="technician-workload-page">
      <div className="technician-workload-shell">
        <div className="technician-workload-top-grid">
          <section className="technician-workload-panel technician-workload-filter-panel">
            <div className="technician-workload-panel-heading">
              <strong>Filters</strong>
              <span>Report window and workload basis</span>
            </div>

            <div className="technician-workload-filter-grid">
              <div className="technician-workload-field technician-workload-date-field">
                <span>From</span>
                <input
                  className="technician-workload-hidden-date-input"
                  max={endDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  ref={startDateInputRef}
                  type="date"
                  value={startDate}
                />
                <button className="technician-workload-date-trigger" onClick={() => openDatePicker(startDateInputRef.current)} type="button">
                  <strong>{formatDisplayDate(startDate)}</strong>
                  <span>Choose date</span>
                </button>
              </div>
              <div className="technician-workload-field technician-workload-date-field">
                <span>To</span>
                <input
                  className="technician-workload-hidden-date-input"
                  min={startDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  ref={endDateInputRef}
                  type="date"
                  value={endDate}
                />
                <button className="technician-workload-date-trigger" onClick={() => openDatePicker(endDateInputRef.current)} type="button">
                  <strong>{formatDisplayDate(endDate)}</strong>
                  <span>Choose date</span>
                </button>
              </div>
              <div className="technician-workload-choice-block">
                <span>Report Type</span>
                <div className="technician-workload-radio-row">
                  <label>
                    <input checked={reportMode === "summary"} name="report-mode" onChange={() => setReportMode("summary")} type="radio" />
                    Summary
                  </label>
                  <label>
                    <input checked={reportMode === "detail"} name="report-mode" onChange={() => setReportMode("detail")} type="radio" />
                    Detail
                  </label>
                </div>
              </div>
              <div className="technician-workload-choice-block">
                <span>Hours Basis</span>
                <div className="technician-workload-radio-row">
                  <label>
                    <input checked={hoursMode === "billed"} name="hours-mode" onChange={() => setHoursMode("billed")} type="radio" />
                    Billed
                  </label>
                  <label>
                    <input checked={hoursMode === "credited"} name="hours-mode" onChange={() => setHoursMode("credited")} type="radio" />
                    Credited
                  </label>
                </div>
              </div>
            </div>

            <div className="technician-workload-panel-footer">Store: {storeName}</div>
            {loadError ? <div className="technician-workload-load-state is-error">{loadError}</div> : null}
            {!loadError && isLoading ? <div className="technician-workload-load-state">Loading technician workload report...</div> : null}
          </section>

          <aside className="technician-workload-panel technician-workload-technician-panel">
            <div className="technician-workload-panel-heading">
              <div>
                <strong>Technicians</strong>
                <span>{visibleTechnicians.length} technician rows in the selected date range</span>
              </div>
              <div className="technician-workload-technician-toolbar">
                <label>
                  <input checked={showActive} onChange={(event) => setShowActive(event.target.checked)} type="checkbox" />
                  Active
                </label>
                <label>
                  <input checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} type="checkbox" />
                  Inactive
                </label>
              </div>
            </div>

            <table className="technician-workload-technician-table">
              <thead>
                <tr>
                  <th aria-label="Selected" />
                  <th>Name</th>
                  <th>ROs</th>
                  <th>Avail Time (hr)</th>
                  <th>Active</th>
                </tr>
              </thead>
              <tbody>
                {visibleTechnicians.length === 0 ? (
                  <tr>
                    <td className="technician-workload-empty-row" colSpan={5}>
                      No technicians match the current date range and status filters.
                    </td>
                  </tr>
                ) : (
                  visibleTechnicians.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <input checked={selectedTechnicianIds.includes(row.id)} onChange={() => toggleTechnician(row.id)} type="checkbox" />
                      </td>
                      <td>{row.name}</td>
                      <td>{row.repairOrderCount}</td>
                      <td>{formatHours(row.availableHours)}</td>
                      <td>
                        <span className={`technician-workload-status-dot${row.active ? " is-active" : ""}`} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </aside>
        </div>

        <section className="technician-workload-preview-shell">
          <div className="technician-workload-preview-toolbar">
            <div className="technician-workload-preview-badge">Print Preview</div>
            <label>
              <span>Copies</span>
              <select defaultValue="1">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </label>
            <label className="technician-workload-printer-select">
              <span>Printer</span>
              <select defaultValue="none">
                <option value="none">&lt;No Printer&gt;</option>
                <option value="front-desk">Front Desk</option>
                <option value="service-office">Service Office</option>
              </select>
            </label>
            <div className="technician-workload-toolbar-icons" aria-hidden="true">
              <button type="button">|&lt;</button>
              <button type="button">&lt;</button>
              <button type="button">&gt;</button>
              <button type="button">&gt;|</button>
              <button type="button">-</button>
              <button type="button">+</button>
            </div>
            <button className="technician-workload-print-button" onClick={handlePrintPreview} type="button">
              Print Preview
            </button>
            <button className="technician-workload-generate-button" onClick={handleGenerateReport} type="button">
              Generate Report
            </button>
          </div>

          <div className="technician-workload-preview-canvas">
            <div className="technician-workload-report-sheet">
              <div className="technician-workload-report-kicker">
                <span>Service Department</span>
                <span>Time &amp; Promise</span>
              </div>

              <div className="technician-workload-report-header">
                <div>
                  <span className="technician-workload-report-eyebrow">Lightspeed Service Performance</span>
                  <strong>Technician Workload Report</strong>
                  <span>
                    {storeName} · {formatDisplayDate(startDate)} to {formatDisplayDate(endDate)} · {reportModeLabel}
                  </span>
                </div>
                <div className="technician-workload-report-issued">
                  <span>Generated</span>
                  <strong>{generatedAtFormatter.format(new Date(generatedAt))}</strong>
                  <span>{hoursModeLabel}</span>
                </div>
              </div>

              <div className="technician-workload-report-meta-strip">
                <span>Store: {storeName}</span>
                <span>Window: {formatDisplayDate(startDate)} - {formatDisplayDate(endDate)}</span>
                <span>ROs: {summary.repairOrderCount}</span>
                <span>Basis: {hoursModeLabel}</span>
              </div>

              <div className="technician-workload-summary-strip">
                <div>
                  <span>Technicians</span>
                  <strong>{summary.technicianCount}</strong>
                </div>
                <div>
                  <span>Available Hours</span>
                  <strong>{formatHours(summary.totalAvailable)}</strong>
                </div>
                <div>
                  <span>{hoursMode === "billed" ? "Billed Hours" : "Credited Hours"}</span>
                  <strong>{formatHours(summary.totalHours)}</strong>
                </div>
                <div>
                  <span>Utilization</span>
                  <strong>{summary.utilization}%</strong>
                </div>
              </div>

              <table className="technician-workload-report-table">
                <thead>
                  <tr>
                    <th>Technician</th>
                    <th>ROs</th>
                    <th>Avail Time (hr)</th>
                    <th>{hoursMode === "billed" ? "Billed Hours" : "Credited Hours"}</th>
                    <th>Utilization</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTechnicians.length === 0 ? (
                    <tr>
                      <td className="technician-workload-empty-row is-report" colSpan={6}>
                        Select at least one technician to preview the report body.
                      </td>
                    </tr>
                  ) : (
                    selectedTechnicians.map((row) => {
                      const usedHours = hoursMode === "billed" ? row.billedHours : row.creditedHours;
                      const utilization = row.availableHours === 0 ? 0 : Math.round((usedHours / row.availableHours) * 100);

                      return (
                        <tr key={row.id}>
                          <td>{row.name}</td>
                          <td>{row.repairOrderCount}</td>
                          <td>{formatHours(row.availableHours)}</td>
                          <td>{formatHours(usedHours)}</td>
                          <td>
                            <div className="technician-workload-report-utilization-cell">
                              <span>{utilization}%</span>
                              <div className="technician-workload-report-bar-track">
                                <div className={`technician-workload-report-bar-fill${getUtilizationClass(utilization)}`} style={{ width: `${Math.min(utilization, 100)}%` }} />
                              </div>
                            </div>
                          </td>
                          <td>{row.active ? "Active" : "Inactive"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {reportMode === "detail" ? (
                <div className="technician-workload-detail-stack">
                  {selectedTechnicianDetails.length === 0 ? (
                    <div className="technician-workload-detail-empty">
                      Select at least one technician to show repair-order, job, and time-clock session detail.
                    </div>
                  ) : (
                    selectedTechnicianDetails.map((detail) => (
                      <section className="technician-workload-detail-section" key={detail.technicianId}>
                        <div className="technician-workload-detail-header">
                          <div>
                            <strong>{detail.technicianName}</strong>
                            <span>{detail.repairOrderCount} ROs · {detail.jobCount} jobs in range</span>
                          </div>
                          <div className="technician-workload-detail-summary">
                            <span>Avail {formatHours(detail.availableHours)} hr</span>
                            <span>Billed {formatHours(detail.billedHours)} hr</span>
                            <span>Credited {formatHours(detail.creditedHours)} hr</span>
                          </div>
                        </div>

                        <table className="technician-workload-detail-job-table">
                          <thead>
                            <tr>
                              <th>RO</th>
                              <th>Customer / Unit</th>
                              <th>Job</th>
                              <th>Avail</th>
                              <th>Billed</th>
                              <th>Credited</th>
                              <th>Sessions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detail.jobs.map((job) => (
                              <tr className="technician-workload-detail-job-row" key={job.id}>
                                <td>
                                  <strong>{job.roNumber}</strong>
                                  <span>{job.roStatus}</span>
                                </td>
                                <td>
                                  <strong>{job.customerName}</strong>
                                  <span>{job.stockNumber} · {job.model}</span>
                                </td>
                                <td>
                                  <strong>{job.jobTitle}</strong>
                                  <span>Writer: {job.serviceWriter}</span>
                                </td>
                                <td>{formatHours(job.availableHours)}</td>
                                <td>{formatHours(job.billedHours)}</td>
                                <td>{formatHours(job.creditedHours)}</td>
                                <td>{job.sessionCount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div className="technician-workload-detail-session-stack">
                          {detail.jobs.map((job) => (
                            <section className="technician-workload-detail-session-group" key={`${job.id}-sessions`}>
                              <div className="technician-workload-detail-session-group-header">
                                <strong>{job.roNumber} · {job.jobTitle}</strong>
                                <span>{job.sessions.length} session{job.sessions.length === 1 ? "" : "s"}</span>
                              </div>
                              {job.sessions.length === 0 ? (
                                <div className="technician-workload-detail-no-sessions">
                                  No time clock sessions matched this job in the selected date range.
                                </div>
                              ) : (
                                <table className="technician-workload-detail-session-table">
                                  <thead>
                                    <tr>
                                      <th>Clock In</th>
                                      <th>Clock Out</th>
                                      <th>Actual</th>
                                      <th>Credited</th>
                                      <th>Status</th>
                                      <th>Override</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {job.sessions.map((session) => (
                                      <tr key={session.id}>
                                        <td>{session.startDate} {session.startTime}</td>
                                        <td>{session.endDate ? `${session.endDate} ${session.endTime}` : "Open"}</td>
                                        <td>{formatHours(session.actualHours)}</td>
                                        <td>{formatHours(session.creditedHours)}</td>
                                        <td>{session.status}</td>
                                        <td>{session.override || "-"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </section>
                          ))}
                        </div>
                      </section>
                    ))
                  )}
                </div>
              ) : null}

              <div className="technician-workload-report-footer">
                <span>Repair Orders: {summary.repairOrderCount}</span>
                <span>Report Mode: {reportModeLabel}</span>
                <span>Hours Basis: {hoursModeLabel}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}