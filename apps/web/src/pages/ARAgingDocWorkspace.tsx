import { useMemo, useState } from "react";

type CustomerTypeOption = {
  id: string;
  label: string;
};

type AccountOption = {
  id: string;
  number: string;
  description: string;
};

type AgingLine = {
  id: string;
  documentNumber: string;
  date: string;
  description: string;
  days0To30: string;
  days31To60: string;
  days61To90: string;
  days91To120: string;
  over120: string;
  total: string;
};

const customerTypeOptions: CustomerTypeOption[] = [
  { id: "financing-draft", label: "Financing - Draft" },
  { id: "affiliate", label: "Affiliate" },
  { id: "corporate", label: "Corporate" },
  { id: "financing-contract", label: "Financing - Contract" },
  { id: "employee", label: "Employee" },
  { id: "internal", label: "Internal" }
];

const accountOptions: AccountOption[] = [
  { id: "20500", number: "20500", description: "Contracts In Transit" },
  { id: "22500", number: "22500", description: "Finance Income Receivable" },
  { id: "22000", number: "22000", description: "Accounts Receivable" },
  { id: "22300", number: "22300", description: "PO's In Transit Receivables" },
  { id: "22203", number: "22203", description: "Purchase Rebate - Yamaha Fall Order" },
  { id: "22208", number: "22208", description: "Purchase Rebate - Ranger" }
];

const agingLines: AgingLine[] = [
  {
    id: "ar-001",
    documentNumber: "51180762",
    date: "05/05/2026",
    description: "Miscellaneous Receipt 51180762 - RICE FUNDING 3002494",
    days0To30: "($36,619.13)",
    days31To60: "",
    days61To90: "",
    days91To120: "",
    over120: "",
    total: "($36,619.13)"
  },
  {
    id: "ar-002",
    documentNumber: "51771445",
    date: "05/22/2026",
    description: "Miscellaneous Receipt 51771445 - RICE FUNDING 3003339",
    days0To30: "($26,108.90)",
    days31To60: "",
    days61To90: "",
    days91To120: "",
    over120: "",
    total: "($26,108.90)"
  },
  {
    id: "ar-003",
    documentNumber: "51802418",
    date: "05/27/2026",
    description: "Finance reserve receivable - pending lender remit",
    days0To30: "$18,445.00",
    days31To60: "",
    days61To90: "",
    days91To120: "",
    over120: "",
    total: "$18,445.00"
  }
];

interface ARAgingDocWorkspaceProps {
  storeName: string;
}

