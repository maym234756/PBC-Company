import { useEffect, useMemo, useState } from "react";
import {
  createPartsInventoryUpdateStatement,
  deletePartsInventoryUpdateStatement,
  duplicatePartsInventoryUpdateStatement,
  updatePartsInventoryUpdateStatement
} from "../api";
import type { PartsInventoryUpdateStatement } from "./partsInventoryUpdateDirectory";

interface PartsInventoryUpdateWorkspaceProps {
  onOpenStatementDetail: (statementId: string) => void;
  onStatementsChange: React.Dispatch<React.SetStateAction<PartsInventoryUpdateStatement[]>>;
  statements: PartsInventoryUpdateStatement[];
  storeId: string;
  storeName: string;
}

export function PartsInventoryUpdateWorkspace({
  onOpenStatementDetail,
  onStatementsChange,
  statements,
  storeId,
  storeName
}: PartsInventoryUpdateWorkspaceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(statements[0]?.id ?? null);
  const [statusMessage, setStatusMessage] = useState("Ready.");
  const [editingStatementId, setEditingStatementId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const filteredStatements = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();

    return statements.filter((statement) => {
      if (!normalizedTerm) {
        return true;
      }

      return statement.name.toLowerCase().includes(normalizedTerm);
    });
  }, [searchTerm, statements]);

  useEffect(() => {
    if (filteredStatements.length === 0) {
      setSelectedStatementId(null);
      return;
    }

    if (!selectedStatementId || !filteredStatements.some((statement) => statement.id === selectedStatementId)) {
      setSelectedStatementId(filteredStatements[0].id);
    }
  }, [filteredStatements, selectedStatementId]);

  useEffect(() => {
    if (editingStatementId && !statements.some((statement) => statement.id === editingStatementId)) {
      setEditingStatementId(null);
      setEditingName("");
    }
  }, [editingStatementId, statements]);

  const selectedStatement = statements.find((statement) => statement.id === selectedStatementId) ?? null;
  const isBusy = pendingAction !== null;

  function handleDetail() {
    if (!selectedStatement) {
      return;
    }

    onOpenStatementDetail(selectedStatement.id);
  }

  function beginInlineEdit(statement: PartsInventoryUpdateStatement) {
    setSelectedStatementId(statement.id);
    setEditingStatementId(statement.id);
    setEditingName(statement.name);
    setStatusMessage(`Editing ${statement.name}. Press Enter to save or Escape to cancel.`);
  }

  function cancelInlineEdit() {
    setEditingStatementId(null);
    setEditingName("");
  }

  async function handleCreate() {
    setPendingAction("create");

    try {
      const result = await createPartsInventoryUpdateStatement(storeId);
      onStatementsChange(result.statements);
      setSelectedStatementId(result.statement.id);
      setEditingStatementId(result.statement.id);
      setEditingName(result.statement.name);
      setStatusMessage(result.message);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to create the statement.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDelete() {
    if (!selectedStatement) {
      return;
    }

    setPendingAction(`delete:${selectedStatement.id}`);

    try {
      const result = await deletePartsInventoryUpdateStatement(storeId, selectedStatement.id);
      onStatementsChange(result.statements);
      if (editingStatementId === selectedStatement.id) {
        cancelInlineEdit();
      }
      setStatusMessage(result.message);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to delete the statement.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDuplicate() {
    if (!selectedStatement) {
      return;
    }

    setPendingAction(`duplicate:${selectedStatement.id}`);

    try {
      const result = await duplicatePartsInventoryUpdateStatement(storeId, selectedStatement.id);
      onStatementsChange(result.statements);
      setSelectedStatementId(result.statement.id);
      setStatusMessage(result.message);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to duplicate the statement.");
    } finally {
      setPendingAction(null);
    }
  }

  async function commitInlineEdit(statement: PartsInventoryUpdateStatement) {
    if (editingStatementId !== statement.id || pendingAction === `rename:${statement.id}`) {
      return;
    }

    const nextName = editingName.trim();

    if (!nextName) {
      setEditingName(statement.name);
      setStatusMessage("Statement name cannot be empty.");
      return;
    }

    if (nextName === statement.name) {
      cancelInlineEdit();
      return;
    }

    setPendingAction(`rename:${statement.id}`);

    try {
      const result = await updatePartsInventoryUpdateStatement(storeId, statement.id, { name: nextName });
      onStatementsChange(result.statements);
      setSelectedStatementId(result.statement.id);
      setStatusMessage(result.message);
      cancelInlineEdit();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to rename the statement.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="parts-update-list-page">
      <section aria-label="Parts Inventory Update Statements" className="parts-update-list-window">
        <header className="parts-update-list-titlebar">
          <div className="parts-update-list-titlebar-copy">
            <h2>Parts Inventory Update Statements</h2>
            <span>{storeName}</span>
          </div>

          <div aria-hidden="true" className="parts-update-list-window-controls">
            <span className="parts-update-list-window-control">_</span>
            <span className="parts-update-list-window-control">[]</span>
            <span className="parts-update-list-window-control is-close">X</span>
          </div>
        </header>

        <div className="parts-update-list-toolbar">
          <div className="parts-update-list-toolbar-group">
            <button className="parts-update-list-toolbar-button" disabled={isBusy} onClick={() => void handleCreate()} type="button">
              {pendingAction === "create" ? "Creating..." : "New"}
            </button>
            <button className="parts-update-list-toolbar-button" disabled={!selectedStatement || isBusy} onClick={() => void handleDelete()} type="button">
              {pendingAction?.startsWith("delete:") ? "Deleting..." : "Delete"}
            </button>
            <button className="parts-update-list-toolbar-button" disabled={!selectedStatement || isBusy} onClick={() => void handleDuplicate()} type="button">
              {pendingAction?.startsWith("duplicate:") ? "Duplicating..." : "Duplicate"}
            </button>
            <button
              className="parts-update-list-toolbar-button"
              disabled={!selectedStatement || isBusy}
              onClick={() => setStatusMessage(`${selectedStatement?.name ?? "Statement"} history stays available from the detail view.`)}
              type="button"
            >
              History
            </button>
          </div>

          <div className="parts-update-list-toolbar-status">{statusMessage}</div>

          <div className="parts-update-list-toolbar-group is-end">
            <button className="parts-update-list-toolbar-button" disabled={!selectedStatement || isBusy} onClick={handleDetail} type="button">
              Detail
            </button>
          </div>
        </div>

        <div className="parts-update-list-filterbar">
          <label className="parts-update-list-search-shell">
            <span>Search</span>
            <input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Type here to search"
              value={searchTerm}
            />
          </label>

          <div className="parts-update-list-found-count">Found {filteredStatements.length}</div>
        </div>

        <div className="parts-update-list-table-wrap">
          <table className="parts-update-list-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Last Updated By</th>
                <th>Last Updated</th>
                <th>Created By</th>
                <th>Created Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredStatements.length === 0 ? (
                <tr className="parts-update-list-empty-row">
                  <td colSpan={5}>No Parts Inventory Update statements match the current search.</td>
                </tr>
              ) : (
                filteredStatements.map((statement) => {
                  const isSelected = statement.id === selectedStatementId;

                  return (
                    <tr
                      className={isSelected ? "is-selected" : ""}
                      key={statement.id}
                      onClick={() => setSelectedStatementId(statement.id)}
                      onDoubleClick={() => {
                        if (!editingStatementId) {
                          onOpenStatementDetail(statement.id);
                        }
                      }}
                    >
                      <td
                        className="parts-update-list-name-cell"
                        onDoubleClick={(event) => {
                          event.stopPropagation();
                          beginInlineEdit(statement);
                        }}
                        title="Double-click to rename"
                      >
                        {editingStatementId === statement.id ? (
                          <input
                            aria-label={`Rename ${statement.name}`}
                            className="parts-update-list-name-input"
                            onBlur={() => void commitInlineEdit(statement)}
                            onChange={(event) => setEditingName(event.target.value)}
                            onClick={(event) => event.stopPropagation()}
                            onDoubleClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void commitInlineEdit(statement);
                              }

                              if (event.key === "Escape") {
                                event.preventDefault();
                                cancelInlineEdit();
                              }
                            }}
                            value={editingName}
                            autoFocus
                          />
                        ) : (
                          <span className="parts-update-list-name-text">{statement.name}</span>
                        )}
                      </td>
                      <td>{statement.lastUpdatedBy}</td>
                      <td>{statement.lastUpdatedAt}</td>
                      <td>{statement.createdBy}</td>
                      <td>{statement.createdDate}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}