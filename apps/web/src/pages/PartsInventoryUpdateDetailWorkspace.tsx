import { useEffect, useMemo, useState } from "react";
import {
  createPartsInventoryUpdateStatement,
  deletePartsInventoryUpdateStatement,
  duplicatePartsInventoryUpdateStatement,
  runPartsInventoryUpdateStatement,
  updatePartsInventoryUpdateStatement
} from "../api";
import {
  formatPartsInventoryUpdateDisplayTitle,
  type PartsInventoryUpdateChange,
  type PartsInventoryUpdateCriterion,
  type PartsInventoryUpdateStatement
} from "./partsInventoryUpdateDirectory";

interface PartsInventoryUpdateDetailWorkspaceProps {
  onOpenStatementDetail: (statementId: string) => void;
  onOpenStatementList: () => void;
  onStatementsChange: React.Dispatch<React.SetStateAction<PartsInventoryUpdateStatement[]>>;
  statement: PartsInventoryUpdateStatement;
  statements: PartsInventoryUpdateStatement[];
  storeId: string;
  storeName: string;
}

type PartsInventoryUpdateDetailTab = "designer" | "history" | "calculatedFields";

function cloneCriteria(criteria: PartsInventoryUpdateCriterion[]) {
  return criteria.map((item) => ({ ...item }));
}

function cloneChangeSet(changeSet: PartsInventoryUpdateChange[]) {
  return changeSet.map((item) => ({ ...item }));
}

