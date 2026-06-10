import { useEffect, useMemo, useState } from "react";

type RangeFilterMode = "All" | "Between" | "Equals" | "Starts With";
type InquiryTab = "activityDocument" | "postingRegister";

interface TransactionInquiryLine {
  id: string;
  account: string;
  accountDescription: string;
  credit: number;
  debit: number;
  store: string;
}

interface TransactionInquiryRecord {
  id: string;
  transNumber: string;
  documentNumber: string;
  description: string;
  journal: string;
  date: string;
  storeCode: string;
  activityDocument: string;
  postingRegister: string;
  lines: TransactionInquiryLine[];
}

interface FilterFormState {
  transactionNumber: string;
  documentNumber: string;
  journal: string;
  description: string;
  storeCode: string;
  dateRangeMode: RangeFilterMode;
  dateFrom: string;
  dateThrough: string;
  accountRangeMode: RangeFilterMode;
  accountFrom: string;
  accountThrough: string;
  debitAmountRangeMode: RangeFilterMode;
  debitFrom: string;
  debitThrough: string;
  creditAmountRangeMode: RangeFilterMode;
  creditFrom: string;
  creditThrough: string;
}

interface TransactionInquiryWorkspaceProps {
  storeName: string;
}

const journals = ["All Journal Types", "Journal", "Import", "Recurring", "Adjustments"];
const storeCodes = ["All Stores", "CON", "FTL", "NOC"];
const rangeModes: RangeFilterMode[] = ["All", "Between", "Equals", "Starts With"];

const inquiryRecords: TransactionInquiryRecord[] = [
  {
    id: "inq-52659169",
    transNumber: "52659169",
    documentNumber: "05/26 Merch Fee",
    description: "Merchant fee sweep",
    journal: "Journal",
    date: "05/04/2026",
    storeCode: "CON",
    activityDocument: "AD-52659169 posted by Accounting after daily merchant fee import reconciliation.",
    postingRegister: "PR-52659169 included in register 05-04-PM close batch.",
    lines: [
      { id: "inq-52659169-1", account: "20210", accountDescription: "Accounts Payable", debit: 0, credit: 2462.13, store: "CON" },
      { id: "inq-52659169-2", account: "76300-60", accountDescription: "Merchant Fees", debit: 2462.13, credit: 0, store: "CON" }
    ]
  },
  {
    id: "inq-52659175",
    transNumber: "52659175",
    documentNumber: "05/26 Merch Fee",
    description: "Merchant fee secondary sweep",
    journal: "Journal",
    date: "05/04/2026",
    storeCode: "CON",
    activityDocument: "AD-52659175 posted for the follow-up merchant fee adjustment.",
    postingRegister: "PR-52659175 included in register 05-04-PM close batch.",
    lines: [
      { id: "inq-52659175-1", account: "20210", accountDescription: "Accounts Payable", debit: 0, credit: 1830.54, store: "CON" },
      { id: "inq-52659175-2", account: "76300-61", accountDescription: "Merchant Fees - Misc", debit: 1830.54, credit: 0, store: "CON" }
    ]
  },
  {
    id: "inq-52672315",
    transNumber: "52672315",
    documentNumber: "Merch Billing",
    description: "Merchandise billing closeout",
    journal: "Journal",
    date: "05/18/2026",
    storeCode: "CON",
    activityDocument: "AD-52672315 completed after merch billing closeout was reviewed by the controller.",
    postingRegister: "PR-52672315 posted in the 05-18 evening register.",
    lines: [
      { id: "inq-52672315-1", account: "20210", accountDescription: "Accounts Payable", debit: 0, credit: 4198.22, store: "CON" },
      { id: "inq-52672315-2", account: "76520-10", accountDescription: "Merch Billing Expense", debit: 4198.22, credit: 0, store: "CON" }
    ]
  },
  {
    id: "inq-52672322",
    transNumber: "52672322",
    documentNumber: "Merch Billing",
    description: "Merchandise billing imported batch",
    journal: "Import",
    date: "05/18/2026",
    storeCode: "FTL",
    activityDocument: "AD-52672322 imported from the merch billing connector and staged for review.",
    postingRegister: "PR-52672322 added to the import posting register queue.",
    lines: [
      { id: "inq-52672322-1", account: "20210", accountDescription: "Accounts Payable", debit: 0, credit: 1565.43, store: "FTL" },
      { id: "inq-52672322-2", account: "76520-30", accountDescription: "Merch Billing Expense", debit: 1565.43, credit: 0, store: "FTL" }
    ]
  },
  {
    id: "inq-52672328",
    transNumber: "52672328",
    documentNumber: "Month End Allocation",
    description: "Recurring merch allocation",
    journal: "Recurring",
    date: "05/31/2026",
    storeCode: "NOC",
    activityDocument: "AD-52672328 generated from the recurring allocation template at month end.",
    postingRegister: "PR-52672328 queued for recurring post approval.",
    lines: [
      { id: "inq-52672328-1", account: "61500", accountDescription: "Shop Supplies", debit: 1850, credit: 0, store: "NOC" },
      { id: "inq-52672328-2", account: "20210", accountDescription: "Accounts Payable", debit: 0, credit: 1850, store: "NOC" }
    ]
  }
];

