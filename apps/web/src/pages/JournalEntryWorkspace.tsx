import { useEffect, useMemo, useState } from "react";

type BatchType = "Import" | "Manual" | "Recurring";

interface JournalEntryLine {
  id: string;
  account: string;
  credit: string;
  debit: string;
  description: string;
  documentNumber: string;
  reference1: string;
  reference2: string;
  scheduleType: string;
  store: string;
}

interface JournalEntryTransaction {
  id: string;
  batchType: BatchType;
  date: string;
  description: string;
  documentNumber: string;
  journal: string;
  lines: JournalEntryLine[];
  transNumber: string;
}

interface JournalEntryWorkspaceProps {
  storeName: string;
}

const toolbarActions = [
  { id: "new", icon: "N", label: "New", shortcut: "Ctrl+N" },
  { id: "delete", icon: "D", label: "Delete", shortcut: "Del" },
  { id: "deleteAll", icon: "A", label: "Delete All", shortcut: "Shift+Del" },
  { id: "reverse", icon: "R", label: "Reverse", shortcut: "Ctrl+R" },
  { id: "post", icon: "P", label: "Post", shortcut: "Ctrl+P" }
] as const;

const seedTransactions = [
  {
    transNumber: "52659169",
    documentNumber: "05/26 Merch Fee",
    description: "05/26 Merch Fee",
    date: "05/04/2026",
    batchType: "Manual" as const,
    journal: "Journal",
    amount: 2462.13,
    expenseAccount: "76300-60"
  },
  {
    transNumber: "52659175",
    documentNumber: "05/26 Merch Fee",
    description: "05/26 Merch Fee",
    date: "05/04/2026",
    batchType: "Manual" as const,
    journal: "Journal",
    amount: 1830.54,
    expenseAccount: "76300-61"
  },
  {
    transNumber: "52659174",
    documentNumber: "05/26 Merch Fee",
    description: "05/26 Merch Fee",
    date: "05/04/2026",
    batchType: "Manual" as const,
    journal: "Journal",
    amount: 980.2,
    expenseAccount: "76300-62"
  },
  {
    transNumber: "52659176",
    documentNumber: "05/26 Merch Fee",
    description: "05/26 Merch Fee",
    date: "05/04/2026",
    batchType: "Manual" as const,
    journal: "Journal",
    amount: 512.4,
    expenseAccount: "76300-63"
  },
  {
    transNumber: "52659159",
    documentNumber: "05/26 Merch Fee",
    description: "05/26 Merch Fee",
    date: "05/04/2026",
    batchType: "Manual" as const,
    journal: "Journal",
    amount: 742.11,
    expenseAccount: "76300-64"
  },
  {
    transNumber: "52659161",
    documentNumber: "05/26 Merch Fee",
    description: "05/26 Merch Fee",
    date: "05/04/2026",
    batchType: "Manual" as const,
    journal: "Journal",
    amount: 611.08,
    expenseAccount: "76300-65"
  },
  {
    transNumber: "52672315",
    documentNumber: "Merch Billing",
    description: "Merch Billing",
    date: "05/18/2026",
    batchType: "Manual" as const,
    journal: "Journal",
    amount: 4198.22,
    expenseAccount: "76520-10"
  },
  {
    transNumber: "52672315-2",
    documentNumber: "Merch Billing",
    description: "Merch Billing",
    date: "05/18/2026",
    batchType: "Import" as const,
    journal: "Import",
    amount: 2590.74,
    expenseAccount: "76520-20"
  },
  {
    transNumber: "52672322",
    documentNumber: "Merch Billing",
    description: "Merch Billing",
    date: "05/18/2026",
    batchType: "Manual" as const,
    journal: "Journal",
    amount: 1565.43,
    expenseAccount: "76520-30"
  },
  {
    transNumber: "52672325",
    documentNumber: "Merch Billing",
    description: "Merch Billing",
    date: "05/18/2026",
    batchType: "Recurring" as const,
    journal: "Recurring",
    amount: 820.12,
    expenseAccount: "76520-40"
  },
  {
    transNumber: "52672328",
    documentNumber: "Merch Billing",
    description: "Merch Billing",
    date: "05/18/2026",
    batchType: "Manual" as const,
    journal: "Journal",
    amount: 630.85,
    expenseAccount: "76520-50"
  },
  {
    transNumber: "52685530",
    documentNumber: "Merch Billing",
    description: "Merch Billing",
    date: "05/14/2026",
    batchType: "Manual" as const,
    journal: "Journal",
    amount: 304.9,
    expenseAccount: "76520-60"
  }
];