export function ARAgingDocWorkspace({ storeName }: ARAgingDocWorkspaceProps) {
  const [selectedCustomerTypeIds, setSelectedCustomerTypeIds] = useState<string[]>(customerTypeOptions.map((option) => option.id));
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(accountOptions.map((option) => option.id));
  const [customersValue, setCustomersValue] = useState("All Customers");
  const [accountTypeValue, setAccountTypeValue] = useState("Both");
  const [formatValue, setFormatValue] = useState("Detail");
  const [sortByValue, setSortByValue] = useState("Customer Name");
  const [pageLayoutValue, setPageLayoutValue] = useState("Portrait");
  const [storeValue, setStoreValue] = useState("All Stores");
  const [cutoffDate, setCutoffDate] = useState("2026-05-28");
  const [fromValue, setFromValue] = useState("");
  const [toValue, setToValue] = useState("");
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [statusNotice, setStatusNotice] = useState("Report preview is ready to generate from mock receivables data.");

  const printedOnLabel = "5/28/26 4:49 PM";
  const cutoffDateLabel = useMemo(() => {
    const [year, month, day] = cutoffDate.split("-");
    return `${month}/${day}/${year}`;
  }, [cutoffDate]);
  const selectedCustomerLabels = useMemo(
    () => customerTypeOptions.filter((option) => selectedCustomerTypeIds.includes(option.id)).map((option) => option.label),
    [selectedCustomerTypeIds]
  );
  const selectedAccounts = useMemo(
    () => accountOptions.filter((option) => selectedAccountIds.includes(option.id)),
    [selectedAccountIds]
  );

  function toggleCustomerType(id: string) {
    setSelectedCustomerTypeIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    );
  }

  function toggleAccount(id: string) {
    setSelectedAccountIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    );
  }

  function handleSchedule() {
    setStatusNotice("AR Aging Doc scheduled in mock mode. Delivery will stay local until backend wiring is added.");
  }

  function handleReport() {
    setIsPreviewVisible(true);
    setStatusNotice("AR Aging report generated from mock receivables data.");
  }

  return (
    <div className="ar-aging-doc-page">
      <div className="ar-aging-doc-shell">
        <div className="ar-aging-doc-actions">
          <div>
            <h2>AR Aging Report</h2>
            <p>Lightspeed-style receivables aging document surface with mock data, preview controls, and report output.</p>
          </div>
          <div className="ar-aging-doc-action-buttons">
            <button className="ar-aging-doc-action-button" onClick={handleSchedule} type="button">
              <span className="ar-aging-doc-action-icon">S</span>
              <span>Schedule</span>
            </button>
            <button aria-label="Generate AR Aging report" className="ar-aging-doc-action-button is-primary" onClick={handleReport} type="button">
              <span className="ar-aging-doc-action-icon">R</span>
              <span>Report</span>
            </button>
          </div>
        </div>

        <div className="ar-aging-doc-notice">{statusNotice}</div>

        <section className="ar-aging-doc-panel">
          <div className="ar-aging-doc-grid">
            <label className="ar-aging-doc-field">
              <span>Customers</span>
              <select onChange={(event) => setCustomersValue(event.target.value)} value={customersValue}>
                <option>All Customers</option>
                <option>Open Balances Only</option>
                <option>Finance Accounts</option>
              </select>
            </label>
            <label className="ar-aging-doc-field">
              <span>From</span>
              <input onChange={(event) => setFromValue(event.target.value)} type="text" value={fromValue} />
            </label>
            <label className="ar-aging-doc-field">
              <span>To</span>
              <input onChange={(event) => setToValue(event.target.value)} type="text" value={toValue} />
            </label>
            <label className="ar-aging-doc-field">
              <span>Account Type</span>
              <select onChange={(event) => setAccountTypeValue(event.target.value)} value={accountTypeValue}>
                <option>Both</option>
                <option>Open Items</option>
                <option>Balance Forward</option>
              </select>
            </label>
            <label className="ar-aging-doc-field">
              <span>Sort By</span>
              <select onChange={(event) => setSortByValue(event.target.value)} value={sortByValue}>
                <option>Customer Name</option>
                <option>Customer Number</option>
                <option>Balance</option>
              </select>
            </label>
            <label className="ar-aging-doc-field">
              <span>Page Layout</span>
              <select onChange={(event) => setPageLayoutValue(event.target.value)} value={pageLayoutValue}>
                <option>Portrait</option>
                <option>Landscape</option>
              </select>
            </label>
            <label className="ar-aging-doc-field">
              <span>Format</span>
              <select onChange={(event) => setFormatValue(event.target.value)} value={formatValue}>
                <option>Detail</option>
                <option>Summary</option>
              </select>
            </label>
            <label className="ar-aging-doc-field">
              <span>Cutoff Date</span>
              <input onChange={(event) => setCutoffDate(event.target.value)} type="date" value={cutoffDate} />
            </label>
            <label className="ar-aging-doc-field">
              <span>Store</span>
              <select onChange={(event) => setStoreValue(event.target.value)} value={storeValue}>
                <option>All Stores</option>
                <option>{storeName}</option>
              </select>
            </label>
          </div>

          <div className="ar-aging-doc-selection-grid">
            <section className="ar-aging-doc-selection-panel">
              <header>
                <strong>Customer Types</strong>
                <span>{selectedCustomerLabels.length} selected</span>
              </header>
              <div className="ar-aging-doc-selection-table">
                {customerTypeOptions.map((option) => (
                  <label className="ar-aging-doc-selection-row" key={option.id}>
                    <input
                      checked={selectedCustomerTypeIds.includes(option.id)}
                      onChange={() => toggleCustomerType(option.id)}
                      type="checkbox"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="ar-aging-doc-selection-panel">
              <header>
                <strong>GL Accounts</strong>
                <span>{selectedAccounts.length} selected</span>
              </header>
              <div className="ar-aging-doc-selection-table is-gl-accounts">
                {accountOptions.map((option) => (
                  <label className="ar-aging-doc-selection-row is-account" key={option.id}>
                    <input checked={selectedAccountIds.includes(option.id)} onChange={() => toggleAccount(option.id)} type="checkbox" />
                    <span className="ar-aging-doc-account-number">{option.number}</span>
                    <span>{option.description}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="ar-aging-doc-preview-panel">
          <div className="ar-aging-doc-preview-heading">
            <strong>Preview</strong>
            <span>{isPreviewVisible ? "Page 1 of 100" : "No document generated"}</span>
          </div>

          <div className="ar-aging-doc-preview-toolbar">
            <select defaultValue="No Printer">
              <option>No Printer</option>
              <option>Main Office PDF</option>
            </select>
            <div className="ar-aging-doc-preview-toolbar-group">
              <button type="button">|&lt;</button>
              <button type="button">&lt;</button>
              <button type="button">&gt;</button>
              <button type="button">&gt;|</button>
            </div>
            <div className="ar-aging-doc-preview-toolbar-group">
              <button type="button">-</button>
              <span>232.7%</span>
              <button type="button">+</button>
            </div>
          </div>

          <div aria-label="AR Aging Doc preview" className={`ar-aging-doc-preview-canvas${isPreviewVisible ? " is-document-visible" : ""}`}>
            {isPreviewVisible ? (
              <article className="ar-aging-doc-document">
                <header className="ar-aging-doc-document-header">
                  <div>
                    <strong>{storeName}</strong>
                  </div>
                  <div className="ar-aging-doc-document-meta">
                    <h3>A/R Aging Report</h3>
                    <span>Printed On: {printedOnLabel}</span>
                    <span>Cut-Off Date: {cutoffDateLabel}</span>
                    <span>For Store(s): {storeValue}</span>
                  </div>
                </header>

                <div className="ar-aging-doc-document-summary">
                  <div>
                    <span>Report Type: {formatValue}</span>
                    <span>Sorted By: {sortByValue}</span>
                    <span>Customer Range: {customersValue}</span>
                  </div>
                  <div>
                    <span>Acct Types: {accountTypeValue}</span>
                    <span>Customer Types: {selectedCustomerLabels.length === customerTypeOptions.length ? "No Filter" : selectedCustomerLabels.join(", ")}</span>
                    <span>GL Acct: {selectedAccounts.length === accountOptions.length ? "No Filter" : `${selectedAccounts.length} selected`}</span>
                  </div>
                </div>

                <div className="ar-aging-doc-document-customer">
                  <div>
                    <strong>Customer No.</strong>
                    <span>2139426</span>
                  </div>
                  <div>
                    <strong>Customer Name</strong>
                    <span>ADVANCIAL FCU</span>
                  </div>
                  <div>
                    <strong>Customer Type</strong>
                    <span>Retail</span>
                  </div>
                  <div>
                    <strong>Account Type</strong>
                    <span>Open Items</span>
                  </div>
                  <div>
                    <strong>G/L Account</strong>
                    <span>20500</span>
                  </div>
                  <div>
                    <strong>Credit Limit</strong>
                    <span>$20,000,000.00</span>
                  </div>
                </div>

                <table className="ar-aging-doc-document-table">
                  <thead>
                    <tr>
                      <th>Document #</th>
                      <th>Date</th>
                      <th>Description</th>
                      <th>0-30 Days</th>
                      <th>31-60 Days</th>
                      <th>61-90 Days</th>
                      <th>91-120 Days</th>
                      <th>Over 120</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agingLines.map((line) => (
                      <tr key={line.id}>
                        <td>{line.documentNumber}</td>
                        <td>{line.date}</td>
                        <td>{line.description}</td>
                        <td>{line.days0To30}</td>
                        <td>{line.days31To60}</td>
                        <td>{line.days61To90}</td>
                        <td>{line.days91To120}</td>
                        <td>{line.over120}</td>
                        <td>{line.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>
            ) : (
              <div className="ar-aging-doc-empty-preview">
                <strong>Preview canvas is empty.</strong>
                <span>Select Report to render the AR Aging document with the current filters and mock receivables data.</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}