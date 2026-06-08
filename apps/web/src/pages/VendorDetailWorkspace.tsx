import { useEffect, useMemo, useState } from "react";
import {
  formatVendorDisplayTitle,
  type VendorAttachment,
  type VendorDateCalculation,
  type VendorDirectoryRecord,
  type VendorDiscountType,
  vendorDirectoryRecords
} from "./vendorDirectory";

interface VendorDetailWorkspaceProps {
  record: VendorDirectoryRecord;
  storeName: string;
  onOpenVendorDetail: (vendorId: string) => void;
  onOpenVendorList: () => void;
}

type VendorDetailTab = "general" | "attachments";
type VendorAttachmentView = "thumbnail" | "list";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

function createDraft(record: VendorDirectoryRecord): VendorDirectoryRecord {
  return {
    ...record,
    attachments: [...record.attachments]
  };
}

function createBlankDraft(record: VendorDirectoryRecord): VendorDirectoryRecord {
  return {
    ...record,
    name: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    contact: "",
    phone: "",
    fedId: "",
    fax: "",
    email: "",
    productDescription: "",
    apVendorType: "Open Account",
    currentBalance: 0,
    payeeName: "",
    payeeAddress1: "",
    payeeAddress2: "",
    payeeCity: "",
    payeeState: "",
    payeeZipCode: "",
    payeeCountry: "",
    payeeContact: "",
    payeePhone: "",
    payeeFedId: "",
    payeeFax: "",
    payeeEmail: "",
    usePayeeInfo: false,
    overrideAccount: "",
    distribution: "",
    mustHavePo: false,
    form1099: false,
    takeDiscountAfterDiscountDate: false,
    foreignFlooring: false,
    payroll: false,
    lastPayrollAccountUpdate: "",
    discountType: "none",
    discountPercent: 0,
    discountDateCalculation: "none",
    discountDayValue: 0,
    dueDateCalculation: "none",
    dueDayValue: 0,
    attachments: []
  };
}

function FieldRow({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="vendor-detail-field-row">
      <span>{label}</span>
      <input onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
  );
}

function CheckboxRow({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="vendor-detail-checkbox-row">
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      <span>{label}</span>
    </label>
  );
}

function RadioOption({ checked, label, name, onChange }: { checked: boolean; label: string; name: string; onChange: () => void }) {
  return (
    <label className="vendor-detail-radio-option">
      <input checked={checked} name={name} onChange={onChange} type="radio" />
      <span>{label}</span>
    </label>
  );
}

