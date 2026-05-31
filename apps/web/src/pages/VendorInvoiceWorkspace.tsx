import { useEffect, useMemo, useState } from "react";

type VendorProfile = {
  addressLines: string[];
  availableDiscount: number;
  contact: string;
  currentBalance: number;
  defaultExpenseAccount: string;
  defaultExpenseDescription: string;
  fax: string;
  id: string;
  name: string;
  notes: string;
  number: string;
  paymentTerms: string;
  phone: string;
  remitToLines: string[];
  remitToPhone: string;
  termDays: number;
  ytdPayments: number;
};

type VendorContactDraft = {
  contact: string;
  fax: string;
  phone: string;
};

type InvoiceDistributionRow = {
  account: string;
  accountDescription: string;
  con: string;
  credit: string;
  debit: string;
  description: string;
  id: string;
  isSystemRow?: boolean;
  percent: string;
  schedule: string;
  store: string;
};

type InvoiceFormState = {
  description: string;
  discountAmount: string;
  discountDate: string;
  discountType: string;
  dueDate: string;
  invoiceDate: string;
  invoiceNumber: string;
  invoiceTotal: string;
  poNumber: string;
  receivedDate: string;
};

const toolbarActions = [
  { id: "new", icon: "N", hint: "Ctrl+N", label: "New Invoice" },
  { id: "vendors", icon: "V", hint: "F4", label: "Vendors" },
  { id: "distribute", icon: "D", hint: "F6", label: "Distribute" },
  { id: "dating", icon: "T", hint: "F8", label: "Dating" },
  { id: "packing", icon: "P", hint: "F10", label: "Packing Slips" }
] as const;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  style: "currency"
});

const vendorProfiles: VendorProfile[] = [
  {
    id: "pacific-rigging",
    name: "Pacific Rigging & Supply",
    number: "V-1038",
    phone: "(562) 555-0188",
    fax: "(562) 555-0189",
    contact: "Mara Ellis",
    addressLines: ["Pacific Rigging & Supply", "1440 Harbor Freight Way", "Long Beach, CA 90802"],
    remitToLines: ["PBC Marine Payables", "PO Box 22048", "Premier Marine AP Clearing"],
    remitToPhone: "(949) 555-0113",
    currentBalance: 18430.27,
    ytdPayments: 124890.32,
    availableDiscount: 280,
    paymentTerms: "2/10 Net 30",
    termDays: 30,
    defaultExpenseAccount: "61120",
    defaultExpenseDescription: "Dock Hardware",
    notes: "Primary dock hardware supplier with monthly consolidated statements."
  },
  {
    id: "coastal-fuel",
    name: "Coastal Fuel Services",
    number: "V-2250",
    phone: "(713) 555-0126",
    fax: "(713) 555-0127",
    contact: "Ramon Vega",
    addressLines: ["Coastal Fuel Services", "55 Marina Tank Farm", "Galveston, TX 77550"],
    remitToLines: ["PBC Marine Payables", "Lockbox 1120", "Dallas, TX 75265"],
    remitToPhone: "(972) 555-0190",
    currentBalance: 9620.44,
    ytdPayments: 86540.9,
    availableDiscount: 95,
    paymentTerms: "Net 15",
    termDays: 15,
    defaultExpenseAccount: "62100",
    defaultExpenseDescription: "Fuel & Oil",
    notes: "Fuel invoices route through same-day payment approval when the vessel yard requests rush delivery."
  },
  {
    id: "north-shore-freight",
    name: "North Shore Freight",
    number: "V-4125",
    phone: "(206) 555-0154",
    fax: "(206) 555-0155",
    contact: "Dana Brooks",
    addressLines: ["North Shore Freight", "8 Terminal Loop", "Seattle, WA 98134"],
    remitToLines: ["PBC Marine Payables", "PO Box 7718", "Seattle, WA 98177"],
    remitToPhone: "(206) 555-0180",
    currentBalance: 4310.11,
    ytdPayments: 50985.17,
    availableDiscount: 0,
    paymentTerms: "Net 45",
    termDays: 45,
    defaultExpenseAccount: "63210",
    defaultExpenseDescription: "Freight In",
    notes: "Inbound freight and rush trailer parts shipments post here by default."
  }
];

