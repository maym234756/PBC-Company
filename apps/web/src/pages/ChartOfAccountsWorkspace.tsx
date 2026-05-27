import { useMemo, useState } from "react";

interface ChartAccountRow {
  id: string;
  accountNumber: string;
  description: string;
  type: string;
  department: string;
  balanceType: "Debit" | "Credit";
  status: "Active" | "Inactive";
  controlAccount: string;
  schedule: string;
}

const chartAccountRows: ChartAccountRow[] = [
  { id: "coa-1000", accountNumber: "1000", description: "Cash - Operating", type: "Asset", department: "Corporate", balanceType: "Debit", status: "Active", controlAccount: "Bank", schedule: "Balance Sheet" },
  { id: "coa-1010", accountNumber: "1010", description: "Cash - Flooring", type: "Asset", department: "Sales", balanceType: "Debit", status: "Active", controlAccount: "Bank", schedule: "Balance Sheet" },
  { id: "coa-1100", accountNumber: "1100", description: "Contracts in Transit", type: "Asset", department: "Sales", balanceType: "Debit", status: "Active", controlAccount: "Deal Posting", schedule: "CIT" },
  { id: "coa-1200", accountNumber: "1200", description: "Accounts Receivable - Trade", type: "Asset", department: "Accounting", balanceType: "Debit", status: "Active", controlAccount: "AR", schedule: "AR Aging" },
  { id: "coa-1300", accountNumber: "1300", description: "Major Unit Inventory", type: "Asset", department: "Inventory", balanceType: "Debit", status: "Active", controlAccount: "Inventory", schedule: "Floorplan" },
  { id: "coa-1310", accountNumber: "1310", description: "Parts Inventory", type: "Asset", department: "Parts", balanceType: "Debit", status: "Active", controlAccount: "Inventory", schedule: "Parts" },
  { id: "coa-1400", accountNumber: "1400", description: "Prepaid Expenses", type: "Asset", department: "Corporate", balanceType: "Debit", status: "Active", controlAccount: "Manual", schedule: "Prepaids" },
  { id: "coa-2000", accountNumber: "2000", description: "Accounts Payable", type: "Liability", department: "Accounting", balanceType: "Credit", status: "Active", controlAccount: "AP", schedule: "AP Aging" },
  { id: "coa-2100", accountNumber: "2100", description: "Floorplan Payable", type: "Liability", department: "Inventory", balanceType: "Credit", status: "Active", controlAccount: "Floorplan", schedule: "Floorplan" },
  { id: "coa-2200", accountNumber: "2200", description: "Sales Tax Payable", type: "Liability", department: "Sales", balanceType: "Credit", status: "Active", controlAccount: "Tax", schedule: "Tax" },
  { id: "coa-3000", accountNumber: "3000", description: "Owner Equity", type: "Equity", department: "Corporate", balanceType: "Credit", status: "Active", controlAccount: "Manual", schedule: "Equity" },
  { id: "coa-4000", accountNumber: "4000", description: "New Boat Sales", type: "Income", department: "Sales", balanceType: "Credit", status: "Active", controlAccount: "Deal Posting", schedule: "P&L" },
  { id: "coa-4100", accountNumber: "4100", description: "Used Boat Sales", type: "Income", department: "Sales", balanceType: "Credit", status: "Active", controlAccount: "Deal Posting", schedule: "P&L" },
  { id: "coa-4200", accountNumber: "4200", description: "Parts Sales", type: "Income", department: "Parts", balanceType: "Credit", status: "Active", controlAccount: "Parts", schedule: "P&L" },
  { id: "coa-4300", accountNumber: "4300", description: "Service Labor Sales", type: "Income", department: "Service", balanceType: "Credit", status: "Active", controlAccount: "Repair Orders", schedule: "P&L" },
  { id: "coa-5000", accountNumber: "5000", description: "Cost of Goods Sold - Units", type: "Expense", department: "Sales", balanceType: "Debit", status: "Active", controlAccount: "Deal Posting", schedule: "P&L" },
  { id: "coa-5100", accountNumber: "5100", description: "Cost of Goods Sold - Parts", type: "Expense", department: "Parts", balanceType: "Debit", status: "Active", controlAccount: "Parts", schedule: "P&L" },
  { id: "coa-6000", accountNumber: "6000", description: "Payroll Expense", type: "Expense", department: "Corporate", balanceType: "Debit", status: "Active", controlAccount: "Payroll", schedule: "P&L" }
];

