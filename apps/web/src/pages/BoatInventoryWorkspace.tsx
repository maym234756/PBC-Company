import { useEffect, useState } from "react";

import {
  createBoatInventoryUnit,
  deleteBoatInventoryUnit,
  getBoatInventoryUnits,
  updateBoatInventoryUnit,
  type BoatInventoryUnit,
  type BoatInventoryUnitInput,
} from "../api";
import { EmptyState } from "../components/EmptyState";

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

function formatBoatInventoryCurrency(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function BoatInventoryWorkspace({ storeId }: { storeId: string }) {
  const [units, setUnits] = useState<BoatInventoryUnit[]>(boatInventoryFallbackUnits);
  const [selectedUnitId, setSelectedUnitId] = useState(boatInventoryFallbackUnits[0]?.id ?? "");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [conditionFilter, setConditionFilter] = useState("All");
  const [draft, setDraft] = useState<BoatInventoryUnitInput>(boatInventoryEmptyForm);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
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
    const searchValues = [unit.stockNumber, unit.vinHin, unit.make, unit.model, unit.location].join(" ").toLowerCase();
    return (
      (statusFilter === "All" || unit.status === statusFilter) &&
      (conditionFilter === "All" || unit.condition === conditionFilter) &&
      searchValues.includes(searchTerm.trim().toLowerCase())
    );
  });
  const selectedUnit = units.find((unit) => unit.id === selectedUnitId) ?? filteredUnits[0] ?? units[0] ?? null;
  const available = units.filter((unit) => unit.status === "Available").length;
  const sold = units.filter((unit) => unit.status === "Sold").length;
  const onOrder = units.filter((unit) => unit.status === "On Order").length;
  const avgAge = units.length ? Math.round(units.reduce((total, unit) => total + unit.ageDays, 0) / units.length) : 0;
  const totalRetail = units.reduce((total, unit) => total + unit.priceCents, 0);
  const totalCost = units.reduce((total, unit) => total + unit.costCents, 0);

  function updateDraft<Field extends keyof BoatInventoryUnitInput>(field: Field, value: BoatInventoryUnitInput[Field]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function startAddUnit() {
    setEditingUnitId(null);
    setDraft(boatInventoryEmptyForm);
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
      setNotice(`${saved.stockNumber} saved.`);
    } catch {
      const localUnit: BoatInventoryUnit = {
        id: editingUnitId ?? `local-${Date.now()}`,
        storeId,
        ...draft
      };
      setUnits((current) => [localUnit, ...current.filter((unit) => unit.id !== localUnit.id)]);
      setSelectedUnitId(localUnit.id);
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
    setNotice(`${unit.stockNumber} removed from this view.`);
  }

  return (
    <div className="legacy-boat-inventory-shell">
      <div className="legacy-boat-inventory-toolbar">
        <input onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search stock, VIN/HIN, make, model…" value={searchTerm} />
        <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
          {["All", "Available", "Sold", "On Order"].map((status) => <option key={status}>{status}</option>)}
        </select>
        <select onChange={(event) => setConditionFilter(event.target.value)} value={conditionFilter}>
          {["All", "New", "Used", "Trade-In"].map((condition) => <option key={condition}>{condition}</option>)}
        </select>
        <button className="legacy-task-status-button" onClick={startAddUnit} type="button">+ Add Unit</button>
      </div>
      {notice && <div className="legacy-workbench-notice" onClick={() => setNotice("")}>{notice}</div>}
      <div className="legacy-boat-inventory-summary">
        {[
          ["Available", available.toString()],
          ["Sold", sold.toString()],
          ["On Order", onOrder.toString()],
          ["Avg Age", `${avgAge}d`],
          ["Total Retail", formatBoatInventoryCurrency(totalRetail)],
          ["Total Cost", formatBoatInventoryCurrency(totalCost)]
        ].map(([label, value]) => (
          <section className="legacy-info-card legacy-boat-inventory-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </section>
        ))}
      </div>
      <div className="legacy-boat-inventory-layout">
        <div className="legacy-boat-inventory-table-wrap">
          <table className="legacy-boat-inventory-table">
            <thead><tr><th>Stock #</th><th>Year/Make/Model</th><th>VIN/HIN</th><th>Status</th><th>Condition</th><th className="align-right">Price</th><th>Age</th><th>Location</th></tr></thead>
            <tbody>
              {filteredUnits.length === 0 ? (
                <tr><td colSpan={8}><EmptyState icon="⛵" title="No inventory units" detail="Add your first unit or adjust your search filters." /></td></tr>
              ) : filteredUnits.map((unit) => (
                <tr className={selectedUnit?.id === unit.id ? "is-selected" : ""} key={unit.id} onClick={() => setSelectedUnitId(unit.id)}>
                  <td>{unit.stockNumber}</td>
                  <td>{unit.year} {unit.make} {unit.model}</td>
                  <td>{unit.vinHin}</td>
                  <td><span className={`legacy-chip tone-${unit.status === "Available" ? "stable" : unit.status === "Sold" ? "neutral" : "accent"}`}>{unit.status}</span></td>
                  <td>{unit.condition}</td>
                  <td className="align-right">{formatBoatInventoryCurrency(unit.priceCents)}</td>
                  <td>{unit.ageDays}d</td>
                  <td>{unit.location || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <aside className="legacy-boat-inventory-detail">
          {selectedUnit ? (
            <>
              <div className="legacy-boat-inventory-photo-grid"><span>Photo</span><span>Bow</span><span>Helm</span><span>Engine</span></div>
              <h3>{selectedUnit.year} {selectedUnit.make} {selectedUnit.model}</h3>
              <p>{selectedUnit.stockNumber} · {selectedUnit.vinHin}</p>
              <div className="legacy-boat-inventory-specs">
                <span>Length <strong>{selectedUnit.lengthFt} ft</strong></span>
                <span>Engine <strong>{selectedUnit.engine || "—"}</strong></span>
                <span>Exterior <strong>{selectedUnit.exteriorColor || "—"}</strong></span>
                <span>Interior <strong>{selectedUnit.interiorColor || "—"}</strong></span>
                <span>Retail <strong>{formatBoatInventoryCurrency(selectedUnit.priceCents)}</strong></span>
                <span>Cost <strong>{formatBoatInventoryCurrency(selectedUnit.costCents)}</strong></span>
                <span>Margin <strong>{formatBoatInventoryCurrency(selectedUnit.priceCents - selectedUnit.costCents)}</strong></span>
              </div>
              <p className="legacy-boat-inventory-notes">{selectedUnit.notes || "No notes."}</p>
              <div className="legacy-boat-inventory-actions">
                <button className="legacy-task-status-button" onClick={() => startEditUnit(selectedUnit)} type="button">Edit</button>
                <button className="legacy-task-status-button" onClick={() => void removeUnit(selectedUnit)} type="button">Delete</button>
              </div>
            </>
          ) : <p>No unit selected.</p>}
        </aside>
      </div>
      <div className="legacy-boat-inventory-form workflow-grid">
        {[
          ["stockNumber", "Stock #"], ["vinHin", "VIN/HIN"], ["make", "Make"], ["model", "Model"], ["engine", "Engine"], ["exteriorColor", "Exterior"], ["interiorColor", "Interior"], ["location", "Location"]
        ].map(([field, label]) => (
          <label className="workflow-field" key={field}>
            <span>{label}</span>
            <input onChange={(event) => updateDraft(field as keyof BoatInventoryUnitInput, event.target.value as never)} value={`${draft[field as keyof BoatInventoryUnitInput] ?? ""}`} />
          </label>
        ))}
        <label className="workflow-field"><span>Status</span><select onChange={(event) => updateDraft("status", event.target.value)} value={draft.status}>{["Available", "Sold", "On Order"].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="workflow-field"><span>Condition</span><select onChange={(event) => updateDraft("condition", event.target.value)} value={draft.condition}>{["New", "Used", "Trade-In"].map((value) => <option key={value}>{value}</option>)}</select></label>
        {(["year", "lengthFt", "ageDays", "costCents", "priceCents"] as const).map((field) => (
          <label className="workflow-field" key={field}>
            <span>{field === "costCents" ? "Cost Cents" : field === "priceCents" ? "Price Cents" : field}</span>
            <input onChange={(event) => updateDraft(field, Number.parseInt(event.target.value, 10) || 0)} type="number" value={draft[field]} />
          </label>
        ))}
        <label className="workflow-field is-wide"><span>Notes</span><textarea onChange={(event) => updateDraft("notes", event.target.value)} rows={2} value={draft.notes} /></label>
        <button className="legacy-task-status-button" onClick={() => void saveDraft()} type="button">{editingUnitId ? "Save Unit" : "Create Unit"}</button>
      </div>
    </div>
  );
}
