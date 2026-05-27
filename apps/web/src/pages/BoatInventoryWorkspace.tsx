import { useEffect, useState, type DragEvent as ReactDragEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";

import {
  createBoatInventoryUnit,
  deleteBoatInventoryUnit,
  getBoatInventoryUnits,
  updateBoatInventoryUnit,
  type BoatInventoryUnit,
  type BoatInventoryUnitInput,
} from "../api";

const boatInventoryFallbackUnits: BoatInventoryUnit[] = [
  { id: "stub-bi-1", stockNumber: "BN-2401", vinHin: "PBC2401H324", status: "Available", condition: "New", year: 2024, make: "Bennington", model: "22 SXSB", lengthFt: 22, engine: "Yamaha F150", exteriorColor: "Blue", interiorColor: "Sand", location: "Showroom", ageDays: 18, costCents: 5250000, priceCents: 6990000, photosJson: "[]", notes: "Premier display pontoon with upgraded audio.", storeId: "fallback" },
  { id: "stub-bi-2", stockNumber: "TR-1198", vinHin: "USED1198K122", status: "Available", condition: "Used", year: 2021, make: "Sea Ray", model: "SPX 210", lengthFt: 21, engine: "MerCruiser 4.5L", exteriorColor: "White", interiorColor: "Tan", location: "Used line", ageDays: 64, costCents: 3125000, priceCents: 4290000, photosJson: "[]", notes: "Trade-in; detail and compression test completed.", storeId: "fallback" },
  { id: "stub-bi-3", stockNumber: "ON-3104", vinHin: "ORDER3104", status: "On Order", condition: "New", year: 2025, make: "Cobalt", model: "R6 Surf", lengthFt: 25, engine: "Volvo Penta 380", exteriorColor: "Black", interiorColor: "Gray", location: "Factory", ageDays: 0, costCents: 12400000, priceCents: 15490000, photosJson: "[]", notes: "Factory slot due next month.", storeId: "fallback" },
  { id: "stub-bi-4", stockNumber: "SLD-883", vinHin: "SOLD883H921", status: "Sold", condition: "Trade-In", year: 2019, make: "Yamaha", model: "242 Limited", lengthFt: 24, engine: "Twin 1.8L", exteriorColor: "Red", interiorColor: "White", location: "Delivery", ageDays: 92, costCents: 3850000, priceCents: 4990000, photosJson: "[]", notes: "Sold pending final delivery checklist.", storeId: "fallback" }
];

const boatInventoryEmptyForm: BoatInventoryUnitInput = {
  stockNumber: "",
  vinHin: "",
  status: "Available",
  condition: "New",
  year: new Date().getFullYear(),
  make: "",
  model: "",
  lengthFt: 0,
  engine: "",
  exteriorColor: "",
  interiorColor: "",
  location: "",
  ageDays: 0,
  costCents: 0,
  priceCents: 0,
  photosJson: "[]",
  notes: ""
};

const majorUnitToolbarActions = [
  { label: "New", icon: "✦" },
  { label: "Download Price Book", icon: "$" },
  { label: "Delete", icon: "🗑" },
  { label: "Duplicates", icon: "▣" },
  { label: "Pending Imports", icon: "⇩" },
  { label: "Edit Imported Unit", icon: "✎" }
];

const majorUnitReportActions = [
  { label: "Window Sticker", icon: "▣" },
  { label: "Margin Report", icon: "▤" },
  { label: "Detail", icon: "✎" }
];

const majorUnitFilterOptions = [
  { key: "inInventory", label: "In Inventory" },
  { key: "sold", label: "Sold" },
  { key: "trade", label: "Trade" },
  { key: "baseUnit", label: "Base Unit (Price Books)" },
  { key: "created", label: "Created" },
  { key: "requested", label: "Requested" },
  { key: "ordered", label: "Ordered" },
  { key: "rental", label: "Rental" },
  { key: "transferred", label: "Transferred" },
  { key: "voided", label: "Voided" },
  { key: "groupByPackages", label: "Group by Packages" },
  { key: "certifiedOnly", label: "Certified Only" }
] as const;

type MajorUnitFilterKey = (typeof majorUnitFilterOptions)[number]["key"];

const majorUnitSearchFields = ["Stock Number", "VIN/HIN", "Make", "Model", "Package Number"];

const majorUnitColumnDefinitions = [
  { key: "pkg", label: "Pkg", initialWeight: 5, render: (unit: BoatInventoryUnit) => unit.location ? "•" : "" },
  { key: "stockNumber", label: "Stock Number", initialWeight: 9, render: (unit: BoatInventoryUnit) => unit.stockNumber },
  { key: "unitType", label: "Unit Type", initialWeight: 8, render: (unit: BoatInventoryUnit) => resolveMajorUnitType(unit) },
  { key: "vinHin", label: "VIN/HIN", initialWeight: 10, render: (unit: BoatInventoryUnit) => unit.vinHin },
  { key: "condition", label: "N/U", initialWeight: 6, render: (unit: BoatInventoryUnit) => unit.condition === "New" ? "New" : "Used" },
  { key: "year", label: "Year", initialWeight: 6, render: (unit: BoatInventoryUnit) => unit.year },
  { key: "make", label: "Make", initialWeight: 9, render: (unit: BoatInventoryUnit) => unit.make.toUpperCase() },
  { key: "model", label: "Model", initialWeight: 9, render: (unit: BoatInventoryUnit) => unit.model },
  { key: "modelName", label: "Model Name", initialWeight: 10, render: (unit: BoatInventoryUnit) => unit.engine },
  { key: "color", label: "Color", initialWeight: 8, render: (unit: BoatInventoryUnit) => unit.exteriorColor },
  { key: "unitStatus", label: "Unit Status", initialWeight: 10, render: (unit: BoatInventoryUnit) => resolveMajorUnitStatus(unit) },
  { key: "packageNumber", label: "Package Number", initialWeight: 10, render: (unit: BoatInventoryUnit) => unit.location },
  { key: "finalizationDate", label: "Finalization Date", initialWeight: 10, render: (unit: BoatInventoryUnit) => unit.status === "Sold" ? "Pending" : "" }
] satisfies Array<{
  key: string;
  label: string;
  initialWeight: number;
  render: (unit: BoatInventoryUnit) => ReactNode;
}>;

type MajorUnitColumnKey = (typeof majorUnitColumnDefinitions)[number]["key"];

function createInitialMajorUnitFilters(): Record<MajorUnitFilterKey, boolean> {
  return {
    inInventory: true,
    sold: false,
    trade: false,
    baseUnit: false,
    created: false,
    requested: false,
    ordered: false,
    rental: false,
    transferred: false,
    voided: false,
    groupByPackages: false,
    certifiedOnly: false
  };
}

function createInitialMajorUnitColumnWeights(): Record<MajorUnitColumnKey, number> {
  return Object.fromEntries(
    majorUnitColumnDefinitions.map((column) => [column.key, column.initialWeight])
  ) as Record<MajorUnitColumnKey, number>;
}

function getMajorUnitColumnDefinition(key: MajorUnitColumnKey) {
  return majorUnitColumnDefinitions.find((column) => column.key === key) ?? majorUnitColumnDefinitions[0];
}

function resolveMajorUnitStatus(unit: BoatInventoryUnit) {
  if (unit.status === "Available") {
    return "In Inventory";
  }

  return unit.status;
}

function resolveMajorUnitType(unit: BoatInventoryUnit) {
  if (unit.engine.toLowerCase().includes("yamaha") || unit.model.toLowerCase().includes("f")) {
    return "Outboard";
  }

  return "Boat";
}

function resolveMajorUnitSearchValue(unit: BoatInventoryUnit, searchField: string) {
  switch (searchField) {
    case "VIN/HIN":
      return unit.vinHin;
    case "Make":
      return unit.make;
    case "Model":
      return unit.model;
    case "Package Number":
      return unit.location;
    case "Stock Number":
    default:
      return unit.stockNumber;
  }
}

export function BoatInventoryWorkspace({ storeId }: { storeId: string }) {
  const [units, setUnits] = useState<BoatInventoryUnit[]>(boatInventoryFallbackUnits);
  const [selectedUnitId, setSelectedUnitId] = useState(boatInventoryFallbackUnits[0]?.id ?? "");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("Stock Number");
  const [majorUnitFilters, setMajorUnitFilters] = useState<Record<MajorUnitFilterKey, boolean>>(
    createInitialMajorUnitFilters
  );
  const [columnOrder, setColumnOrder] = useState<MajorUnitColumnKey[]>(
    () => majorUnitColumnDefinitions.map((column) => column.key)
  );
  const [columnWeights, setColumnWeights] = useState<Record<MajorUnitColumnKey, number>>(
    createInitialMajorUnitColumnWeights
  );
  const [draggingColumnKey, setDraggingColumnKey] = useState<MajorUnitColumnKey | null>(null);
  const [dragOverColumnKey, setDragOverColumnKey] = useState<MajorUnitColumnKey | null>(null);
  const [draft, setDraft] = useState<BoatInventoryUnitInput>(boatInventoryEmptyForm);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [notice, setNotice] = useState("Using local fallback inventory until API data is available.");

  useEffect(() => {
    let ignore = false;

    getBoatInventoryUnits(storeId)
      .then((apiUnits) => {
        if (ignore) return;
        if (apiUnits.length > 0) {
          setUnits(apiUnits);
          setSelectedUnitId(apiUnits[0].id);
          setNotice("Inventory loaded from API.");
        } else {
          setUnits(boatInventoryFallbackUnits);
          setSelectedUnitId(boatInventoryFallbackUnits[0]?.id ?? "");
          setNotice("No API units yet — showing starter inventory.");
        }
      })
      .catch(() => {
        if (!ignore) {
          setUnits(boatInventoryFallbackUnits);
          setSelectedUnitId(boatInventoryFallbackUnits[0]?.id ?? "");
          setNotice("API unavailable — showing local fallback inventory.");
        }
      });

    return () => {
      ignore = true;
    };
  }, [storeId]);

  const filteredUnits = units.filter((unit) => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    const searchValue = resolveMajorUnitSearchValue(unit, searchField).toLowerCase();
    const matchesSearch = !normalizedSearchTerm || searchValue.includes(normalizedSearchTerm);
    const matchesInventory =
      (majorUnitFilters.inInventory && unit.status === "Available") ||
      (majorUnitFilters.sold && unit.status === "Sold") ||
      (majorUnitFilters.ordered && unit.status === "On Order") ||
      (majorUnitFilters.trade && unit.condition === "Trade-In");

    return matchesSearch && matchesInventory;
  });
  const selectedUnit = units.find((unit) => unit.id === selectedUnitId) ?? filteredUnits[0] ?? units[0] ?? null;
  const orderedMajorUnitColumns = columnOrder.map((columnKey) => getMajorUnitColumnDefinition(columnKey));
  const totalColumnWeight = orderedMajorUnitColumns.reduce(
    (total, column) => total + (columnWeights[column.key] ?? column.initialWeight),
    0
  );

  function updateDraft<Field extends keyof BoatInventoryUnitInput>(field: Field, value: BoatInventoryUnitInput[Field]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function startAddUnit() {
    setEditingUnitId(null);
    setDraft(boatInventoryEmptyForm);
    setIsEditorOpen(true);
    setNotice("Add a new unit inline, then save.");
  }

  function startEditUnit(unit: BoatInventoryUnit) {
    setEditingUnitId(unit.id);
    setDraft({
      stockNumber: unit.stockNumber,
      vinHin: unit.vinHin,
      status: unit.status,
      condition: unit.condition,
      year: unit.year,
      make: unit.make,
      model: unit.model,
      lengthFt: unit.lengthFt,
      engine: unit.engine,
      exteriorColor: unit.exteriorColor,
      interiorColor: unit.interiorColor,
      location: unit.location,
      ageDays: unit.ageDays,
      costCents: unit.costCents,
      priceCents: unit.priceCents,
      photosJson: unit.photosJson,
      notes: unit.notes
    });
    setIsEditorOpen(true);
    setNotice(`Editing ${unit.stockNumber}.`);
  }

  async function saveDraft() {
    if (!draft.stockNumber.trim() || !draft.vinHin.trim() || !draft.make.trim() || !draft.model.trim()) {
      setNotice("Stock #, VIN/HIN, make, and model are required.");
      return;
    }

    try {
      const saved = editingUnitId
        ? await updateBoatInventoryUnit(storeId, editingUnitId, draft)
        : await createBoatInventoryUnit(storeId, draft);

      setUnits((current) => [saved, ...current.filter((unit) => unit.id !== saved.id)]);
      setSelectedUnitId(saved.id);
      setEditingUnitId(saved.id);
      setIsEditorOpen(false);
      setNotice(`${saved.stockNumber} saved.`);
    } catch {
      const localUnit: BoatInventoryUnit = {
        id: editingUnitId ?? `local-${Date.now()}`,
        storeId,
        ...draft
      };
      setUnits((current) => [localUnit, ...current.filter((unit) => unit.id !== localUnit.id)]);
      setSelectedUnitId(localUnit.id);
      setIsEditorOpen(false);
      setNotice("Saved locally because API persistence is unavailable.");
    }
  }

  async function removeUnit(unit: BoatInventoryUnit) {
    try {
      await deleteBoatInventoryUnit(storeId, unit.id);
    } catch {
      // Local fallback rows can still be removed from the client view.
    }
    setUnits((current) => current.filter((candidate) => candidate.id !== unit.id));
    setSelectedUnitId((current) => current === unit.id ? "" : current);
    setIsEditorOpen(false);
    setNotice(`${unit.stockNumber} removed from this view.`);
  }

  function toggleMajorUnitFilter(key: MajorUnitFilterKey) {
    setMajorUnitFilters((current) => ({ ...current, [key]: !current[key] }));
  }

  function handleToolbarAction(label: string) {
    if (label === "New") {
      startAddUnit();
      return;
    }

    if (label === "Delete") {
      if (selectedUnit) {
        void removeUnit(selectedUnit);
      }
      return;
    }

    if (label === "Edit Imported Unit") {
      if (selectedUnit) {
        startEditUnit(selectedUnit);
      }
      return;
    }

    setNotice(`${label} action is staged for the imported-unit workflow.`);
  }

  function moveMajorUnitColumn(sourceKey: MajorUnitColumnKey, targetKey: MajorUnitColumnKey) {
    setColumnOrder((current) => {
      const sourceIndex = current.indexOf(sourceKey);
      const targetIndex = current.indexOf(targetKey);

      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
        return current;
      }

      const nextOrder = [...current];
      const [movedColumn] = nextOrder.splice(sourceIndex, 1);
      nextOrder.splice(targetIndex, 0, movedColumn);
      return nextOrder;
    });
  }

  function handleMajorUnitColumnDragStart(event: ReactDragEvent<HTMLTableCellElement>, key: MajorUnitColumnKey) {
    setDraggingColumnKey(key);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", key);
  }

  function handleMajorUnitColumnDragOver(event: ReactDragEvent<HTMLTableCellElement>, key: MajorUnitColumnKey) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverColumnKey(key);
  }

  function handleMajorUnitColumnDrop(event: ReactDragEvent<HTMLTableCellElement>, targetKey: MajorUnitColumnKey) {
    event.preventDefault();
    const sourceKey = (event.dataTransfer.getData("text/plain") || draggingColumnKey) as MajorUnitColumnKey | null;

    if (sourceKey) {
      moveMajorUnitColumn(sourceKey, targetKey);
    }

    setDraggingColumnKey(null);
    setDragOverColumnKey(null);
  }

  function handleMajorUnitColumnDragEnd() {
    setDraggingColumnKey(null);
    setDragOverColumnKey(null);
  }

  function startMajorUnitColumnResize(event: ReactMouseEvent<HTMLSpanElement>, key: MajorUnitColumnKey) {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWeight = columnWeights[key] ?? getMajorUnitColumnDefinition(key).initialWeight;

    function handleMouseMove(moveEvent: MouseEvent) {
      const delta = Math.round((moveEvent.clientX - startX) / 12);

      setColumnWeights((current) => ({
        ...current,
        [key]: Math.max(4, startWeight + delta)
      }));
    }

    function handleMouseUp() {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  const emptyGridRowCount = Math.max(0, 32 - filteredUnits.length);

  return (
    <div className="legacy-boat-inventory-shell is-major-unit-layout">
      <div className="major-unit-icon-toolbar">
        <div className="major-unit-toolbar-group">
          {majorUnitToolbarActions.map((action) => (
            <button
              className="major-unit-toolbar-button"
              disabled={(action.label === "Delete" || action.label === "Edit Imported Unit") && !selectedUnit}
              key={action.label}
              onClick={() => handleToolbarAction(action.label)}
              type="button"
            >
              <span className="major-unit-toolbar-icon">{action.icon}</span>
              <strong>{action.label}</strong>
            </button>
          ))}
        </div>

        <div className="major-unit-toolbar-group is-right">
          {majorUnitReportActions.map((action) => (
            <button
              className="major-unit-toolbar-button"
              disabled={!selectedUnit}
              key={action.label}
              onClick={() => setNotice(`${action.label} is staged for ${selectedUnit?.stockNumber ?? "the selected unit"}.`)}
              type="button"
            >
              <span className="major-unit-toolbar-icon">{action.icon}</span>
              <strong>{action.label}</strong>
            </button>
          ))}
        </div>
      </div>

      <div className="major-unit-search-strip">
        <label className="major-unit-search-field">
          <span>Search</span>
          <input
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Type here to search..."
            value={searchTerm}
          />
        </label>
        <select onChange={(event) => setSearchField(event.target.value)} value={searchField}>
          {majorUnitSearchFields.map((field) => (
            <option key={field}>{field}</option>
          ))}
        </select>
        <span className="major-unit-found-count">Found: {filteredUnits.length}</span>
      </div>

      <div className="major-unit-filter-strip">
        {majorUnitFilterOptions.map((filter) => (
          <label className="major-unit-filter-option" key={filter.key}>
            <input
              checked={majorUnitFilters[filter.key]}
              onChange={() => toggleMajorUnitFilter(filter.key)}
              type="checkbox"
            />
            <span>{filter.label}</span>
          </label>
        ))}
      </div>

      {notice && <div className="legacy-workbench-notice" onClick={() => setNotice("")}>{notice}</div>}

      <div className="major-unit-grid-wrap">
        <table className="major-unit-grid">
          <colgroup>
            {orderedMajorUnitColumns.map((column) => (
              <col
                key={column.key}
                style={{
                  width: `${((columnWeights[column.key] ?? column.initialWeight) / totalColumnWeight) * 100}%`
                }}
              />
            ))}
          </colgroup>
          <thead>
            <tr>
              {orderedMajorUnitColumns.map((column) => (
                <th
                  className={[
                    draggingColumnKey === column.key ? "is-dragging" : "",
                    dragOverColumnKey === column.key && draggingColumnKey !== column.key ? "is-drop-target" : ""
                  ].filter(Boolean).join(" ")}
                  draggable
                  key={column.key}
                  onDragEnd={handleMajorUnitColumnDragEnd}
                  onDragOver={(event) => handleMajorUnitColumnDragOver(event, column.key)}
                  onDragStart={(event) => handleMajorUnitColumnDragStart(event, column.key)}
                  onDrop={(event) => handleMajorUnitColumnDrop(event, column.key)}
                >
                  <div className="major-unit-column-header">
                    <span>{column.label}</span>
                  </div>
                  <span
                    className="major-unit-column-resize-handle"
                    onMouseDown={(event) => startMajorUnitColumnResize(event, column.key)}
                    title="Drag to resize column"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredUnits.map((unit) => (
              <tr
                className={selectedUnit?.id === unit.id ? "is-selected" : ""}
                key={unit.id}
                onClick={() => setSelectedUnitId(unit.id)}
                onDoubleClick={() => startEditUnit(unit)}
              >
                {orderedMajorUnitColumns.map((column) => (
                  <td key={column.key}>{column.render(unit)}</td>
                ))}
              </tr>
            ))}
            {Array.from({ length: emptyGridRowCount }, (_, index) => (
              <tr className="is-empty" key={`empty-${index}`}>
                {orderedMajorUnitColumns.map((_column, columnIndex) => (
                  <td key={`empty-${index}-${columnIndex}`}>&nbsp;</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isEditorOpen ? (
        <div className="major-unit-editor-panel">
          <div className="major-unit-editor-heading">
            <strong>{editingUnitId ? "Edit Imported Unit" : "New Major Unit"}</strong>
            <button onClick={() => setIsEditorOpen(false)} type="button">Close</button>
          </div>
          <div className="major-unit-editor-grid">
            {[
              ["stockNumber", "Stock Number"],
              ["vinHin", "VIN/HIN"],
              ["make", "Make"],
              ["model", "Model"],
              ["engine", "Model Name / Engine"],
              ["exteriorColor", "Color"],
              ["interiorColor", "Interior"],
              ["location", "Package Number"]
            ].map(([field, label]) => (
              <label key={field}>
                <span>{label}</span>
                <input
                  onChange={(event) => updateDraft(field as keyof BoatInventoryUnitInput, event.target.value as never)}
                  value={`${draft[field as keyof BoatInventoryUnitInput] ?? ""}`}
                />
              </label>
            ))}
            <label>
              <span>Status</span>
              <select onChange={(event) => updateDraft("status", event.target.value)} value={draft.status}>
                {["Available", "Sold", "On Order"].map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label>
              <span>N/U</span>
              <select onChange={(event) => updateDraft("condition", event.target.value)} value={draft.condition}>
                {["New", "Used", "Trade-In"].map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
            {(["year", "lengthFt", "ageDays", "costCents", "priceCents"] as const).map((field) => (
              <label key={field}>
                <span>{field === "costCents" ? "Cost Cents" : field === "priceCents" ? "Price Cents" : field}</span>
                <input onChange={(event) => updateDraft(field, Number.parseInt(event.target.value, 10) || 0)} type="number" value={draft[field]} />
              </label>
            ))}
            <label className="is-wide">
              <span>Notes</span>
              <textarea onChange={(event) => updateDraft("notes", event.target.value)} rows={2} value={draft.notes} />
            </label>
          </div>
          <div className="major-unit-editor-actions">
            <button className="major-unit-editor-save" onClick={() => void saveDraft()} type="button">
              {editingUnitId ? "Save Unit" : "Create Unit"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