export function PartsInventoryUpdateDetailWorkspace({
  onOpenStatementDetail,
  onOpenStatementList,
  onStatementsChange,
  statement,
  statements,
  storeId,
  storeName
}: PartsInventoryUpdateDetailWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<PartsInventoryUpdateDetailTab>("designer");
  const [fieldSearchTerm, setFieldSearchTerm] = useState("");
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(statement.fieldCatalog[0]?.id ?? null);
  const [criteria, setCriteria] = useState(() => cloneCriteria(statement.criteria));
  const [changeSet, setChangeSet] = useState(() => cloneChangeSet(statement.changeSet));
  const [statusMessage, setStatusMessage] = useState(`${statement.name} ready.`);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab("designer");
    setFieldSearchTerm("");
    setSelectedFieldId(statement.fieldCatalog[0]?.id ?? null);
    setCriteria(cloneCriteria(statement.criteria));
    setChangeSet(cloneChangeSet(statement.changeSet));
    setStatusMessage(`${statement.name} ready.`);
  }, [statement.id]);

  const filteredFields = useMemo(() => {
    const normalizedTerm = fieldSearchTerm.trim().toLowerCase();

    return statement.fieldCatalog.filter((field) => {
      if (!normalizedTerm) {
        return true;
      }

      return field.name.toLowerCase().includes(normalizedTerm) || field.type.toLowerCase().includes(normalizedTerm);
    });
  }, [fieldSearchTerm, statement.fieldCatalog]);

  useEffect(() => {
    if (filteredFields.length === 0) {
      setSelectedFieldId(null);
      return;
    }

    if (!selectedFieldId || !filteredFields.some((field) => field.id === selectedFieldId)) {
      setSelectedFieldId(filteredFields[0].id);
    }
  }, [filteredFields, selectedFieldId]);

  const selectedField = filteredFields.find((field) => field.id === selectedFieldId) ?? null;
  const currentIndex = useMemo(() => statements.findIndex((entry) => entry.id === statement.id), [statement.id, statements]);
  const previousStatement = currentIndex > 0 ? statements[currentIndex - 1] : null;
  const nextStatement = currentIndex >= 0 && currentIndex < statements.length - 1 ? statements[currentIndex + 1] : null;
  const hasDesignerChanges = JSON.stringify(criteria) !== JSON.stringify(statement.criteria) || JSON.stringify(changeSet) !== JSON.stringify(statement.changeSet);
  const isBusy = pendingAction !== null;

  function updateCriterionValue(criterionId: string, value: string) {
    setCriteria((current) => current.map((criterion) => (criterion.id === criterionId ? { ...criterion, value } : criterion)));
  }

  function handlePrint() {
    setStatusMessage(`${statement.name} print preview queued.`);
  }

  async function persistDesignerChanges() {
    if (!hasDesignerChanges) {
      return;
    }

    const response = await updatePartsInventoryUpdateStatement(storeId, statement.id, {
      changeSet,
      criteria
    });

    onStatementsChange(response.statements);
  }

  async function handleCreate() {
    setPendingAction("create");

    try {
      const response = await createPartsInventoryUpdateStatement(storeId);
      onStatementsChange(response.statements);
      onOpenStatementDetail(response.statement.id);
      setStatusMessage(response.message);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to create a new statement.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleRun() {
    setPendingAction("run");

    try {
      await persistDesignerChanges();
      const response = await runPartsInventoryUpdateStatement(storeId, statement.id);
      onStatementsChange(response.statements);
      setStatusMessage(response.message);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to run the selected statement.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDuplicate() {
    setPendingAction("duplicate");

    try {
      const response = await duplicatePartsInventoryUpdateStatement(storeId, statement.id);
      onStatementsChange(response.statements);
      onOpenStatementDetail(response.statement.id);
      setStatusMessage(response.message);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to duplicate the selected statement.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDelete() {
    setPendingAction("delete");

    try {
      const response = await deletePartsInventoryUpdateStatement(storeId, statement.id);
      onStatementsChange(response.statements);
      setStatusMessage(response.message);
      onOpenStatementList();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to delete the selected statement.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="parts-update-detail-page">
      <section aria-label="Parts Inventory Update detail" className="parts-update-detail-window">
        <header className="parts-update-detail-titlebar">
          <div className="parts-update-detail-titlebar-copy">
            <h2>{formatPartsInventoryUpdateDisplayTitle(statement)}</h2>
            <span>{storeName}</span>
          </div>

          <div aria-hidden="true" className="parts-update-detail-window-controls">
            <span className="parts-update-detail-window-control">_</span>
            <span className="parts-update-detail-window-control">[]</span>
            <span className="parts-update-detail-window-control is-close">X</span>
          </div>
        </header>

        <div className="parts-update-detail-toolbar">
          <div className="parts-update-detail-toolbar-group">
            <button className="parts-update-detail-toolbar-button" disabled={isBusy} onClick={() => void handleCreate()} type="button">
              {pendingAction === "create" ? "Creating..." : "New"}
            </button>
            <button className="parts-update-detail-toolbar-button" disabled={isBusy} onClick={() => void handleDelete()} type="button">
              {pendingAction === "delete" ? "Deleting..." : "Delete"}
            </button>
            <button className="parts-update-detail-toolbar-button" disabled={isBusy} onClick={() => void handleDuplicate()} type="button">
              {pendingAction === "duplicate" ? "Duplicating..." : "Duplicate"}
            </button>
          </div>

          <div className="parts-update-detail-toolbar-status">{statusMessage}</div>

          <div className="parts-update-detail-toolbar-group is-end">
            <button className="parts-update-detail-toolbar-button" disabled={isBusy} onClick={onOpenStatementList} type="button">
              List
            </button>
            <button className="parts-update-detail-toolbar-button" onClick={handlePrint} type="button">
              Print
            </button>
            <button className="parts-update-detail-toolbar-button" disabled={isBusy} onClick={() => void handleRun()} type="button">
              {pendingAction === "run" ? "Running..." : "Run"}
            </button>
          </div>
        </div>

        <div aria-label="Parts Inventory Update tabs" className="parts-update-detail-tab-strip" role="tablist">
          <button
            aria-selected={activeTab === "designer"}
            className={`parts-update-detail-tab${activeTab === "designer" ? " is-active" : ""}`}
            onClick={() => setActiveTab("designer")}
            role="tab"
            type="button"
          >
            Designer
          </button>
          <button
            aria-selected={activeTab === "history"}
            className={`parts-update-detail-tab${activeTab === "history" ? " is-active" : ""}`}
            onClick={() => setActiveTab("history")}
            role="tab"
            type="button"
          >
            History
          </button>
          <button
            aria-selected={activeTab === "calculatedFields"}
            className={`parts-update-detail-tab${activeTab === "calculatedFields" ? " is-active" : ""}`}
            onClick={() => setActiveTab("calculatedFields")}
            role="tab"
            type="button"
          >
            Calculated Fields
          </button>
        </div>

        {activeTab === "designer" ? (
          <div className="parts-update-detail-designer-body">
            <aside className="parts-update-detail-field-panel">
              <div className="parts-update-detail-panel-title">Designer</div>

              <label className="parts-update-detail-field-search-shell">
                <span>Search</span>
                <input
                  onChange={(event) => setFieldSearchTerm(event.target.value)}
                  placeholder="Search in field type"
                  value={fieldSearchTerm}
                />
              </label>

              <div className="parts-update-detail-field-table-wrap">
                <table className="parts-update-detail-field-table">
                  <thead>
                    <tr>
                      <th>Field Name</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFields.map((field) => (
                      <tr
                        className={field.id === selectedFieldId ? "is-selected" : ""}
                        key={field.id}
                        onClick={() => setSelectedFieldId(field.id)}
                      >
                        <td>{field.name}</td>
                        <td>{field.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="parts-update-detail-selected-field">
                {selectedField ? `${selectedField.name} · ${selectedField.type}` : "No field selected"}
              </div>
            </aside>

            <div className="parts-update-detail-workbench">
              <section className="parts-update-detail-section">
                <div className="parts-update-detail-section-title">Filter</div>
                <div className="parts-update-detail-criteria-list">
                  {criteria.map((criterion) => (
                    <div className="parts-update-detail-criterion-row" key={criterion.id}>
                      <span className="parts-update-detail-criterion-field">{criterion.field}</span>
                      <span className="parts-update-detail-criterion-operator">{criterion.operator}</span>
                      <input
                        onChange={(event) => updateCriterionValue(criterion.id, event.target.value)}
                        value={criterion.value}
                      />
                    </div>
                  ))}
                </div>
              </section>

              <section className="parts-update-detail-section">
                <div className="parts-update-detail-section-title">Change Set</div>
                <div className="parts-update-detail-change-list">
                  {changeSet.map((change) => (
                    <div className="parts-update-detail-change-row" key={change.id}>
                      <span>{change.sourceField}</span>
                      <strong>to</strong>
                      <span>{change.targetField}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="parts-update-detail-section is-preview">
                <div className="parts-update-detail-preview-meta">{statement.previewSummary}</div>

                <div className="parts-update-detail-preview-table-wrap">
                  <table className="parts-update-detail-preview-table">
                    <thead>
                      <tr>
                        <th>Part Number</th>
                        <th>Active State</th>
                        <th>Bin Location 1</th>
                        <th>Bin Location 2</th>
                        <th>Last Received Date</th>
                        <th>Description</th>
                        <th>Setup Date</th>
                        <th>Supplier Code</th>
                        <th>Last Sold Date</th>
                        <th>New Bin Location 1</th>
                        <th>New Bin Location 2</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statement.previewRows.map((row) => (
                        <tr key={row.id}>
                          <td>{row.partNumber}</td>
                          <td>{row.activeState}</td>
                          <td>{row.binLocation1}</td>
                          <td>{row.binLocation2}</td>
                          <td>{row.lastReceivedDate}</td>
                          <td>{row.description}</td>
                          <td>{row.setupDate}</td>
                          <td>{row.supplierCode}</td>
                          <td>{row.lastSoldDate}</td>
                          <td>{row.newBinLocation1}</td>
                          <td>{row.newBinLocation2}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        ) : activeTab === "history" ? (
          <div className="parts-update-detail-history-body">
            {statement.history.map((entry) => (
              <article className="parts-update-detail-history-card" key={entry.id}>
                <div className="parts-update-detail-history-card-header">
                  <strong>{entry.action}</strong>
                  <span>{entry.occurredAt}</span>
                </div>
                <p>{entry.detail}</p>
                <footer>{entry.actor}</footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="parts-update-detail-calculated-body">
            {statement.calculatedFields.map((field) => (
              <article className="parts-update-detail-calculated-card" key={field.id}>
                <strong>{field.name}</strong>
                <code>{field.formula}</code>
                <p>{field.summary}</p>
              </article>
            ))}
          </div>
        )}

        <footer className="parts-update-detail-footer">
          <button
            className="parts-update-detail-footer-button"
            disabled={!previousStatement || isBusy}
            onClick={() => previousStatement && onOpenStatementDetail(previousStatement.id)}
            type="button"
          >
            Previous
          </button>
          <button className="parts-update-detail-footer-button" disabled={isBusy} onClick={onOpenStatementList} type="button">
            Cancel
          </button>
          <button
            className="parts-update-detail-footer-button"
            disabled={!nextStatement || isBusy}
            onClick={() => nextStatement && onOpenStatementDetail(nextStatement.id)}
            type="button"
          >
            Next
          </button>
        </footer>
      </section>
    </div>
  );
}