const accountDescriptionLookup: Record<string, string> = {
  "30000": "Accounts Payable",
  "61120": "Dock Hardware",
  "62100": "Fuel & Oil",
  "63210": "Freight In",
  "64500": "Shop Supplies",
  "65120": "Rigging Labor"
};

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function parseCurrency(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmountInput(value: number) {
  return value.toFixed(2);
}

function formatDateInput(value: Date) {
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${month}/${day}/${value.getFullYear()}`;
}

function parseDateInput(value: string) {
  const [month, day, year] = value.split("/").map((segment) => Number.parseInt(segment, 10));

  if (!month || !day || !year) {
    return null;
  }

  const nextDate = new Date(year, month - 1, day);
  return Number.isNaN(nextDate.getTime()) ? null : nextDate;
}

function createInvoiceFormState() {
  const today = formatDateInput(new Date());

  return {
    invoiceNumber: "",
    invoiceDate: today,
    dueDate: today,
    receivedDate: today,
    poNumber: "",
    invoiceTotal: "0.00",
    description: "",
    discountType: "No Discount",
    discountDate: today,
    discountAmount: "0.00"
  } satisfies InvoiceFormState;
}

function createSystemDistributionRow(amount: number): InvoiceDistributionRow {
  return {
    id: "system-ap",
    schedule: "",
    account: "30000",
    accountDescription: "Accounts Payable",
    percent: amount > 0 ? "100%" : "0%",
    debit: "0.00",
    credit: formatAmountInput(amount),
    description: "Auto AP credit",
    con: "CON",
    store: "CON",
    isSystemRow: true
  };
}

function createExpenseDistributionRow(index: number, vendor: VendorProfile): InvoiceDistributionRow {
  return {
    id: `dist-${index}`,
    schedule: "",
    account: vendor.defaultExpenseAccount,
    accountDescription: vendor.defaultExpenseDescription,
    percent: "0%",
    debit: "0.00",
    credit: "0.00",
    description: vendor.notes,
    con: "CON",
    store: "CON"
  };
}

function createVendorContactDraft(vendor: VendorProfile): VendorContactDraft {
  return {
    phone: vendor.phone,
    fax: vendor.fax,
    contact: vendor.contact
  };
}

interface VendorInvoiceWorkspaceProps {
  storeName: string;
}

export function VendorInvoiceWorkspace({ storeName }: VendorInvoiceWorkspaceProps) {
  const [selectedVendorId, setSelectedVendorId] = useState(vendorProfiles[0].id);
  const [retainVendorInformation, setRetainVendorInformation] = useState(true);
  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormState>(() => createInvoiceFormState());
  const [contactDraft, setContactDraft] = useState<VendorContactDraft>(() => createVendorContactDraft(vendorProfiles[0]));
  const [statusMessage, setStatusMessage] = useState(
    `Vendor Invoice is ready for ${storeName}. Select a vendor, enter the invoice total, and finish the distribution until the balance reaches ${formatCurrency(0)}.`
  );
  const [selectedRowId, setSelectedRowId] = useState<string>("dist-1");
  const [nextRowIndex, setNextRowIndex] = useState(2);

  const selectedVendor = useMemo(
    () => vendorProfiles.find((vendor) => vendor.id === selectedVendorId) ?? vendorProfiles[0],
    [selectedVendorId]
  );

  const [distributionRows, setDistributionRows] = useState<InvoiceDistributionRow[]>(() => [
    createSystemDistributionRow(0),
    createExpenseDistributionRow(1, vendorProfiles[0])
  ]);

  const invoiceTotal = parseCurrency(invoiceForm.invoiceTotal);
  const discountAmount = parseCurrency(invoiceForm.discountAmount);

  useEffect(() => {
    const nextCredit = formatAmountInput(invoiceTotal);
    const nextPercent = invoiceTotal > 0 ? "100%" : "0%";

    setDistributionRows((current) => {
      let changed = false;
      const nextRows = current.map((row) => {
        if (!row.isSystemRow) {
          return row;
        }

        if (row.credit === nextCredit && row.percent === nextPercent) {
          return row;
        }

        changed = true;
        return {
          ...row,
          credit: nextCredit,
          percent: nextPercent
        };
      });

      return changed ? nextRows : current;
    });
  }, [invoiceTotal]);

  const totalDebit = useMemo(
    () => distributionRows.reduce((sum, row) => sum + parseCurrency(row.debit), 0),
    [distributionRows]
  );
  const totalCredit = useMemo(
    () => distributionRows.reduce((sum, row) => sum + parseCurrency(row.credit), 0),
    [distributionRows]
  );
  const balance = totalDebit - totalCredit;
  const discountedAmount = Math.max(invoiceTotal - discountAmount, 0);
  const canDeleteSelectedRow = distributionRows.some((row) => row.id === selectedRowId && !row.isSystemRow);

  function updateInvoiceForm<K extends keyof InvoiceFormState>(field: K, value: InvoiceFormState[K]) {
    setInvoiceForm((current) => ({ ...current, [field]: value }));
  }

  function handleVendorChange(nextVendorId: string) {
    const nextVendor = vendorProfiles.find((vendor) => vendor.id === nextVendorId) ?? vendorProfiles[0];
    setSelectedVendorId(nextVendor.id);
    setContactDraft(createVendorContactDraft(nextVendor));
    setDistributionRows((current) =>
      current.map((row) =>
        row.isSystemRow
          ? row
          : {
              ...row,
              account: row.account === selectedVendor.defaultExpenseAccount ? nextVendor.defaultExpenseAccount : row.account,
              accountDescription:
                row.accountDescription === selectedVendor.defaultExpenseDescription ? nextVendor.defaultExpenseDescription : row.accountDescription,
              description: row.description === selectedVendor.notes ? nextVendor.notes : row.description
            }
      )
    );
    setStatusMessage(`${nextVendor.name} loaded with ${nextVendor.paymentTerms} terms and a ${formatCurrency(nextVendor.availableDiscount)} available discount window.`);
  }

  function handleToolbarAction(action: "new" | "vendors" | "distribute" | "dating" | "packing") {
    if (action === "new") {
      const nextVendor = retainVendorInformation ? selectedVendor : vendorProfiles[0];
      setSelectedVendorId(nextVendor.id);
      setContactDraft(createVendorContactDraft(nextVendor));
      setInvoiceForm(createInvoiceFormState());
      setDistributionRows([createSystemDistributionRow(0), createExpenseDistributionRow(1, nextVendor)]);
      setSelectedRowId("dist-1");
      setNextRowIndex(2);
      setStatusMessage(`Started a fresh vendor invoice${retainVendorInformation ? ` for ${nextVendor.name}` : ""}.`);
      return;
    }

    if (action === "vendors") {
      setStatusMessage("Vendor master maintenance stays in the broader Payables lane. This leaf keeps invoice entry focused.");
      return;
    }

    if (action === "distribute") {
      if (invoiceTotal <= 0) {
        setStatusMessage("Enter an invoice total before auto-distributing the expense side.");
        return;
      }

      const targetRowId = canDeleteSelectedRow ? selectedRowId : distributionRows.find((row) => !row.isSystemRow)?.id;

      if (!targetRowId) {
        setStatusMessage("Add a distribution row before auto-distributing the invoice amount.");
        return;
      }

      setDistributionRows((current) =>
        current.map((row) =>
          row.id === targetRowId
            ? {
                ...row,
                account: row.account || selectedVendor.defaultExpenseAccount,
                accountDescription: row.accountDescription || selectedVendor.defaultExpenseDescription,
                debit: formatAmountInput(invoiceTotal),
                credit: "0.00",
                percent: "100%",
                description: invoiceForm.description.trim() || selectedVendor.notes
              }
            : row
        )
      );
      setStatusMessage(`Distributed ${formatCurrency(invoiceTotal)} to ${targetRowId === selectedRowId ? "the selected row" : "the first expense row"}.`);
      return;
    }

    if (action === "dating") {
      const invoiceDate = parseDateInput(invoiceForm.invoiceDate);

      if (!invoiceDate) {
        setStatusMessage("Invoice Date must use MM/DD/YYYY before terms can update the due date.");
        return;
      }

      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + selectedVendor.termDays);
      updateInvoiceForm("dueDate", formatDateInput(dueDate));
      setStatusMessage(`Due date updated from ${selectedVendor.paymentTerms}.`);
      return;
    }

    setStatusMessage("Packing slip matching will land in the receiving workflow. This page keeps the invoice entry ready meanwhile.");
  }

  function handleDistributionRowChange(rowId: string, field: keyof InvoiceDistributionRow, value: string) {
    setDistributionRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        if (row.isSystemRow && field !== "description") {
          return row;
        }

        const nextRow = {
          ...row,
          [field]: value
        };

        if (field === "account") {
          nextRow.accountDescription = accountDescriptionLookup[value] ?? row.accountDescription;
        }

        return nextRow;
      })
    );
  }

  function handleAddRow() {
    const nextId = `dist-${nextRowIndex}`;
    setDistributionRows((current) => [...current, createExpenseDistributionRow(nextRowIndex, selectedVendor)]);
    setNextRowIndex((current) => current + 1);
    setSelectedRowId(nextId);
    setStatusMessage(`Added distribution row ${nextRowIndex}.`);
  }

  function handleDeleteRow() {
    if (!canDeleteSelectedRow) {
      setStatusMessage("Select an editable distribution row before deleting it.");
      return;
    }

    const fallbackRow = distributionRows.find((row) => row.id !== selectedRowId && !row.isSystemRow) ?? distributionRows[0];
    setDistributionRows((current) => current.filter((row) => row.id !== selectedRowId));
    setSelectedRowId(fallbackRow?.id ?? "system-ap");
    setStatusMessage(`Deleted ${selectedRowId}.`);
  }

  function handlePreview() {
    setStatusMessage(
      `Previewing ${invoiceForm.invoiceNumber.trim() || "draft invoice"} for ${selectedVendor.name}. Debit ${formatCurrency(totalDebit)} / Credit ${formatCurrency(totalCredit)} / Balance ${formatCurrency(Math.abs(balance))}.`
    );
  }

  function handlePrimaryAction(action: "save" | "epay" | "payNow" | "close") {
    if (action === "close") {
      setStatusMessage("Close requested. Leave the page or switch menu leaves when you are ready.");
      return;
    }

    if (!invoiceForm.invoiceNumber.trim()) {
      setStatusMessage("Invoice Number is required before the invoice can continue.");
      return;
    }

    if (invoiceTotal <= 0) {
      setStatusMessage("Invoice Total must be greater than zero.");
      return;
    }

    if (Math.abs(balance) > 0.009) {
      setStatusMessage(`Distribution is out of balance by ${formatCurrency(Math.abs(balance))}. Adjust the debit rows before continuing.`);
      return;
    }

    if (action === "save") {
      setStatusMessage(`${invoiceForm.invoiceNumber.trim()} saved for ${selectedVendor.name}.${retainVendorInformation ? " Vendor details retained for the next invoice." : ""}`);
      return;
    }

    if (action === "epay") {
      setStatusMessage(`${invoiceForm.invoiceNumber.trim()} staged for ePay in the next payment run.`);
      return;
    }

    setStatusMessage(`${invoiceForm.invoiceNumber.trim()} marked ready for Pay Now review.`);
  }

  return (
    <div className="vendor-invoice-page">
      <section aria-label="Vendor invoice entry" className="vendor-invoice-window">
        <header className="vendor-invoice-titlebar">
          <div className="vendor-invoice-titlebar-copy">
            <h2>Vendor Invoice</h2>
            <span className="vendor-invoice-titlebar-badge">AP ENTRY</span>
          </div>
          <div className="vendor-invoice-titlebar-meta">
            <span>{storeName}</span>
            <small>Vendor Center</small>
          </div>
          <div aria-hidden="true" className="vendor-invoice-window-controls">
            <span className="vendor-invoice-window-control">_</span>
            <span className="vendor-invoice-window-control">[]</span>
            <span className="vendor-invoice-window-control is-close">X</span>
          </div>
        </header>

        <div className="vendor-invoice-toolbar">
          <div className="vendor-invoice-toolbar-actions">
            {toolbarActions.map((action) => (
              <button className="vendor-invoice-toolbar-button" key={action.id} onClick={() => handleToolbarAction(action.id)} type="button">
                <i>{action.icon}</i>
                <span>{action.label}</span>
                <small>{action.hint}</small>
              </button>
            ))}
          </div>
          <div className="vendor-invoice-toolbar-status">
            <div>
              <span>Terms</span>
              <strong>{selectedVendor.paymentTerms}</strong>
            </div>
            <div>
              <span>Vendor #</span>
              <strong>{selectedVendor.number}</strong>
            </div>
            <div>
              <span>Store</span>
              <strong>{storeName}</strong>
            </div>
          </div>
        </div>

        <div className="vendor-invoice-statusbar">
          <span>{statusMessage}</span>
          <strong>Open Balance {formatCurrency(Math.abs(balance))}</strong>
        </div>

        <div className="vendor-invoice-body">
          <div className="vendor-invoice-top-grid">
            <article className="vendor-invoice-address-card is-vendor">
              <span className="vendor-invoice-card-kicker">Vendor</span>
              <strong>{selectedVendor.name}</strong>
              {selectedVendor.addressLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
              <p>{selectedVendor.notes}</p>
            </article>

            <article className="vendor-invoice-address-card is-remit">
              <span className="vendor-invoice-card-kicker">Remit To</span>
              <strong>{storeName} Payables</strong>
              {selectedVendor.remitToLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
              <p>Remit phone: {selectedVendor.remitToPhone}</p>
            </article>

            <aside className="vendor-invoice-totals-card">
              <h3>Vendor Totals</h3>
              <dl>
                <div>
                  <dt>YTD Payments</dt>
                  <dd>{formatCurrency(selectedVendor.ytdPayments)}</dd>
                </div>
                <div>
                  <dt>Current Balance</dt>
                  <dd>{formatCurrency(selectedVendor.currentBalance + invoiceTotal)}</dd>
                </div>
                <div>
                  <dt>Available Discount</dt>
                  <dd>{formatCurrency(selectedVendor.availableDiscount)}</dd>
                </div>
              </dl>
            </aside>
          </div>

          <div className="vendor-invoice-contact-grid">
            <label className="vendor-invoice-field is-wide">
              <span>Vendor</span>
              <select onChange={(event) => handleVendorChange(event.target.value)} value={selectedVendorId}>
                {vendorProfiles.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                ))}
              </select>
            </label>
            <label className="vendor-invoice-field">
              <span>Vendor #</span>
              <input readOnly value={selectedVendor.number} />
            </label>
            <label className="vendor-invoice-field">
              <span>Phone</span>
              <input onChange={(event) => setContactDraft((current) => ({ ...current, phone: event.target.value }))} value={contactDraft.phone} />
            </label>
            <label className="vendor-invoice-field">
              <span>Fax</span>
              <input onChange={(event) => setContactDraft((current) => ({ ...current, fax: event.target.value }))} value={contactDraft.fax} />
            </label>
            <label className="vendor-invoice-field">
              <span>Contact</span>
              <input onChange={(event) => setContactDraft((current) => ({ ...current, contact: event.target.value }))} value={contactDraft.contact} />
            </label>
          </div>

          <div className="vendor-invoice-middle-grid">
            <article className="vendor-invoice-section">
              <div className="vendor-invoice-section-title">Invoice</div>
              <div className="vendor-invoice-form-grid">
                <label className="vendor-invoice-field">
                  <span>Invoice Number</span>
                  <input onChange={(event) => updateInvoiceForm("invoiceNumber", event.target.value)} value={invoiceForm.invoiceNumber} />
                </label>
                <label className="vendor-invoice-field">
                  <span>PO Number</span>
                  <input onChange={(event) => updateInvoiceForm("poNumber", event.target.value)} value={invoiceForm.poNumber} />
                </label>
                <label className="vendor-invoice-field">
                  <span>Invoice Date</span>
                  <input onChange={(event) => updateInvoiceForm("invoiceDate", event.target.value)} placeholder="MM/DD/YYYY" value={invoiceForm.invoiceDate} />
                </label>
                <label className="vendor-invoice-field">
                  <span>Due Date</span>
                  <input onChange={(event) => updateInvoiceForm("dueDate", event.target.value)} placeholder="MM/DD/YYYY" value={invoiceForm.dueDate} />
                </label>
                <label className="vendor-invoice-field">
                  <span>Received/(Journal) Date</span>
                  <input onChange={(event) => updateInvoiceForm("receivedDate", event.target.value)} placeholder="MM/DD/YYYY" value={invoiceForm.receivedDate} />
                </label>
                <label className="vendor-invoice-field">
                  <span>Invoice Total</span>
                  <input inputMode="decimal" onChange={(event) => updateInvoiceForm("invoiceTotal", event.target.value)} value={invoiceForm.invoiceTotal} />
                </label>
                <label className="vendor-invoice-field is-full">
                  <span>Description</span>
                  <textarea onChange={(event) => updateInvoiceForm("description", event.target.value)} rows={2} value={invoiceForm.description} />
                </label>
              </div>
            </article>

            <article className="vendor-invoice-section vendor-invoice-discount-card">
              <div className="vendor-invoice-section-title">Discount</div>
              <div className="vendor-invoice-form-grid">
                <label className="vendor-invoice-field">
                  <span>Avail. For Discount</span>
                  <input readOnly value={formatCurrency(selectedVendor.availableDiscount)} />
                </label>
                <label className="vendor-invoice-field">
                  <span>Type</span>
                  <select onChange={(event) => updateInvoiceForm("discountType", event.target.value)} value={invoiceForm.discountType}>
                    <option>No Discount</option>
                    <option>2% / 10 Net 30</option>
                    <option>1% / 10 Net 15</option>
                  </select>
                </label>
                <label className="vendor-invoice-field">
                  <span>Discount Date</span>
                  <input onChange={(event) => updateInvoiceForm("discountDate", event.target.value)} placeholder="MM/DD/YYYY" value={invoiceForm.discountDate} />
                </label>
                <label className="vendor-invoice-field">
                  <span>Amount</span>
                  <input inputMode="decimal" onChange={(event) => updateInvoiceForm("discountAmount", event.target.value)} value={invoiceForm.discountAmount} />
                </label>
                <label className="vendor-invoice-field is-full">
                  <span>Discounted Amount</span>
                  <input readOnly value={formatCurrency(discountedAmount)} />
                </label>
              </div>
            </article>
          </div>

          <article className="vendor-invoice-section vendor-invoice-distribution">
            <div className="vendor-invoice-section-title">Distribution Info</div>
            <div className="vendor-invoice-table-wrap">
              <table className="vendor-invoice-table">
                <thead>
                  <tr>
                    <th />
                    <th>Sched</th>
                    <th>Account</th>
                    <th>Account Description</th>
                    <th>%</th>
                    <th>Debit</th>
                    <th>Credit</th>
                    <th>Description</th>
                    <th>CON</th>
                    <th>Store</th>
                  </tr>
                </thead>
                <tbody>
                  {distributionRows.map((row) => {
                    const isSelected = row.id === selectedRowId;

                    return (
                      <tr
                        aria-selected={isSelected}
                        className={`${isSelected ? "is-selected" : ""}${row.isSystemRow ? " is-system-row" : ""}`.trim()}
                        key={row.id}
                        onClick={() => setSelectedRowId(row.id)}
                      >
                        <td className="vendor-invoice-cell-indicator">
                          <span>{isSelected ? "*" : ""}</span>
                        </td>
                        <td><input onChange={(event) => handleDistributionRowChange(row.id, "schedule", event.target.value)} value={row.schedule} /></td>
                        <td><input onChange={(event) => handleDistributionRowChange(row.id, "account", event.target.value)} value={row.account} /></td>
                        <td><input onChange={(event) => handleDistributionRowChange(row.id, "accountDescription", event.target.value)} value={row.accountDescription} /></td>
                        <td><input onChange={(event) => handleDistributionRowChange(row.id, "percent", event.target.value)} value={row.percent} /></td>
                        <td><input inputMode="decimal" onChange={(event) => handleDistributionRowChange(row.id, "debit", event.target.value)} value={row.debit} /></td>
                        <td><input inputMode="decimal" onChange={(event) => handleDistributionRowChange(row.id, "credit", event.target.value)} value={row.credit} /></td>
                        <td><input onChange={(event) => handleDistributionRowChange(row.id, "description", event.target.value)} value={row.description} /></td>
                        <td><input onChange={(event) => handleDistributionRowChange(row.id, "con", event.target.value)} value={row.con} /></td>
                        <td><input onChange={(event) => handleDistributionRowChange(row.id, "store", event.target.value)} value={row.store} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>

          <div className="vendor-invoice-actions-row">
            <div className="vendor-invoice-inline-actions">
              <button className="vendor-invoice-secondary-button" onClick={handleAddRow} type="button">Add Row</button>
              <button className="vendor-invoice-secondary-button" onClick={handleDeleteRow} type="button">Delete</button>
              <button className="vendor-invoice-secondary-button" onClick={handlePreview} type="button">Preview</button>
            </div>

            <div className={`vendor-invoice-balance-pill${Math.abs(balance) < 0.009 ? " is-balanced" : ""}`}>
              <span>Balance</span>
              <strong>{formatCurrency(Math.abs(balance))}</strong>
            </div>
          </div>

          <footer className="vendor-invoice-footer">
            <label className="vendor-invoice-retain-toggle">
              <input checked={retainVendorInformation} onChange={(event) => setRetainVendorInformation(event.target.checked)} type="checkbox" />
              <span>Retain Vendor Information</span>
            </label>

            <div className="vendor-invoice-inline-actions">
              <button className="vendor-invoice-primary-button" onClick={() => handlePrimaryAction("epay")} type="button">ePay</button>
              <button className="vendor-invoice-primary-button" onClick={() => handlePrimaryAction("payNow")} type="button">Pay Now</button>
              <button className="vendor-invoice-primary-button" onClick={() => handlePrimaryAction("save")} type="button">Save</button>
              <button className="vendor-invoice-secondary-button" onClick={() => handlePrimaryAction("close")} type="button">Close</button>
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}