export function VendorDetailWorkspace({ record, storeName, onOpenVendorDetail, onOpenVendorList }: VendorDetailWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<VendorDetailTab>("general");
  const [attachmentView, setAttachmentView] = useState<VendorAttachmentView>("thumbnail");
  const [draft, setDraft] = useState(() => createDraft(record));
  const [statusMessage, setStatusMessage] = useState(`${record.name} ready.`);

  useEffect(() => {
    setActiveTab("general");
    setAttachmentView("thumbnail");
    setDraft(createDraft(record));
    setStatusMessage(`${record.name} ready.`);
  }, [record]);

  const currentIndex = useMemo(() => vendorDirectoryRecords.findIndex((entry) => entry.id === record.id), [record.id]);
  const previousRecord = currentIndex > 0 ? vendorDirectoryRecords[currentIndex - 1] : null;
  const nextRecord = currentIndex >= 0 && currentIndex < vendorDirectoryRecords.length - 1 ? vendorDirectoryRecords[currentIndex + 1] : null;
  const title = draft.name.trim() ? formatVendorDisplayTitle({ name: draft.name.trim() }) : "Vendor - New Vendor";

  function updateStringField(field: keyof VendorDirectoryRecord, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateBooleanField(field: keyof VendorDirectoryRecord, value: boolean) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateDiscountType(value: VendorDiscountType) {
    setDraft((current) => ({ ...current, discountType: value }));
  }

  function updateDateCalculation(field: "discountDateCalculation" | "dueDateCalculation", value: VendorDateCalculation) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleSave() {
    setStatusMessage(`${draft.name.trim() || "Vendor"} saved.`);
  }

  function handleCancel() {
    setDraft(createDraft(record));
    setAttachmentView("thumbnail");
    setActiveTab("general");
    setStatusMessage(`${record.name} restored.`);
  }

  function handleNewVendor() {
    setDraft(createBlankDraft(record));
    setAttachmentView("thumbnail");
    setActiveTab("general");
    setStatusMessage("New vendor draft ready.");
  }

  function handleAttachFile() {
    const nextAttachment: VendorAttachment = {
      id: `draft-attachment-${draft.attachments.length + 1}`,
      fileName: `${(draft.name.trim() || "vendor").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-supporting-doc.pdf`,
      kind: "Vendor Document",
      sizeLabel: `${220 + draft.attachments.length * 14} KB`,
      uploadedAt: "Today 2:14 PM"
    };

    setDraft((current) => ({
      ...current,
      attachments: [...current.attachments, nextAttachment]
    }));
    setActiveTab("attachments");
    setStatusMessage(`${nextAttachment.fileName} attached.`);
  }

  return (
    <div className="vendor-detail-page">
      <section aria-label="Vendor detail" className="vendor-detail-window">
        <header className="vendor-detail-titlebar">
          <div className="vendor-detail-titlebar-copy">
            <h2>{title}</h2>
            <span>{storeName}</span>
          </div>

          <div aria-hidden="true" className="vendor-detail-window-controls">
            <span className="vendor-detail-window-control">_</span>
            <span className="vendor-detail-window-control">[]</span>
            <span className="vendor-detail-window-control is-close">X</span>
          </div>
        </header>

        <div className="vendor-detail-toolbar">
          <div className="vendor-detail-toolbar-group">
            <button className="vendor-detail-toolbar-button" onClick={handleNewVendor} type="button">
              New
            </button>
          </div>

          <div className="vendor-detail-toolbar-status">{statusMessage}</div>

          <div className="vendor-detail-toolbar-group is-end">
            <button className="vendor-detail-toolbar-button" onClick={onOpenVendorList} type="button">
              List
            </button>
          </div>
        </div>

        <div className="vendor-detail-tab-strip" role="tablist" aria-label="Vendor detail tabs">
          <button
            aria-selected={activeTab === "general"}
            className={`vendor-detail-tab${activeTab === "general" ? " is-active" : ""}`}
            onClick={() => setActiveTab("general")}
            role="tab"
            type="button"
          >
            General
          </button>
          <button
            aria-selected={activeTab === "attachments"}
            className={`vendor-detail-tab${activeTab === "attachments" ? " is-active" : ""}`}
            onClick={() => setActiveTab("attachments")}
            role="tab"
            type="button"
          >
            Attachments
          </button>
        </div>

        {activeTab === "general" ? (
          <div className="vendor-detail-general-body">
            <div className="vendor-detail-form-top-grid">
              <section className="vendor-detail-panel">
                <div className="vendor-detail-panel-title">Vendor Info</div>
                <div className="vendor-detail-panel-content">
                  <CheckboxRow checked={draft.active} label="Is Active?" onChange={(checked) => updateBooleanField("active", checked)} />
                  <FieldRow label="Name" value={draft.name} onChange={(value) => updateStringField("name", value)} />
                  <FieldRow label="Address 1" value={draft.address1} onChange={(value) => updateStringField("address1", value)} />
                  <FieldRow label="Address 2" value={draft.address2} onChange={(value) => updateStringField("address2", value)} />
                  <FieldRow label="City" value={draft.city} onChange={(value) => updateStringField("city", value)} />
                  <FieldRow label="State" value={draft.state} onChange={(value) => updateStringField("state", value)} />
                  <FieldRow label="Zip Code" value={draft.zipCode} onChange={(value) => updateStringField("zipCode", value)} />
                  <FieldRow label="Country" value={draft.country} onChange={(value) => updateStringField("country", value)} />
                  <FieldRow label="Contact" value={draft.contact} onChange={(value) => updateStringField("contact", value)} />
                  <FieldRow label="Phone" value={draft.phone} onChange={(value) => updateStringField("phone", value)} />
                  <FieldRow label="Fed ID No" value={draft.fedId} onChange={(value) => updateStringField("fedId", value)} />
                  <FieldRow label="Fax" value={draft.fax} onChange={(value) => updateStringField("fax", value)} />
                  <FieldRow label="Email" value={draft.email} onChange={(value) => updateStringField("email", value)} />
                  <FieldRow label="Product Desc." value={draft.productDescription} onChange={(value) => updateStringField("productDescription", value)} />
                  <FieldRow label="AP Vendor Type" value={draft.apVendorType} onChange={(value) => updateStringField("apVendorType", value)} />
                  <FieldRow label="Current Balance" value={formatCurrency(draft.currentBalance)} onChange={() => {}} />
                  <FieldRow label="External ID" value={draft.externalId} onChange={(value) => updateStringField("externalId", value)} />
                </div>
              </section>

              <section className="vendor-detail-panel">
                <div className="vendor-detail-panel-title">Payee Address</div>
                <div className="vendor-detail-panel-content">
                  <CheckboxRow checked={draft.usePayeeInfo} label="Use Payee Info" onChange={(checked) => updateBooleanField("usePayeeInfo", checked)} />
                  <FieldRow label="Name" value={draft.payeeName} onChange={(value) => updateStringField("payeeName", value)} />
                  <FieldRow label="Address 1" value={draft.payeeAddress1} onChange={(value) => updateStringField("payeeAddress1", value)} />
                  <FieldRow label="Address 2" value={draft.payeeAddress2} onChange={(value) => updateStringField("payeeAddress2", value)} />
                  <FieldRow label="City" value={draft.payeeCity} onChange={(value) => updateStringField("payeeCity", value)} />
                  <FieldRow label="State" value={draft.payeeState} onChange={(value) => updateStringField("payeeState", value)} />
                  <FieldRow label="Zip Code" value={draft.payeeZipCode} onChange={(value) => updateStringField("payeeZipCode", value)} />
                  <FieldRow label="Country" value={draft.payeeCountry} onChange={(value) => updateStringField("payeeCountry", value)} />
                  <FieldRow label="Contact" value={draft.payeeContact} onChange={(value) => updateStringField("payeeContact", value)} />
                  <FieldRow label="Phone" value={draft.payeePhone} onChange={(value) => updateStringField("payeePhone", value)} />
                  <FieldRow label="Fed ID No" value={draft.payeeFedId} onChange={(value) => updateStringField("payeeFedId", value)} />
                  <FieldRow label="Fax" value={draft.payeeFax} onChange={(value) => updateStringField("payeeFax", value)} />
                  <FieldRow label="Email" value={draft.payeeEmail} onChange={(value) => updateStringField("payeeEmail", value)} />
                </div>
              </section>
            </div>

            <div className="vendor-detail-form-middle-grid">
              <section className="vendor-detail-panel">
                <div className="vendor-detail-panel-title">Vendor Settings</div>
                <div className="vendor-detail-panel-content vendor-detail-panel-content-tight">
                  <FieldRow label="Override Account" value={draft.overrideAccount} onChange={(value) => updateStringField("overrideAccount", value)} />
                  <FieldRow label="Distribution" value={draft.distribution} onChange={(value) => updateStringField("distribution", value)} />
                  <div className="vendor-detail-checkbox-grid">
                    <CheckboxRow checked={draft.mustHavePo} label="Must Have PO" onChange={(checked) => updateBooleanField("mustHavePo", checked)} />
                    <CheckboxRow checked={draft.form1099} label="1099" onChange={(checked) => updateBooleanField("form1099", checked)} />
                    <CheckboxRow
                      checked={draft.takeDiscountAfterDiscountDate}
                      label="Take Disc After Disc Date"
                      onChange={(checked) => updateBooleanField("takeDiscountAfterDiscountDate", checked)}
                    />
                    <CheckboxRow checked={draft.foreignFlooring} label="Foreign Flooring" onChange={(checked) => updateBooleanField("foreignFlooring", checked)} />
                  </div>
                </div>
              </section>

              <section className="vendor-detail-panel">
                <div className="vendor-detail-panel-title">Payroll Information</div>
                <div className="vendor-detail-panel-content vendor-detail-panel-content-tight">
                  <CheckboxRow checked={draft.payroll} label="Payroll" onChange={(checked) => updateBooleanField("payroll", checked)} />
                  <FieldRow
                    label="Last Payroll Account Update"
                    value={draft.lastPayrollAccountUpdate}
                    onChange={(value) => updateStringField("lastPayrollAccountUpdate", value)}
                  />
                </div>
              </section>
            </div>

            <div className="vendor-detail-form-bottom-grid">
              <section className="vendor-detail-panel vendor-detail-radio-panel">
                <div className="vendor-detail-panel-title">Discount Type</div>
                <div className="vendor-detail-panel-content vendor-detail-panel-content-tight">
                  <RadioOption checked={draft.discountType === "none"} label="No Discount" name="vendor-discount-type" onChange={() => updateDiscountType("none")} />
                  <RadioOption checked={draft.discountType === "percent"} label="Discount Percent" name="vendor-discount-type" onChange={() => updateDiscountType("percent")} />
                  <RadioOption checked={draft.discountType === "directDollar"} label="Direct Dollar Discount" name="vendor-discount-type" onChange={() => updateDiscountType("directDollar")} />
                  <FieldRow
                    label="Discount Percent"
                    value={`${draft.discountPercent}`}
                    onChange={(value) => setDraft((current) => ({ ...current, discountPercent: Number(value) || 0 }))}
                  />
                </div>
              </section>

              <section className="vendor-detail-panel vendor-detail-radio-panel">
                <div className="vendor-detail-panel-title">Calculate Discount Date By</div>
                <div className="vendor-detail-panel-content vendor-detail-panel-content-tight">
                  <RadioOption
                    checked={draft.discountDateCalculation === "none"}
                    label="No Calculation on Disc Date"
                    name="vendor-discount-date"
                    onChange={() => updateDateCalculation("discountDateCalculation", "none")}
                  />
                  <RadioOption
                    checked={draft.discountDateCalculation === "daysSinceInvoiceDate"}
                    label="Days Since Invoice Date"
                    name="vendor-discount-date"
                    onChange={() => updateDateCalculation("discountDateCalculation", "daysSinceInvoiceDate")}
                  />
                  <RadioOption
                    checked={draft.discountDateCalculation === "dayOnFollowingMonth"}
                    label="Day on Following Month"
                    name="vendor-discount-date"
                    onChange={() => updateDateCalculation("discountDateCalculation", "dayOnFollowingMonth")}
                  />
                  <FieldRow
                    label="Day value"
                    value={`${draft.discountDayValue}`}
                    onChange={(value) => setDraft((current) => ({ ...current, discountDayValue: Number(value) || 0 }))}
                  />
                </div>
              </section>

              <section className="vendor-detail-panel vendor-detail-radio-panel">
                <div className="vendor-detail-panel-title">Due Date Calculation</div>
                <div className="vendor-detail-panel-content vendor-detail-panel-content-tight">
                  <RadioOption
                    checked={draft.dueDateCalculation === "none"}
                    label="No Calculation on Due Date"
                    name="vendor-due-date"
                    onChange={() => updateDateCalculation("dueDateCalculation", "none")}
                  />
                  <RadioOption
                    checked={draft.dueDateCalculation === "daysSinceInvoiceDate"}
                    label="Days Since Invoice Date"
                    name="vendor-due-date"
                    onChange={() => updateDateCalculation("dueDateCalculation", "daysSinceInvoiceDate")}
                  />
                  <RadioOption
                    checked={draft.dueDateCalculation === "dayOnFollowingMonth"}
                    label="Day on Following Month"
                    name="vendor-due-date"
                    onChange={() => updateDateCalculation("dueDateCalculation", "dayOnFollowingMonth")}
                  />
                  <FieldRow
                    label="Day value"
                    value={`${draft.dueDayValue}`}
                    onChange={(value) => setDraft((current) => ({ ...current, dueDayValue: Number(value) || 0 }))}
                  />
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div className="vendor-detail-attachments-body">
            <div className="vendor-detail-attachments-canvas">
              {draft.attachments.length === 0 ? (
                <div className="vendor-detail-attachments-empty">No files are attached to this vendor yet.</div>
              ) : attachmentView === "thumbnail" ? (
                <div className="vendor-detail-attachments-grid">
                  {draft.attachments.map((attachment) => (
                    <article className="vendor-detail-attachment-card" key={attachment.id}>
                      <strong>{attachment.fileName}</strong>
                      <span>{attachment.kind}</span>
                      <span>{attachment.sizeLabel}</span>
                      <span>{attachment.uploadedAt}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <table className="vendor-detail-attachments-table">
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th>Type</th>
                      <th>Size</th>
                      <th>Uploaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.attachments.map((attachment) => (
                      <tr key={attachment.id}>
                        <td>{attachment.fileName}</td>
                        <td>{attachment.kind}</td>
                        <td>{attachment.sizeLabel}</td>
                        <td>{attachment.uploadedAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="vendor-detail-attachments-footer">
              <div className="vendor-detail-attachments-view-toggle">
                <span>View:</span>
                <label>
                  <input checked={attachmentView === "thumbnail"} name="vendor-attachment-view" onChange={() => setAttachmentView("thumbnail")} type="radio" />
                  Thumbnail
                </label>
                <label>
                  <input checked={attachmentView === "list"} name="vendor-attachment-view" onChange={() => setAttachmentView("list")} type="radio" />
                  List
                </label>
              </div>

              <button className="vendor-detail-toolbar-button" onClick={handleAttachFile} type="button">
                Attach File
              </button>
            </div>

            <div className="vendor-detail-attachments-meter">
              <div className="vendor-detail-attachments-meter-bar">
                <span style={{ width: `${Math.min(18 + draft.attachments.length * 7, 72)}%` }} />
              </div>
              <p>Current data usage is 8GB. Current license allows 50GB. You are currently paying $0 per month. Next Level is 51-200GB and costs $30 per month or only $30 more.</p>
            </div>
          </div>
        )}

        <footer className="vendor-detail-footer">
          <div className="vendor-detail-footer-group">
            <button className="vendor-detail-footer-button" disabled={!previousRecord} onClick={() => previousRecord && onOpenVendorDetail(previousRecord.id)} type="button">
              Previous
            </button>
            <button className="vendor-detail-footer-button" disabled={!nextRecord} onClick={() => nextRecord && onOpenVendorDetail(nextRecord.id)} type="button">
              Next
            </button>
          </div>

          <div className="vendor-detail-footer-position">{`${currentIndex + 1} of ${vendorDirectoryRecords.length}`}</div>

          <div className="vendor-detail-footer-group is-end">
            <button className="vendor-detail-footer-button" onClick={handleSave} type="button">
              Save
            </button>
            <button className="vendor-detail-footer-button is-danger" onClick={handleCancel} type="button">
              Cancel
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}