const chartAccountTypes = ["All", "Asset", "Liability", "Equity", "Income", "Expense"];
const chartAccountToolbarActions = ["New", "Edit", "Delete", "Duplicate", "Print", "Export"];

export function ChartOfAccountsWorkspace() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [selectedAccountId, setSelectedAccountId] = useState(chartAccountRows[0]?.id ?? "");

  const filteredRows = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return chartAccountRows.filter((row) => {
      const matchesType = typeFilter === "All" || row.type === typeFilter;
      const matchesSearch =
        !normalizedSearchTerm ||
        [row.accountNumber, row.description, row.department, row.controlAccount, row.schedule]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearchTerm);

      return matchesType && matchesSearch;
    });
  }, [searchTerm, typeFilter]);

  const selectedAccount = filteredRows.find((row) => row.id === selectedAccountId) ?? filteredRows[0] ?? null;

  return (
    <div className="chart-accounts-shell">
      <div className="chart-accounts-toolbar">
        <div className="chart-accounts-toolbar-actions">
          {chartAccountToolbarActions.map((action) => (
            <button key={action} type="button">
              <span>{action.slice(0, 1)}</span>
              <strong>{action}</strong>
            </button>
          ))}
        </div>
        <div className="chart-accounts-toolbar-title">
          <strong>Chart of Accounts</strong>
          <span>General Ledger account setup</span>
        </div>
      </div>

      <div className="chart-accounts-filter-strip">
        <label>
          <span>Search</span>
          <input
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Account number, name, department..."
            value={searchTerm}
          />
        </label>
        <label>
          <span>Type</span>
          <select onChange={(event) => setTypeFilter(event.target.value)} value={typeFilter}>
            {chartAccountTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <span className="chart-accounts-found">Found: {filteredRows.length}</span>
      </div>

      <div className="chart-accounts-body">
        <div className="chart-accounts-grid-wrap">
          <table className="chart-accounts-grid">
            <thead>
              <tr>
                <th>Account</th>
                <th>Description</th>
                <th>Type</th>
                <th>Department</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Control</th>
                <th>Schedule</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr
                  className={selectedAccount?.id === row.id ? "is-selected" : ""}
                  key={row.id}
                  onClick={() => setSelectedAccountId(row.id)}
                >
                  <td>{row.accountNumber}</td>
                  <td>{row.description}</td>
                  <td>{row.type}</td>
                  <td>{row.department}</td>
                  <td>{row.balanceType}</td>
                  <td>{row.status}</td>
                  <td>{row.controlAccount}</td>
                  <td>{row.schedule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="chart-accounts-detail">
          {selectedAccount ? (
            <>
              <div className="chart-accounts-detail-header">
                <span>Selected Account</span>
                <strong>{selectedAccount.accountNumber}</strong>
              </div>
              <h3>{selectedAccount.description}</h3>
              <div className="chart-accounts-detail-grid">
                <span>Type <strong>{selectedAccount.type}</strong></span>
                <span>Department <strong>{selectedAccount.department}</strong></span>
                <span>Normal Balance <strong>{selectedAccount.balanceType}</strong></span>
                <span>Status <strong>{selectedAccount.status}</strong></span>
                <span>Control <strong>{selectedAccount.controlAccount}</strong></span>
                <span>Schedule <strong>{selectedAccount.schedule}</strong></span>
              </div>
              <div className="chart-accounts-posting-box">
                <strong>Posting controls</strong>
                <p>Account is available for GL posting, month-end review, and scheduled reconciliation.</p>
              </div>
            </>
          ) : (
            <p>No account selected.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