function createDefaultFilters(): FilterFormState {
  return {
    transactionNumber: "",
    documentNumber: "",
    journal: "All Journal Types",
    description: "",
    storeCode: "All Stores",
    dateRangeMode: "All",
    dateFrom: "",
    dateThrough: "",
    accountRangeMode: "All",
    accountFrom: "",
    accountThrough: "",
    debitAmountRangeMode: "All",
    debitFrom: "0.00",
    debitThrough: "0.00",
    creditAmountRangeMode: "All",
    creditFrom: "0.00",
    creditThrough: "0.00"
  };
}

function parseCurrency(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function matchesRange(mode: RangeFilterMode, fromValue: string, throughValue: string, candidate: string) {
  const normalizedCandidate = normalizeText(candidate);
  const normalizedFrom = normalizeText(fromValue);
  const normalizedThrough = normalizeText(throughValue);

  if (mode === "All") {
    return true;
  }

  if (mode === "Equals") {
    return !normalizedFrom || normalizedCandidate === normalizedFrom;
  }

  if (mode === "Starts With") {
    return !normalizedFrom || normalizedCandidate.startsWith(normalizedFrom);
  }

  if (!normalizedFrom && !normalizedThrough) {
    return true;
  }

  if (normalizedFrom && normalizedCandidate < normalizedFrom) {
    return false;
  }

  if (normalizedThrough && normalizedCandidate > normalizedThrough) {
    return false;
  }

  return true;
}

function matchesAmountRange(mode: RangeFilterMode, fromValue: string, throughValue: string, candidate: number) {
  if (mode === "All") {
    return true;
  }

  const fromAmount = parseCurrency(fromValue);
  const throughAmount = parseCurrency(throughValue);

  if (mode === "Equals") {
    return candidate === fromAmount;
  }

  if (mode === "Starts With") {
    return candidate.toFixed(2).startsWith(fromAmount.toFixed(2).replace(/\.00$/, ""));
  }

  return candidate >= fromAmount && (throughValue.trim() === "" || throughAmount === 0 || candidate <= throughAmount);
}

function matchesFilters(record: TransactionInquiryRecord, filters: FilterFormState) {
  if (normalizeText(filters.transactionNumber) && !normalizeText(record.transNumber).includes(normalizeText(filters.transactionNumber))) {
    return false;
  }

  if (normalizeText(filters.documentNumber) && !normalizeText(record.documentNumber).includes(normalizeText(filters.documentNumber))) {
    return false;
  }

  if (normalizeText(filters.description) && !normalizeText(record.description).includes(normalizeText(filters.description))) {
    return false;
  }

  if (filters.journal !== "All Journal Types" && record.journal !== filters.journal) {
    return false;
  }

  if (filters.storeCode !== "All Stores" && record.storeCode !== filters.storeCode) {
    return false;
  }

  if (!matchesRange(filters.dateRangeMode, filters.dateFrom, filters.dateThrough, record.date)) {
    return false;
  }

  if (!record.lines.some((line) => matchesRange(filters.accountRangeMode, filters.accountFrom, filters.accountThrough, line.account))) {
    return false;
  }

  const totalDebit = record.lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = record.lines.reduce((sum, line) => sum + line.credit, 0);

  if (!matchesAmountRange(filters.debitAmountRangeMode, filters.debitFrom, filters.debitThrough, totalDebit)) {
    return false;
  }

  if (!matchesAmountRange(filters.creditAmountRangeMode, filters.creditFrom, filters.creditThrough, totalCredit)) {
    return false;
  }

  return true;
}

export function TransactionInquiryWorkspace({ storeName }: TransactionInquiryWorkspaceProps) {
  const [filters, setFilters] = useState<FilterFormState>(() => createDefaultFilters());
  const [appliedFilters, setAppliedFilters] = useState<FilterFormState>(() => createDefaultFilters());
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(inquiryRecords[0]?.id ?? null);
  const [activeTab, setActiveTab] = useState<InquiryTab>("activityDocument");
  const [statusMessage, setStatusMessage] = useState(
    `Transaction Inquiry is ready for ${storeName}. Set search criteria, run Find, and review the journal entries below.`
  );

  const filteredTransactions = useMemo(
    () => inquiryRecords.filter((record) => matchesFilters(record, appliedFilters)),
    [appliedFilters]
  );

  useEffect(() => {
    setSelectedTransactionId((current) =>
      current && filteredTransactions.some((record) => record.id === current) ? current : filteredTransactions[0]?.id ?? null
    );
  }, [filteredTransactions]);

  const selectedTransaction = useMemo(
    () => filteredTransactions.find((record) => record.id === selectedTransactionId) ?? null,
    [filteredTransactions, selectedTransactionId]
  );

  function updateFilter<K extends keyof FilterFormState>(field: K, value: FilterFormState[K]) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function handleFind() {
    const nextFilters = { ...filters };
    const nextResults = inquiryRecords.filter((record) => matchesFilters(record, nextFilters));

    setAppliedFilters(nextFilters);
    setSelectedTransactionId(nextResults[0]?.id ?? null);
    setStatusMessage(`Found Transactions: ${nextResults.length}. Refine criteria or select a transaction to inspect the journal entries.`);
  }

  function handleClear() {
    const defaults = createDefaultFilters();
    setFilters(defaults);
    setAppliedFilters(defaults);
    setSelectedTransactionId(inquiryRecords[0]?.id ?? null);
    setStatusMessage(`Transaction Inquiry was cleared for ${storeName}. All transactions are back in view.`);
  }

  return (
    <div className="transaction-inquiry-page">
      <section aria-label="Transaction inquiry" className="transaction-inquiry-window">
        <header className="transaction-inquiry-titlebar">
          <div className="transaction-inquiry-titlebar-copy">
            <h2>Transaction Inquiry</h2>
            <span className="transaction-inquiry-titlebar-kicker">GL SEARCH</span>
          </div>
          <div className="transaction-inquiry-titlebar-meta">
            <span>{storeName}</span>
            <small>General Ledger</small>
          </div>
          <div aria-hidden="true" className="transaction-inquiry-window-controls">
            <span className="transaction-inquiry-window-control">_</span>
            <span className="transaction-inquiry-window-control">[]</span>
            <span className="transaction-inquiry-window-control is-close">X</span>
          </div>
        </header>

        <div className="transaction-inquiry-statusbar">
          <span>{statusMessage}</span>
          <strong>Found Transactions: {filteredTransactions.length}</strong>
        </div>

        <div className="transaction-inquiry-body">
          <section className="transaction-inquiry-search-panel">
            <div className="transaction-inquiry-panel-caption">Search Criteria</div>
            <div className="transaction-inquiry-search-grid">
              <label className="transaction-inquiry-field">
                <span>Transaction #</span>
                <input onChange={(event) => updateFilter("transactionNumber", event.target.value)} value={filters.transactionNumber} />
              </label>
              <label className="transaction-inquiry-field">
                <span>Document #</span>
                <input onChange={(event) => updateFilter("documentNumber", event.target.value)} value={filters.documentNumber} />
              </label>
              <label className="transaction-inquiry-field">
                <span>Journal</span>
                <select onChange={(event) => updateFilter("journal", event.target.value)} value={filters.journal}>
                  {journals.map((journal) => (
                    <option key={journal}>{journal}</option>
                  ))}
                </select>
              </label>
              <div className="transaction-inquiry-button-row">
                <button className="transaction-inquiry-primary-button" onClick={handleFind} type="button">Find</button>
                <button className="transaction-inquiry-secondary-button" onClick={handleClear} type="button">Clear</button>
              </div>

              <label className="transaction-inquiry-field is-wide">
                <span>Description</span>
                <input onChange={(event) => updateFilter("description", event.target.value)} value={filters.description} />
              </label>
              <label className="transaction-inquiry-field">
                <span>Store Code</span>
                <select onChange={(event) => updateFilter("storeCode", event.target.value)} value={filters.storeCode}>
                  {storeCodes.map((storeCode) => (
                    <option key={storeCode}>{storeCode}</option>
                  ))}
                </select>
              </label>

              <label className="transaction-inquiry-field is-range-label">
                <span>Date Range</span>
                <select onChange={(event) => updateFilter("dateRangeMode", event.target.value as RangeFilterMode)} value={filters.dateRangeMode}>
                  {rangeModes.map((mode) => (
                    <option key={mode}>{mode}</option>
                  ))}
                </select>
              </label>
              <label className="transaction-inquiry-field is-inline-mini">
                <span>From</span>
                <input onChange={(event) => updateFilter("dateFrom", event.target.value)} value={filters.dateFrom} />
              </label>
              <label className="transaction-inquiry-field is-inline-mini">
                <span>Through</span>
                <input onChange={(event) => updateFilter("dateThrough", event.target.value)} value={filters.dateThrough} />
              </label>

              <label className="transaction-inquiry-field is-range-label">
                <span>Account Range</span>
                <select onChange={(event) => updateFilter("accountRangeMode", event.target.value as RangeFilterMode)} value={filters.accountRangeMode}>
                  {rangeModes.map((mode) => (
                    <option key={mode}>{mode}</option>
                  ))}
                </select>
              </label>
              <label className="transaction-inquiry-field is-inline-mini">
                <span>From</span>
                <input onChange={(event) => updateFilter("accountFrom", event.target.value)} value={filters.accountFrom} />
              </label>
              <label className="transaction-inquiry-field is-inline-mini">
                <span>Through</span>
                <input onChange={(event) => updateFilter("accountThrough", event.target.value)} value={filters.accountThrough} />
              </label>

              <label className="transaction-inquiry-field is-range-label">
                <span>Debit Amt Range</span>
                <select
                  onChange={(event) => updateFilter("debitAmountRangeMode", event.target.value as RangeFilterMode)}
                  value={filters.debitAmountRangeMode}
                >
                  {rangeModes.map((mode) => (
                    <option key={mode}>{mode}</option>
                  ))}
                </select>
              </label>
              <label className="transaction-inquiry-field is-inline-mini">
                <span>From</span>
                <input onChange={(event) => updateFilter("debitFrom", event.target.value)} value={filters.debitFrom} />
              </label>
              <label className="transaction-inquiry-field is-inline-mini">
                <span>Through</span>
                <input onChange={(event) => updateFilter("debitThrough", event.target.value)} value={filters.debitThrough} />
              </label>

              <label className="transaction-inquiry-field is-range-label">
                <span>Credit Amt Range</span>
                <select
                  onChange={(event) => updateFilter("creditAmountRangeMode", event.target.value as RangeFilterMode)}
                  value={filters.creditAmountRangeMode}
                >
                  {rangeModes.map((mode) => (
                    <option key={mode}>{mode}</option>
                  ))}
                </select>
              </label>
              <label className="transaction-inquiry-field is-inline-mini">
                <span>From</span>
                <input onChange={(event) => updateFilter("creditFrom", event.target.value)} value={filters.creditFrom} />
              </label>
              <label className="transaction-inquiry-field is-inline-mini">
                <span>Through</span>
                <input onChange={(event) => updateFilter("creditThrough", event.target.value)} value={filters.creditThrough} />
              </label>
            </div>
          </section>

          <section className="transaction-inquiry-transactions-panel">
            <div className="transaction-inquiry-panel-caption">Transactions</div>
            <div className="transaction-inquiry-table-shell is-transactions">
              <table className="transaction-inquiry-table">
                <thead>
                  <tr>
                    <th>Trans #</th>
                    <th>Doc #</th>
                    <th>Description</th>
                    <th>Journal</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td className="transaction-inquiry-empty-state" colSpan={5}>No transactions match the current inquiry criteria.</td>
                    </tr>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <tr
                        aria-selected={transaction.id === selectedTransactionId}
                        className={transaction.id === selectedTransactionId ? "is-selected" : undefined}
                        key={transaction.id}
                        onClick={() => setSelectedTransactionId(transaction.id)}
                      >
                        <td>{transaction.transNumber}</td>
                        <td>{transaction.documentNumber}</td>
                        <td>{transaction.description}</td>
                        <td>{transaction.journal}</td>
                        <td>{transaction.date}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="transaction-inquiry-tab-row">
            <button
              className={`transaction-inquiry-tab${activeTab === "activityDocument" ? " is-active" : ""}`}
              onClick={() => setActiveTab("activityDocument")}
              type="button"
            >
              Activity Document
            </button>
            <button
              className={`transaction-inquiry-tab${activeTab === "postingRegister" ? " is-active" : ""}`}
              onClick={() => setActiveTab("postingRegister")}
              type="button"
            >
              Posting Register
            </button>
            <div className="transaction-inquiry-tab-summary">
              {selectedTransaction
                ? activeTab === "activityDocument"
                  ? selectedTransaction.activityDocument
                  : selectedTransaction.postingRegister
                : "Select a transaction to review inquiry details."}
            </div>
          </div>

          <section className="transaction-inquiry-entries-panel">
            <div className="transaction-inquiry-panel-caption">Journal Entries</div>
            <div className="transaction-inquiry-table-shell is-entries">
              <table className="transaction-inquiry-table">
                <thead>
                  <tr>
                    <th>G/L Account</th>
                    <th>Account Description</th>
                    <th>Debit</th>
                    <th>Credit</th>
                    <th>Store</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTransaction ? (
                    selectedTransaction.lines.map((line) => (
                      <tr key={line.id}>
                        <td>{line.account}</td>
                        <td>{line.accountDescription}</td>
                        <td>{formatCurrency(line.debit)}</td>
                        <td>{formatCurrency(line.credit)}</td>
                        <td>{line.store}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="transaction-inquiry-empty-state" colSpan={5}>Select a transaction to view its journal entries.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}