function formatAmount(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function parseAmount(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildSeedLines(documentNumber: string, description: string, amount: number, expenseAccount: string): JournalEntryLine[] {
  return [
    {
      id: `${documentNumber}-payable`,
      account: "20210",
      documentNumber,
      description,
      debit: "0.00",
      credit: formatAmount(amount),
      reference1: "",
      reference2: "",
      scheduleType: "None",
      store: "CON"
    },
    {
      id: `${documentNumber}-expense`,
      account: expenseAccount,
      documentNumber,
      description,
      debit: formatAmount(amount),
      credit: "0.00",
      reference1: "",
      reference2: "",
      scheduleType: "None",
      store: "CON"
    }
  ];
}

function buildSeedTransactions(): JournalEntryTransaction[] {
  return seedTransactions.map((transaction) => ({
    id: transaction.transNumber,
    batchType: transaction.batchType,
    date: transaction.date,
    description: transaction.description,
    documentNumber: transaction.documentNumber,
    journal: transaction.journal,
    lines: buildSeedLines(transaction.documentNumber, transaction.description, transaction.amount, transaction.expenseAccount),
    transNumber: transaction.transNumber
  }));
}

function createDraftTransaction(sequence: number, batchType: BatchType): JournalEntryTransaction {
  const transNumber = `${sequence}`;
  const documentNumber = `Draft ${sequence}`;

  return {
    id: transNumber,
    batchType,
    date: "06/10/2026",
    description: "New Journal Entry",
    documentNumber,
    journal: batchType === "Manual" ? "Journal" : batchType,
    lines: [
      {
        id: `${transNumber}-line-1`,
        account: "20210",
        documentNumber,
        description: "New Journal Entry",
        debit: "0.00",
        credit: "0.00",
        reference1: "",
        reference2: "",
        scheduleType: "None",
        store: "CON"
      },
      {
        id: `${transNumber}-line-2`,
        account: "76300-60",
        documentNumber,
        description: "New Journal Entry",
        debit: "0.00",
        credit: "0.00",
        reference1: "",
        reference2: "",
        scheduleType: "None",
        store: "CON"
      }
    ],
    transNumber
  };
}

function isBalanced(lines: JournalEntryLine[]) {
  const totalDebit = lines.reduce((sum, line) => sum + parseAmount(line.debit), 0);
  const totalCredit = lines.reduce((sum, line) => sum + parseAmount(line.credit), 0);
  return Math.abs(totalDebit - totalCredit) < 0.005;
}

export function JournalEntryWorkspace({ storeName }: JournalEntryWorkspaceProps) {
  const [transactions, setTransactions] = useState<JournalEntryTransaction[]>(() => buildSeedTransactions());
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>(seedTransactions[0].transNumber);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(`${seedTransactions[0].documentNumber}-expense`);
  const [visibleBatches, setVisibleBatches] = useState<Record<BatchType, boolean>>({
    Manual: true,
    Import: false,
    Recurring: false
  });
  const [statusMessage, setStatusMessage] = useState(
    `Journal Entry is ready for ${storeName}. Select a transaction, adjust the lower lines, and keep the batch balanced before posting.`
  );
  const [nextTransactionSequence, setNextTransactionSequence] = useState(52690001);
  const [nextLineSequence, setNextLineSequence] = useState(1);

  const visibleTransactions = useMemo(
    () => transactions.filter((transaction) => visibleBatches[transaction.batchType]),
    [transactions, visibleBatches]
  );

  const selectedTransaction = useMemo(
    () => visibleTransactions.find((transaction) => transaction.id === selectedTransactionId) ?? visibleTransactions[0] ?? null,
    [selectedTransactionId, visibleTransactions]
  );

  const selectedTransactionBalance = useMemo(() => {
    if (!selectedTransaction) {
      return 0;
    }

    return selectedTransaction.lines.reduce((sum, line) => sum + parseAmount(line.debit) - parseAmount(line.credit), 0);
  }, [selectedTransaction]);

  useEffect(() => {
    if (!selectedTransaction) {
      setSelectedTransactionId("");
      setSelectedLineId(null);
      return;
    }

    if (selectedTransaction.id !== selectedTransactionId) {
      setSelectedTransactionId(selectedTransaction.id);
    }

    if (!selectedTransaction.lines.some((line) => line.id === selectedLineId)) {
      setSelectedLineId(selectedTransaction.lines[0]?.id ?? null);
    }
  }, [selectedLineId, selectedTransaction, selectedTransactionId]);

  function updateSelectedTransaction(updater: (transaction: JournalEntryTransaction) => JournalEntryTransaction) {
    setTransactions((current) => current.map((transaction) => (transaction.id === selectedTransactionId ? updater(transaction) : transaction)));
  }

  function handleToolbarAction(action: (typeof toolbarActions)[number]["id"]) {
    if (action === "new") {
      const nextBatchType = visibleBatches.Manual ? "Manual" : visibleBatches.Import ? "Import" : "Recurring";
      const nextTransaction = createDraftTransaction(nextTransactionSequence, nextBatchType);
      setTransactions((current) => [nextTransaction, ...current]);
      setSelectedTransactionId(nextTransaction.id);
      setSelectedLineId(nextTransaction.lines[0]?.id ?? null);
      setNextTransactionSequence((current) => current + 1);
      setStatusMessage(`Draft journal batch ${nextTransaction.transNumber} started in ${nextBatchType} mode.`);
      return;
    }

    if (!selectedTransaction) {
      setStatusMessage("Select a transaction before using the journal toolbar.");
      return;
    }

    if (action === "delete") {
      if (transactions.length <= 1) {
        setStatusMessage("At least one journal transaction must remain in view.");
        return;
      }

      setTransactions((current) => current.filter((transaction) => transaction.id !== selectedTransaction.id));
      setStatusMessage(`Journal transaction ${selectedTransaction.transNumber} removed from the batch list.`);
      return;
    }

    if (action === "deleteAll") {
      const retainedTransaction = buildSeedTransactions()[0];
      setTransactions([retainedTransaction]);
      setSelectedTransactionId(retainedTransaction.id);
      setSelectedLineId(retainedTransaction.lines[0]?.id ?? null);
      setStatusMessage("Journal transactions reset to the primary draft so entry can continue cleanly.");
      return;
    }

    if (action === "reverse") {
      const reversedTransaction = {
        ...selectedTransaction,
        id: `${nextTransactionSequence}`,
        transNumber: `${nextTransactionSequence}`,
        documentNumber: `${selectedTransaction.documentNumber} REV`,
        description: `${selectedTransaction.description} Reversal`,
        lines: selectedTransaction.lines.map((line, index) => ({
          ...line,
          id: `${nextTransactionSequence}-line-${index + 1}`,
          documentNumber: `${selectedTransaction.documentNumber} REV`,
          description: `${selectedTransaction.description} Reversal`,
          debit: line.credit,
          credit: line.debit
        }))
      };
      setTransactions((current) => [reversedTransaction, ...current]);
      setSelectedTransactionId(reversedTransaction.id);
      setSelectedLineId(reversedTransaction.lines[0]?.id ?? null);
      setNextTransactionSequence((current) => current + 1);
      setStatusMessage(`Reversal batch ${reversedTransaction.transNumber} created from ${selectedTransaction.transNumber}.`);
      return;
    }

    if (!isBalanced(selectedTransaction.lines)) {
      setStatusMessage(`Batch ${selectedTransaction.transNumber} is out of balance. Distribute or adjust the lines before posting.`);
      return;
    }

    setStatusMessage(`Batch ${selectedTransaction.transNumber} posted from ${selectedTransaction.batchType} journal entry.`);
  }

  function handleBatchVisibilityChange(batchType: BatchType) {
    setVisibleBatches((current) => ({
      ...current,
      [batchType]: !current[batchType]
    }));
  }

  function updateTransactionField(field: "batchType" | "date" | "journal", value: string) {
    updateSelectedTransaction((transaction) => ({
      ...transaction,
      [field]: value
    }));
  }

  function updateLine(lineId: string, field: keyof JournalEntryLine, value: string) {
    updateSelectedTransaction((transaction) => ({
      ...transaction,
      lines: transaction.lines.map((line) => {
        if (line.id !== lineId) {
          return line;
        }

        const nextLine = {
          ...line,
          [field]: value
        };

        if (field === "debit" && parseAmount(value) > 0) {
          nextLine.credit = "0.00";
        }

        if (field === "credit" && parseAmount(value) > 0) {
          nextLine.debit = "0.00";
        }

        return nextLine;
      })
    }));
  }

  function handleAddLine() {
    if (!selectedTransaction) {
      setStatusMessage("Select a transaction before adding journal lines.");
      return;
    }

    const nextLineId = `${selectedTransaction.id}-line-${nextLineSequence}`;
    updateSelectedTransaction((transaction) => ({
      ...transaction,
      lines: [
        ...transaction.lines,
        {
          id: nextLineId,
          account: "",
          documentNumber: transaction.documentNumber,
          description: transaction.description,
          debit: "0.00",
          credit: "0.00",
          reference1: "",
          reference2: "",
          scheduleType: "None",
          store: "CON"
        }
      ]
    }));
    setSelectedLineId(nextLineId);
    setNextLineSequence((current) => current + 1);
    setStatusMessage(`Added a new transaction line to batch ${selectedTransaction.transNumber}.`);
  }

  function handleRemoveLine() {
    if (!selectedTransaction || !selectedLineId) {
      setStatusMessage("Select a transaction line before removing it.");
      return;
    }

    if (selectedTransaction.lines.length <= 1) {
      setStatusMessage("The selected transaction needs at least one journal line.");
      return;
    }

    const remainingLines = selectedTransaction.lines.filter((line) => line.id !== selectedLineId);
    updateSelectedTransaction((transaction) => ({
      ...transaction,
      lines: remainingLines
    }));
    setSelectedLineId(remainingLines[0]?.id ?? null);
    setStatusMessage(`Removed the selected line from batch ${selectedTransaction.transNumber}.`);
  }

  function handleDistribute() {
    if (!selectedTransaction) {
      setStatusMessage("Select a transaction before distributing its balance.");
      return;
    }

    if (Math.abs(selectedTransactionBalance) < 0.005) {
      setStatusMessage(`Batch ${selectedTransaction.transNumber} is already in balance.`);
      return;
    }

    const nextLineId = `${selectedTransaction.id}-line-${nextLineSequence}`;
    const balanceAmount = Math.abs(selectedTransactionBalance);
    updateSelectedTransaction((transaction) => ({
      ...transaction,
      lines: [
        ...transaction.lines,
        {
          id: nextLineId,
          account: "99999",
          documentNumber: transaction.documentNumber,
          description: "Auto-balance distribution",
          debit: selectedTransactionBalance < 0 ? formatAmount(balanceAmount) : "0.00",
          credit: selectedTransactionBalance > 0 ? formatAmount(balanceAmount) : "0.00",
          reference1: "DIST",
          reference2: "AUTO",
          scheduleType: "None",
          store: "CON"
        }
      ]
    }));
    setSelectedLineId(nextLineId);
    setNextLineSequence((current) => current + 1);
    setStatusMessage(`Auto-distribution line added to bring batch ${selectedTransaction.transNumber} back into balance.`);
  }

  function handleSaveBatch() {
    if (!selectedTransaction) {
      setStatusMessage("There is no selected transaction to save.");
      return;
    }

    if (!isBalanced(selectedTransaction.lines)) {
      setStatusMessage(`Batch ${selectedTransaction.transNumber} is out of balance by ${formatAmount(Math.abs(selectedTransactionBalance))}. Save after balancing the journal lines.`);
      return;
    }

    setStatusMessage(`Batch ${selectedTransaction.transNumber} saved for ${storeName}. It is ready to stay pinned in the operator flow.`);
  }

  return (
    <div className="journal-entry-page">
      <section aria-label="Journal entry" className="journal-entry-window">
        <header className="journal-entry-titlebar">
          <div className="journal-entry-titlebar-copy">
            <h2>Journal Entry</h2>
            <span className="journal-entry-titlebar-kicker">GL ENTRY</span>
          </div>
          <div className="journal-entry-titlebar-meta">
            <span>{storeName}</span>
            <small>General Ledger</small>
          </div>
          <div aria-hidden="true" className="journal-entry-window-controls">
            <span className="journal-entry-window-control">_</span>
            <span className="journal-entry-window-control">[]</span>
            <span className="journal-entry-window-control is-close">X</span>
          </div>
        </header>

        <div className="journal-entry-toolbar">
          <div className="journal-entry-toolbar-actions">
            {toolbarActions.map((action) => (
              <button className="journal-entry-toolbar-button" key={action.id} onClick={() => handleToolbarAction(action.id)} type="button">
                <i>{action.icon}</i>
                <span>{action.label}</span>
                <small>{action.shortcut}</small>
              </button>
            ))}
          </div>

          <div className="journal-entry-toolbar-summary">
            <div>
              <span>Visible</span>
              <strong>{visibleTransactions.length}</strong>
            </div>
            <div>
              <span>Selected Batch</span>
              <strong>{selectedTransaction?.batchType ?? "None"}</strong>
            </div>
            <div>
              <span>Journal</span>
              <strong>{selectedTransaction?.journal ?? "Journal"}</strong>
            </div>
          </div>
        </div>

        <div className="journal-entry-statusbar">
          <span>{statusMessage}</span>
          <strong>{selectedTransaction ? `${selectedTransaction.transNumber} ${isBalanced(selectedTransaction.lines) ? "In Balance" : "Needs Review"}` : "No Transaction Selected"}</strong>
        </div>

        <div className="journal-entry-body">
          <section className="journal-entry-panel">
            <div className="journal-entry-panel-header">
              <strong>Journal Transactions</strong>
              <div className="journal-entry-batch-filters">
                {(["Manual", "Import", "Recurring"] as BatchType[]).map((batchType) => (
                  <label className="journal-entry-filter-chip" key={batchType}>
                    <input checked={visibleBatches[batchType]} onChange={() => handleBatchVisibilityChange(batchType)} type="checkbox" />
                    <span>{batchType} Batch</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="journal-entry-table-shell is-transactions">
              <table className="journal-entry-table">
                <thead>
                  <tr>
                    <th />
                    <th>Trans #</th>
                    <th>Document #</th>
                    <th>Description</th>
                    <th>Date</th>
                    <th>In Balance</th>
                    <th>Batch</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTransactions.length === 0 ? (
                    <tr>
                      <td className="journal-entry-empty-state" colSpan={7}>Enable at least one batch type to view Journal Transactions.</td>
                    </tr>
                  ) : (
                    visibleTransactions.map((transaction) => {
                      const balanced = isBalanced(transaction.lines);
                      const isSelected = transaction.id === selectedTransaction?.id;

                      return (
                        <tr
                          aria-selected={isSelected}
                          className={isSelected ? "is-selected" : undefined}
                          key={transaction.id}
                          onClick={() => setSelectedTransactionId(transaction.id)}
                        >
                          <td className="journal-entry-indicator-cell">{isSelected ? "*" : ""}</td>
                          <td>{transaction.transNumber}</td>
                          <td>{transaction.documentNumber}</td>
                          <td>{transaction.description}</td>
                          <td>{transaction.date}</td>
                          <td>
                            <span className={`journal-entry-balance-dot${balanced ? " is-balanced" : " is-open"}`} />
                          </td>
                          <td>{transaction.batchType}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="journal-entry-panel journal-entry-lines-panel">
            <div className="journal-entry-panel-header is-lines-header">
              <strong>Transaction Lines</strong>
              <div className="journal-entry-lines-controls">
                <div className="journal-entry-radio-row">
                  {(["Manual", "Import", "Recurring"] as BatchType[]).map((batchType) => (
                    <label key={batchType}>
                      <input
                        checked={selectedTransaction?.batchType === batchType}
                        disabled={!selectedTransaction}
                        name="journal-batch-type"
                        onChange={(event) => {
                          if (event.target.checked) {
                            updateTransactionField("batchType", batchType);
                          }
                        }}
                        type="radio"
                      />
                      <span>{batchType}</span>
                    </label>
                  ))}
                </div>

                <label className="journal-entry-inline-field is-journal-field">
                  <span>Journal</span>
                  <select
                    disabled={!selectedTransaction}
                    onChange={(event) => updateTransactionField("journal", event.target.value)}
                    value={selectedTransaction?.journal ?? "Journal"}
                  >
                    <option>Journal</option>
                    <option>Import</option>
                    <option>Recurring</option>
                  </select>
                </label>

                <label className="journal-entry-inline-field is-date-field">
                  <span>Date</span>
                  <input
                    disabled={!selectedTransaction}
                    onChange={(event) => updateTransactionField("date", event.target.value)}
                    value={selectedTransaction?.date ?? ""}
                  />
                </label>
              </div>
            </div>

            <div className="journal-entry-table-shell is-lines">
              <table className="journal-entry-table is-lines-table">
                <thead>
                  <tr>
                    <th>GL Account</th>
                    <th>Document #</th>
                    <th>Description</th>
                    <th>Debit</th>
                    <th>Credit</th>
                    <th>Reference 1</th>
                    <th>Reference 2</th>
                    <th>Schedule Type</th>
                    <th>Store</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTransaction?.lines.map((line) => {
                    const isSelected = line.id === selectedLineId;

                    return (
                      <tr aria-selected={isSelected} className={isSelected ? "is-selected" : undefined} key={line.id}>
                        <td>
                          <input
                            onChange={(event) => updateLine(line.id, "account", event.target.value)}
                            onFocus={() => setSelectedLineId(line.id)}
                            value={line.account}
                          />
                        </td>
                        <td>
                          <input
                            onChange={(event) => updateLine(line.id, "documentNumber", event.target.value)}
                            onFocus={() => setSelectedLineId(line.id)}
                            value={line.documentNumber}
                          />
                        </td>
                        <td>
                          <input
                            onChange={(event) => updateLine(line.id, "description", event.target.value)}
                            onFocus={() => setSelectedLineId(line.id)}
                            value={line.description}
                          />
                        </td>
                        <td>
                          <input
                            inputMode="decimal"
                            onChange={(event) => updateLine(line.id, "debit", event.target.value)}
                            onFocus={() => setSelectedLineId(line.id)}
                            value={line.debit}
                          />
                        </td>
                        <td>
                          <input
                            inputMode="decimal"
                            onChange={(event) => updateLine(line.id, "credit", event.target.value)}
                            onFocus={() => setSelectedLineId(line.id)}
                            value={line.credit}
                          />
                        </td>
                        <td>
                          <input
                            onChange={(event) => updateLine(line.id, "reference1", event.target.value)}
                            onFocus={() => setSelectedLineId(line.id)}
                            value={line.reference1}
                          />
                        </td>
                        <td>
                          <input
                            onChange={(event) => updateLine(line.id, "reference2", event.target.value)}
                            onFocus={() => setSelectedLineId(line.id)}
                            value={line.reference2}
                          />
                        </td>
                        <td>
                          <input
                            onChange={(event) => updateLine(line.id, "scheduleType", event.target.value)}
                            onFocus={() => setSelectedLineId(line.id)}
                            value={line.scheduleType}
                          />
                        </td>
                        <td>
                          <input
                            onChange={(event) => updateLine(line.id, "store", event.target.value)}
                            onFocus={() => setSelectedLineId(line.id)}
                            value={line.store}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="journal-entry-footer">
              <div className="journal-entry-inline-actions">
                <button className="journal-entry-secondary-button" onClick={handleAddLine} type="button">Add Line</button>
                <button className="journal-entry-secondary-button" onClick={handleRemoveLine} type="button">Remove Line</button>
                <button className="journal-entry-secondary-button" onClick={handleDistribute} type="button">Distribute</button>
              </div>

              <div className="journal-entry-footer-actions">
                <div className={`journal-entry-balance-pill${Math.abs(selectedTransactionBalance) < 0.005 ? " is-balanced" : ""}`}>
                  <span>Balance</span>
                  <strong>{formatAmount(Math.abs(selectedTransactionBalance))}</strong>
                </div>
                <button className="journal-entry-primary-button" onClick={handleSaveBatch} type="button">Save Batch</button>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}