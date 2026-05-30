import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactElement } from "react";

type ForgeFormFieldType = "text" | "checkbox" | "date" | "dropdown" | "radio" | "signature" | "textarea";
type ForgeFormFieldSource = "native" | "manual";
type ForgeFormExtractionMode = "native" | "manual-required" | "error" | "demo";

interface ForgeFormWorkspaceProps {
  storeName: string;
}

interface ForgeFormFolder {
  id: string;
  name: string;
  parentId: string | null;
}

interface ForgeFormField {
  id: string;
  label: string;
  mappedTo: string;
  notes: string;
  rawKey: string;
  required: boolean;
  source: ForgeFormFieldSource;
  type: ForgeFormFieldType;
  value: string;
}

interface ForgeFormDocument {
  extractionMode: ForgeFormExtractionMode;
  folderId: string | null;
  id: string;
  name: string;
  notes: string;
  objectUrl: string | null;
  pageCount: number | null;
  sizeLabel: string;
  uploadedAtLabel: string;
  fields: ForgeFormField[];
}

interface ForgeFormExtractionResult {
  extractionMode: ForgeFormExtractionMode;
  fields: ForgeFormField[];
  notes: string;
  pageCount: number | null;
}

const sampleFolderId = "forgeform-folder-packets";
const sampleDocumentId = "forgeform-demo-texas-purchased-boats-checklist";

const initialFolders: ForgeFormFolder[] = [
  {
    id: sampleFolderId,
    name: "Purchase Packet and Consignment Packets and Trade Packets",
    parentId: null
  }
];

const initialDocuments: ForgeFormDocument[] = [
  {
    extractionMode: "demo",
    folderId: sampleFolderId,
    id: sampleDocumentId,
    name: "Texas Purchased Boats Checklist.pdf",
    notes: "Seeded template. Upload a live PDF to preview the real document and extract native AcroForm fields when available.",
    objectUrl: null,
    pageCount: 22,
    sizeLabel: "Demo template",
    uploadedAtLabel: "Template seed",
    fields: [
      {
        id: "field-data-sheet",
        label: "Data Sheet",
        mappedTo: "purchasePacket.dataSheetAttached",
        notes: "Checklist item captured as a required boolean.",
        rawKey: "data_sheet",
        required: true,
        source: "manual",
        type: "checkbox",
        value: "false"
      },
      {
        id: "field-boat-appraisal",
        label: "Boat Appraisal Form",
        mappedTo: "purchasePacket.boatAppraisalForm",
        notes: "Use for trade packet intake and valuation review.",
        rawKey: "boat_appraisal_form",
        required: true,
        source: "manual",
        type: "checkbox",
        value: "false"
      },
      {
        id: "field-bill-of-sale",
        label: "Bill of Sale",
        mappedTo: "purchasePacket.billOfSaleReference",
        notes: "Store the signed bill-of-sale reference or upload token.",
        rawKey: "bill_of_sale",
        required: true,
        source: "manual",
        type: "text",
        value: ""
      },
      {
        id: "field-employee-signature",
        label: "Employee Signature",
        mappedTo: "purchasePacket.employeeSignature",
        notes: "Manual signature zone for flat PDFs and scan-only forms.",
        rawKey: "employee_signature",
        required: true,
        source: "manual",
        type: "signature",
        value: ""
      },
      {
        id: "field-signed-date",
        label: "Date",
        mappedTo: "purchasePacket.signedDate",
        notes: "Capture the packet sign-off date.",
        rawKey: "signed_date",
        required: true,
        source: "manual",
        type: "date",
        value: ""
      }
    ]
  }
];

const fieldTypeOptions: Array<{ label: string; value: ForgeFormFieldType }> = [
  { label: "Text", value: "text" },
  { label: "Checkbox", value: "checkbox" },
  { label: "Date", value: "date" },
  { label: "Dropdown", value: "dropdown" },
  { label: "Radio", value: "radio" },
  { label: "Signature", value: "signature" },
  { label: "Text Area", value: "textarea" }
];

const inspectorTabs = [
  { id: "mapping", label: "Mapping Board" },
  { id: "json", label: "JSON Fields" },
  { id: "fields", label: "Field Summary" }
] as const;

type InspectorTabId = (typeof inspectorTabs)[number]["id"];

function formatFieldLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (size >= 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${size} B`;
}

function getFolderPath(folderId: string | null, folders: ForgeFormFolder[]) {
  const path: ForgeFormFolder[] = [];
  let currentFolderId = folderId;

  while (currentFolderId) {
    const folder = folders.find((candidate) => candidate.id === currentFolderId);

    if (!folder) {
      break;
    }

    path.unshift(folder);
    currentFolderId = folder.parentId;
  }

  return path;
}

function buildDocumentJson(document: ForgeFormDocument, storeName: string) {
  const mappedCount = document.fields.filter((field) => field.mappedTo.trim().length > 0).length;

  return JSON.stringify(
    {
      document: {
        extractionMode: document.extractionMode,
        folderId: document.folderId,
        name: document.name,
        notes: document.notes,
        pageCount: document.pageCount,
        sizeLabel: document.sizeLabel,
        storeName,
        uploadedAtLabel: document.uploadedAtLabel
      },
      fields: document.fields.map((field) => ({
        label: field.label,
        mappedTo: field.mappedTo,
        notes: field.notes,
        rawKey: field.rawKey,
        required: field.required,
        source: field.source,
        type: field.type,
        value: field.value
      })),
      mappingSummary: {
        mappedCount,
        totalFields: document.fields.length,
        unmappedCount: document.fields.length - mappedCount
      }
    },
    null,
    2
  );
}

function deriveDocumentStatus(document: ForgeFormDocument) {
  if (document.extractionMode === "error") {
    return { label: "Review Needed", tone: "attention" } as const;
  }

  const mappedCount = document.fields.filter((field) => field.mappedTo.trim().length > 0).length;

  if (document.fields.length === 0) {
    return { label: "Blank Template", tone: "neutral" } as const;
  }

  if (mappedCount === document.fields.length) {
    return { label: "Mapped", tone: "stable" } as const;
  }

  return { label: "Needs Mapping", tone: "accent" } as const;
}

async function extractPdfFields(file: File): Promise<ForgeFormExtractionResult> {
  try {
    const pdfLib = await import("pdf-lib");
    const bytes = await file.arrayBuffer();
    const pdfDocument = await pdfLib.PDFDocument.load(bytes, { ignoreEncryption: true });
    const pageCount = pdfDocument.getPageCount();
    let fields: ForgeFormField[] = [];

    try {
      const form = pdfDocument.getForm();
      fields = form.getFields().map((field, index) => {
        const value = resolvePdfFieldValue(field, pdfLib);
        const type = resolvePdfFieldType(field, pdfLib);

        return {
          id: `${slugify(file.name)}-native-${index}`,
          label: formatFieldLabel(field.getName()),
          mappedTo: "",
          notes: "",
          rawKey: field.getName(),
          required: false,
          source: "native",
          type,
          value
        };
      });
    } catch {
      fields = [];
    }

    return {
      extractionMode: fields.length > 0 ? "native" : "manual-required",
      fields,
      notes:
        fields.length > 0
          ? `${fields.length} native PDF fields extracted. Review and map them before saving the template.`
          : "No native AcroForm fields were found. This PDF is likely flat or scanned, so add fields manually and map them to your JSON schema.",
      pageCount
    };
  } catch {
    return {
      extractionMode: "error",
      fields: [],
      notes: "ForgeForm could not parse native fields from this PDF. You can still preview the PDF and build the field map manually.",
      pageCount: null
    };
  }
}

function resolvePdfFieldType(field: unknown, pdfLib: typeof import("pdf-lib")): ForgeFormFieldType {
  if (field instanceof pdfLib.PDFCheckBox) {
    return "checkbox";
  }

  if (field instanceof pdfLib.PDFDropdown) {
    return "dropdown";
  }

  if (field instanceof pdfLib.PDFOptionList) {
    return "dropdown";
  }

  if (field instanceof pdfLib.PDFRadioGroup) {
    return "radio";
  }

  if (field instanceof pdfLib.PDFSignature) {
    return "signature";
  }

  return "text";
}

function resolvePdfFieldValue(field: unknown, pdfLib: typeof import("pdf-lib")) {
  try {
    if (field instanceof pdfLib.PDFTextField) {
      return field.getText() ?? "";
    }

    if (field instanceof pdfLib.PDFCheckBox) {
      return field.isChecked() ? "true" : "false";
    }

    if (field instanceof pdfLib.PDFDropdown) {
      return field.getSelected().join(", ");
    }

    if (field instanceof pdfLib.PDFOptionList) {
      return field.getSelected().join(", ");
    }

    if (field instanceof pdfLib.PDFRadioGroup) {
      return field.getSelected() ?? "";
    }

    return "";
  } catch {
    return "";
  }
}

async function createDocumentFromFile(file: File, folderId: string | null): Promise<ForgeFormDocument> {
  const extractionResult = await extractPdfFields(file);

  return {
    extractionMode: extractionResult.extractionMode,
    folderId,
    id: `${slugify(file.name)}-${crypto.randomUUID()}`,
    name: file.name,
    notes: extractionResult.notes,
    objectUrl: URL.createObjectURL(file),
    pageCount: extractionResult.pageCount,
    sizeLabel: formatFileSize(file.size),
    uploadedAtLabel: new Date().toLocaleString(),
    fields: extractionResult.fields
  };
}

export function ForgeFormWorkspace({ storeName }: ForgeFormWorkspaceProps) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const createdObjectUrlsRef = useRef<string[]>([]);
  const [folders, setFolders] = useState<ForgeFormFolder[]>(initialFolders);
  const [documents, setDocuments] = useState<ForgeFormDocument[]>(initialDocuments);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState("ForgeForm is ready. Add folders, upload PDF packets, and map native or manual fields into JSON outputs.");
  const [isUploading, setIsUploading] = useState(false);
  const [showCreateFolderForm, setShowCreateFolderForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [inspectorTab, setInspectorTab] = useState<InspectorTabId>("mapping");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<ForgeFormFieldType>("text");
  const [newFieldMappedTo, setNewFieldMappedTo] = useState("");

  useEffect(() => {
    return () => {
      for (const objectUrl of createdObjectUrlsRef.current) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, []);

  const activeFolderPath = useMemo(() => getFolderPath(activeFolderId, folders), [activeFolderId, folders]);
  const currentFolderName = activeFolderPath.length > 0 ? activeFolderPath[activeFolderPath.length - 1].name : "Your documents";
  const childFolders = useMemo(
    () => folders.filter((folder) => folder.parentId === activeFolderId).sort((left, right) => left.name.localeCompare(right.name)),
    [activeFolderId, folders]
  );
  const folderDocuments = useMemo(
    () => documents.filter((document) => document.folderId === activeFolderId).sort((left, right) => left.name.localeCompare(right.name)),
    [activeFolderId, documents]
  );
  const visibleDocuments = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    if (!normalizedSearchTerm) {
      return folderDocuments;
    }

    return folderDocuments.filter((document) => document.name.toLowerCase().includes(normalizedSearchTerm));
  }, [folderDocuments, searchTerm]);
  const selectedDocument = documents.find((document) => document.id === selectedDocumentId) ?? null;
  const selectedDocumentJson = selectedDocument ? buildDocumentJson(selectedDocument, storeName) : "";
  const totalMappedFields = documents.reduce(
    (count, document) => count + document.fields.filter((field) => field.mappedTo.trim().length > 0).length,
    0
  );
  const totalFieldCount = documents.reduce((count, document) => count + document.fields.length, 0);
  const totalNativeFields = documents.reduce(
    (count, document) => count + document.fields.filter((field) => field.source === "native").length,
    0
  );
  const folderDocumentRows = selectedDocument
    ? documents.filter((document) => document.folderId === selectedDocument.folderId).sort((left, right) => left.name.localeCompare(right.name))
    : [];
  const selectedDocumentStatus = selectedDocument ? deriveDocumentStatus(selectedDocument) : null;
  const selectedMappedFieldCount = selectedDocument ? selectedDocument.fields.filter((field) => field.mappedTo.trim().length > 0).length : 0;
  const selectedNativeFieldCount = selectedDocument ? selectedDocument.fields.filter((field) => field.source === "native").length : 0;
  const selectedManualFieldCount = selectedDocument ? selectedDocument.fields.filter((field) => field.source === "manual").length : 0;
  const selectedRequiredFieldCount = selectedDocument ? selectedDocument.fields.filter((field) => field.required).length : 0;
  const selectedUnmappedFieldCount = selectedDocument ? selectedDocument.fields.length - selectedMappedFieldCount : 0;
  const selectedFolderPath = selectedDocument ? getFolderPath(selectedDocument.folderId, folders) : [];
  const selectedFolderName = selectedFolderPath.length > 0 ? selectedFolderPath[selectedFolderPath.length - 1].name : "Your documents";

  function triggerUpload() {
    uploadInputRef.current?.click();
  }

  async function handleUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files ? [...event.target.files] : [];
    event.target.value = "";

    if (fileList.length === 0) {
      return;
    }

    const pdfFiles = fileList.filter((file) => file.type === "application/pdf" || /\.pdf$/i.test(file.name));
    const rejectedCount = fileList.length - pdfFiles.length;

    if (pdfFiles.length === 0) {
      setNotice("ForgeForm only accepts PDF files.");
      return;
    }

    setIsUploading(true);

    try {
      const nextDocuments = await Promise.all(pdfFiles.map((file) => createDocumentFromFile(file, activeFolderId)));

      for (const document of nextDocuments) {
        if (document.objectUrl) {
          createdObjectUrlsRef.current.push(document.objectUrl);
        }
      }

      setDocuments((current) => [...current, ...nextDocuments]);
      setNotice(
        rejectedCount > 0
          ? `${nextDocuments.length} PDF${nextDocuments.length === 1 ? "" : "s"} uploaded. ${rejectedCount} non-PDF file${rejectedCount === 1 ? " was" : "s were"} skipped.`
          : `${nextDocuments.length} PDF${nextDocuments.length === 1 ? "" : "s"} uploaded into ${currentFolderName}.`
      );

      if (selectedDocumentId === null && nextDocuments.length > 0 && activeFolderId === nextDocuments[0].folderId) {
        setSelectedDocumentId(nextDocuments[0].id);
      }
    } finally {
      setIsUploading(false);
    }
  }

  function handleCreateFolder() {
    const trimmedFolderName = newFolderName.trim();

    if (!trimmedFolderName) {
      setNotice("Enter a folder name before creating it.");
      return;
    }

    const nextFolder: ForgeFormFolder = {
      id: `${slugify(trimmedFolderName)}-${crypto.randomUUID()}`,
      name: trimmedFolderName,
      parentId: activeFolderId
    };

    setFolders((current) => [...current, nextFolder]);
    setNewFolderName("");
    setShowCreateFolderForm(false);
    setNotice(`${trimmedFolderName} created.`);
  }

  function openFolder(folderId: string | null) {
    setActiveFolderId(folderId);
    setSelectedDocumentId(null);
    setNotice(folderId ? "Folder opened." : "Back at the root PDF library.");
  }

  function openDocument(documentId: string) {
    const nextDocument = documents.find((document) => document.id === documentId);

    if (!nextDocument) {
      return;
    }

    setActiveFolderId(nextDocument.folderId);
    setSelectedDocumentId(documentId);
    setInspectorTab("mapping");
    setNotice(`${nextDocument.name} opened.`);
  }

  function updateSelectedDocument(mutator: (document: ForgeFormDocument) => ForgeFormDocument) {
    setDocuments((current) =>
      current.map((document) => (document.id === selectedDocumentId ? mutator(document) : document))
    );
  }

  function updateSelectedField(fieldId: string, patch: Partial<ForgeFormField>) {
    updateSelectedDocument((document) => ({
      ...document,
      fields: document.fields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field))
    }));
  }

  function addManualField() {
    const trimmedFieldLabel = newFieldLabel.trim();

    if (!selectedDocument) {
      return;
    }

    if (!trimmedFieldLabel) {
      setNotice("Enter a field label before adding a manual field.");
      return;
    }

    const rawKey = slugify(trimmedFieldLabel).replace(/-/g, "_");

    updateSelectedDocument((document) => ({
      ...document,
      extractionMode: document.extractionMode === "error" ? "manual-required" : document.extractionMode,
      fields: [
        ...document.fields,
        {
          id: `${rawKey}-${crypto.randomUUID()}`,
          label: trimmedFieldLabel,
          mappedTo: newFieldMappedTo.trim(),
          notes: "Manual field added in ForgeForm.",
          rawKey,
          required: false,
          source: "manual",
          type: newFieldType,
          value: ""
        }
      ]
    }));

    setNewFieldLabel("");
    setNewFieldMappedTo("");
    setNewFieldType("text");
    setNotice(`${trimmedFieldLabel} added to ${selectedDocument.name}.`);
  }

  function downloadSelectedDocumentJson() {
    if (!selectedDocument) {
      return;
    }

    const blob = new Blob([selectedDocumentJson], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `${slugify(selectedDocument.name.replace(/\.pdf$/i, ""))}-mapping.json`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
    setNotice(`${selectedDocument.name} JSON exported.`);
  }

  function renderFolderTree(parentId: string | null, depth = 0): ReactElement | null {
    const nestedFolders = folders.filter((folder) => folder.parentId === parentId).sort((left, right) => left.name.localeCompare(right.name));

    if (nestedFolders.length === 0) {
      return null;
    }

    return (
      <div className="forge-form-folder-tree-group">
        {nestedFolders.map((folder) => {
          const isActive = folder.id === activeFolderId;

          return (
            <div className="forge-form-folder-tree-node" key={folder.id}>
              <button
                className={`forge-form-folder-tree-button${isActive ? " is-active" : ""}`}
                onClick={() => openFolder(folder.id)}
                style={{ paddingLeft: `${14 + depth * 16}px` }}
                type="button"
              >
                <span className="forge-form-folder-tree-icon">Folder</span>
                <strong>{folder.name}</strong>
              </button>
              {renderFolderTree(folder.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`forge-form-page${selectedDocument ? " is-document-mode" : ""}`}>
      <input accept="application/pdf,.pdf" hidden multiple onChange={handleUploadChange} ref={uploadInputRef} type="file" />

      {selectedDocument ? (
        <section className="forge-form-studio-page">
          <div className="forge-form-studio-topbar">
            <div>
              <span className="forge-form-eyebrow">ForgeForm / PDF Mapping Studio</span>
              <h2>{selectedDocument.name}</h2>
              <p>{selectedDocument.notes}</p>
            </div>
            <div className="forge-form-toolbar-actions">
              <span className={`forge-form-chip is-${selectedDocumentStatus?.tone}`}>{selectedDocumentStatus?.label}</span>
              <button className="forge-form-secondary-button" onClick={() => setSelectedDocumentId(null)} type="button">
                Back to Library
              </button>
              <button className="forge-form-secondary-button" onClick={triggerUpload} type="button">
                Upload PDF
              </button>
              <button className="forge-form-primary-button" onClick={downloadSelectedDocumentJson} type="button">
                Export JSON
              </button>
            </div>
          </div>

          <div className="forge-form-workbench-nav" role="tablist" aria-label="ForgeForm document tools">
            <button className="is-active" type="button">All tools</button>
            <button type="button">Edit</button>
            <button type="button">Convert</button>
            <button type="button">E-Sign</button>
            <div className="forge-form-workbench-nav-meta">
              <span>{selectedFolderName}</span>
              <span>{selectedDocument.pageCount ? `${selectedDocument.pageCount} pages` : "PDF"}</span>
              <span>{selectedDocument.uploadedAtLabel}</span>
            </div>
          </div>

          <div className="forge-form-document-layout is-workbench">
            <aside className="forge-form-tool-drawer">
              <div className="forge-form-tool-panel is-reference-tools">
                <div className="forge-form-tool-panel-header">
                  <div>
                    <span className="forge-form-card-eyebrow">All tools</span>
                    <h4>ForgeForm tools</h4>
                  </div>
                </div>

                <div className="forge-form-tool-list">
                  <button className="forge-form-tool-button" onClick={downloadSelectedDocumentJson} type="button">
                    <strong>Export JSON</strong>
                    <span>Export the current field map and values.</span>
                  </button>
                  <button className="forge-form-tool-button" onClick={() => setInspectorTab("mapping")} type="button">
                    <strong>Edit Mapping</strong>
                    <span>Map JSON targets and control field types.</span>
                  </button>
                  <button className="forge-form-tool-button" onClick={triggerUpload} type="button">
                    <strong>Replace PDF</strong>
                    <span>Upload the live document and extract native fields.</span>
                  </button>
                  <button className="forge-form-tool-button" onClick={() => setInspectorTab("fields")} type="button">
                    <strong>Field Summary</strong>
                    <span>Review all mapped and manual fields.</span>
                  </button>
                  <button className="forge-form-tool-button" onClick={() => setInspectorTab("json")} type="button">
                    <strong>JSON Preview</strong>
                    <span>Inspect the exported JSON payload.</span>
                  </button>
                </div>

                <div className="forge-form-tool-section">
                  <span className="forge-form-card-eyebrow">Document set</span>
                  <div className="forge-form-document-switcher is-vertical">
                    {folderDocumentRows.map((document) => (
                      <button
                        className={`forge-form-document-switcher-button${document.id === selectedDocument.id ? " is-active" : ""}`}
                        key={document.id}
                        onClick={() => openDocument(document.id)}
                        type="button"
                      >
                        <strong>{document.name}</strong>
                        <span>{document.pageCount ? `${document.pageCount} pages` : "PDF preview"}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="forge-form-tool-rail" aria-hidden="true">
                <span>Sel</span>
                <span>Txt</span>
                <span>Draw</span>
                <span>Sign</span>
                <span>Map</span>
              </div>
            </aside>

            <div className="forge-form-stage">
              <div className="forge-form-stage-header">
                <div>
                  <span className="forge-form-card-eyebrow">Current folder</span>
                  <h4>{selectedFolderName}</h4>
                  <div className="forge-form-breadcrumbs is-compact">
                    <button onClick={() => openFolder(null)} type="button">Your documents</button>
                    {selectedFolderPath.map((folder) => (
                      <button key={folder.id} onClick={() => openFolder(folder.id)} type="button">
                        {folder.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="forge-form-chip-row">
                  <span className="forge-form-chip">{selectedMappedFieldCount} mapped</span>
                  <span className="forge-form-chip">{selectedNativeFieldCount} native</span>
                  <span className="forge-form-chip">{selectedManualFieldCount} manual</span>
                </div>
              </div>

              <div className="forge-form-viewer-panel">
                <div className="forge-form-viewer-topbar">
                  <span>{selectedDocument.pageCount ? `${selectedDocument.pageCount} pages` : "PDF"}</span>
                  <span>{selectedDocument.sizeLabel}</span>
                  <span>{selectedDocument.uploadedAtLabel}</span>
                </div>

                <div className="forge-form-viewer-surface">
                  {selectedDocument.objectUrl ? (
                    <iframe className="forge-form-viewer-frame" src={selectedDocument.objectUrl} title={selectedDocument.name} />
                  ) : (
                    <div className="forge-form-viewer-placeholder">
                      <strong>Template preview placeholder</strong>
                      <p>This seeded template shows the mapping layout. Upload the real PDF to render it here and extract any native form fields.</p>
                    </div>
                  )}
                </div>
              </div>

              <section className="forge-form-editor-panel">
                <div className="forge-form-inspector-tabs" role="tablist" aria-label="ForgeForm inspector tabs">
                {inspectorTabs.map((tab) => (
                  <button
                    aria-selected={tab.id === inspectorTab}
                    className={tab.id === inspectorTab ? "is-active" : ""}
                    key={tab.id}
                    onClick={() => setInspectorTab(tab.id)}
                    role="tab"
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
                </div>

                {inspectorTab === "mapping" ? (
                  <div className="forge-form-inspector-panel" role="tabpanel">
                    <div className="forge-form-inspector-heading">
                      <div>
                        <span className="forge-form-card-eyebrow">Editable Mapping</span>
                        <h3>Field Map</h3>
                      </div>
                      <span className="forge-form-chip">{selectedMappedFieldCount} mapped</span>
                    </div>

                    <div className="forge-form-mapping-summary-grid">
                      <div className="forge-form-mini-stat">
                        <span>Total Fields</span>
                        <strong>{selectedDocument.fields.length}</strong>
                      </div>
                      <div className="forge-form-mini-stat">
                        <span>Unmapped</span>
                        <strong>{selectedUnmappedFieldCount}</strong>
                      </div>
                      <div className="forge-form-mini-stat">
                        <span>Required</span>
                        <strong>{selectedRequiredFieldCount}</strong>
                      </div>
                    </div>

                    <div className="forge-form-field-editor-list">
                      {selectedDocument.fields.map((field) => (
                        <article className="forge-form-field-editor-card" key={field.id}>
                          <div className="forge-form-field-editor-header">
                            <div>
                              <strong>{field.label}</strong>
                              <div className="forge-form-field-editor-meta">
                                <span>{field.source === "native" ? `Native: ${field.rawKey}` : `Manual: ${field.rawKey}`}</span>
                                <span>{field.required ? "Required" : "Optional"}</span>
                              </div>
                            </div>
                            <div className="forge-form-chip-row">
                              <span className="forge-form-chip">{field.type}</span>
                              {field.mappedTo.trim() ? <span className="forge-form-chip is-stable">Mapped</span> : <span className="forge-form-chip is-accent">Needs target</span>}
                            </div>
                          </div>

                          <div className="forge-form-field-editor-grid">
                            <label>
                              <span>JSON Target</span>
                              <input
                                onChange={(event) => updateSelectedField(field.id, { mappedTo: event.target.value })}
                                placeholder="packet.section.fieldName"
                                type="text"
                                value={field.mappedTo}
                              />
                            </label>
                            <label>
                              <span>Default Value</span>
                              <input
                                onChange={(event) => updateSelectedField(field.id, { value: event.target.value })}
                                placeholder="Default / extracted value"
                                type="text"
                                value={field.value}
                              />
                            </label>
                            <label>
                              <span>Field Type</span>
                              <select onChange={(event) => updateSelectedField(field.id, { type: event.target.value as ForgeFormFieldType })} value={field.type}>
                                {fieldTypeOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="forge-form-checkbox-field">
                              <span>Requirement</span>
                              <span className="forge-form-checkbox-cell">
                                <input checked={field.required} onChange={(event) => updateSelectedField(field.id, { required: event.target.checked })} type="checkbox" />
                                <span>{field.required ? "Required field" : "Optional field"}</span>
                              </span>
                            </label>
                          </div>
                        </article>
                      ))}
                    </div>

                    <div className="forge-form-inline-composer is-vertical">
                      <div className="forge-form-inline-composer-grid">
                        <label>
                          <span>Add Field</span>
                          <input onChange={(event) => setNewFieldLabel(event.target.value)} placeholder="Example: Buyer Signature" type="text" value={newFieldLabel} />
                        </label>
                        <label>
                          <span>Type</span>
                          <select onChange={(event) => setNewFieldType(event.target.value as ForgeFormFieldType)} value={newFieldType}>
                            {fieldTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>JSON Target</span>
                          <input onChange={(event) => setNewFieldMappedTo(event.target.value)} placeholder="packet.signatures.buyer" type="text" value={newFieldMappedTo} />
                        </label>
                      </div>
                      <button className="forge-form-primary-button" onClick={addManualField} type="button">
                        Add Manual Field
                      </button>
                    </div>
                  </div>
                ) : null}

                {inspectorTab === "json" ? (
                  <div className="forge-form-inspector-panel" role="tabpanel">
                    <div className="forge-form-inspector-heading">
                      <div>
                        <span className="forge-form-card-eyebrow">Field Output</span>
                        <h3>JSON Preview</h3>
                      </div>
                      <button className="forge-form-secondary-button" onClick={downloadSelectedDocumentJson} type="button">
                        Export JSON
                      </button>
                    </div>
                    <pre className="forge-form-json-panel">{selectedDocumentJson}</pre>
                  </div>
                ) : null}

                {inspectorTab === "fields" ? (
                  <div className="forge-form-inspector-panel" role="tabpanel">
                    <div className="forge-form-inspector-heading">
                      <div>
                        <span className="forge-form-card-eyebrow">Field Detail</span>
                        <h3>Summary</h3>
                      </div>
                    </div>
                    <div className="forge-form-field-cards">
                      {selectedDocument.fields.map((field) => (
                        <article className="forge-form-field-card" key={field.id}>
                          <div className="forge-form-field-card-header">
                            <strong>{field.label}</strong>
                            <span className="forge-form-chip">{field.type}</span>
                          </div>
                          <p>{field.notes || "No extra guidance recorded yet."}</p>
                          <div className="forge-form-field-card-meta">
                            <span>Source: {field.source === "native" ? field.rawKey : "Manual"}</span>
                            <span>Target: {field.mappedTo || "Unmapped"}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="forge-form-hero">
            <div>
              <span className="forge-form-eyebrow">ForgeForm / PDF Mapping Studio</span>
              <h2>ForgeForm</h2>
              <p>Upload PDF-only packets, extract native fields into JSON, add manual mapping fields for flat forms, and save reusable form templates for {storeName}.</p>
            </div>
            <div className="forge-form-hero-meta">
              <div>
                <span>Folders</span>
                <strong>{folders.length}</strong>
              </div>
              <div>
                <span>PDF Files</span>
                <strong>{documents.length}</strong>
              </div>
              <div>
                <span>Mapped Fields</span>
                <strong>{totalMappedFields} / {totalFieldCount}</strong>
              </div>
            </div>
          </section>

          <div className="forge-form-shell">
            <aside className="forge-form-sidebar">
              <div className="forge-form-sidebar-card">
                <div className="forge-form-sidebar-heading">
                  <div>
                    <span className="forge-form-card-eyebrow">Library</span>
                    <h3>Folders</h3>
                  </div>
                  <button className="forge-form-ghost-button" onClick={() => openFolder(null)} type="button">
                    Root
                  </button>
                </div>

                <button className={`forge-form-folder-tree-button${activeFolderId === null ? " is-active" : ""}`} onClick={() => openFolder(null)} type="button">
                  <span className="forge-form-folder-tree-icon">Root</span>
                  <strong>Your documents</strong>
                </button>
                {renderFolderTree(null)}
                <div className="forge-form-compact-notice">
                  <span className="forge-form-card-eyebrow">Workspace Notice</span>
                  <p className="forge-form-sidebar-note">{notice}</p>
                  <div className="forge-form-chip-row">
                    <span className="forge-form-chip">PDF only</span>
                    <span className="forge-form-chip">Native field extraction</span>
                    <span className="forge-form-chip">Manual mapping</span>
                  </div>
                </div>
              </div>
            </aside>

            <div className="forge-form-main">
            <section className="forge-form-library">
              <div className="forge-form-toolbar">
                <div>
                  <span className="forge-form-card-eyebrow">PDF Library</span>
                  <h3>{currentFolderName}</h3>
                  <p>Folders and files stay PDF-only. Open a PDF to inspect extracted fields and build the JSON map.</p>
                </div>
                <div className="forge-form-toolbar-actions">
                  <label className="forge-form-search-field">
                    <span>Search</span>
                    <input onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search PDFs in this folder" type="text" value={searchTerm} />
                  </label>
                  <button className="forge-form-secondary-button" onClick={() => setShowCreateFolderForm((current) => !current)} type="button">
                    {showCreateFolderForm ? "Close Folder Form" : "New Folder"}
                  </button>
                  <button className="forge-form-primary-button" disabled={isUploading} onClick={triggerUpload} type="button">
                    {isUploading ? "Uploading PDFs..." : "Upload PDFs"}
                  </button>
                </div>
              </div>

              {showCreateFolderForm ? (
                <div className="forge-form-inline-composer">
                  <label>
                    <span>Folder Name</span>
                    <input onChange={(event) => setNewFolderName(event.target.value)} placeholder="Example: Purchase Packets" type="text" value={newFolderName} />
                  </label>
                  <button className="forge-form-primary-button" onClick={handleCreateFolder} type="button">
                    Create Folder
                  </button>
                </div>
              ) : null}

              <div className="forge-form-breadcrumbs">
                <button onClick={() => openFolder(null)} type="button">Your documents</button>
                {activeFolderPath.map((folder) => (
                  <button key={folder.id} onClick={() => openFolder(folder.id)} type="button">
                    {folder.name}
                  </button>
                ))}
              </div>

              <div className="forge-form-library-meta-bar">
                <div className="forge-form-mini-stat">
                  <span>Folders in view</span>
                  <strong>{childFolders.length}</strong>
                </div>
                <div className="forge-form-mini-stat">
                  <span>PDFs in view</span>
                  <strong>{folderDocuments.length}</strong>
                </div>
                <div className="forge-form-mini-stat">
                  <span>Native fields</span>
                  <strong>{totalNativeFields}</strong>
                </div>
              </div>

              <div className="forge-form-library-panel">
                <div className="forge-form-library-list">
                  <div className="forge-form-library-list-header">
                    <span>Name</span>
                    <span>Type</span>
                    <span>Status</span>
                    <span>Size</span>
                  </div>

                  {childFolders.map((folder) => (
                    <button className="forge-form-library-row is-folder" key={folder.id} onClick={() => openFolder(folder.id)} type="button">
                      <span className="forge-form-library-name">
                        <strong>{folder.name}</strong>
                      </span>
                      <span>Folder</span>
                      <span>Ready</span>
                      <span>--</span>
                    </button>
                  ))}

                  {visibleDocuments.map((document) => {
                    const status = deriveDocumentStatus(document);

                    return (
                      <button className="forge-form-library-row" key={document.id} onClick={() => openDocument(document.id)} type="button">
                        <span className="forge-form-library-name">
                          <strong>{document.name}</strong>
                          <small>{document.notes}</small>
                        </span>
                        <span>PDF</span>
                        <span>
                          <span className={`forge-form-chip is-${status.tone}`}>{status.label}</span>
                        </span>
                        <span>{document.sizeLabel}</span>
                      </button>
                    );
                  })}

                  {childFolders.length === 0 && visibleDocuments.length === 0 ? (
                    <div className="forge-form-empty-state">
                      <strong>No folders or PDFs here yet.</strong>
                      <p>Create a folder or upload a PDF packet to start building field mappings.</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}