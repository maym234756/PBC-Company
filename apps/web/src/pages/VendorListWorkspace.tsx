import { useEffect, useMemo, useState } from "react";
import { formatVendorListAddress, vendorDirectoryRecords } from "./vendorDirectory";

type VendorListSearchField = "name" | "vendorNumber" | "city" | "phone";

const searchFieldOptions: Array<{ id: VendorListSearchField; label: string }> = [
  { id: "name", label: "Name" },
  { id: "vendorNumber", label: "Vendor #" },
  { id: "city", label: "City" },
  { id: "phone", label: "Phone" }
];


interface VendorListWorkspaceProps {
  onOpenVendorDetail: (vendorId: string) => void;
  storeName: string;
}

export function VendorListWorkspace({ onOpenVendorDetail, storeName }: VendorListWorkspaceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState<VendorListSearchField>("name");
  const [showActive, setShowActive] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(
    vendorDirectoryRecords.find((record) => record.active)?.id ?? vendorDirectoryRecords[0]?.id ?? null
  );

  const filteredVendors = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();

    return vendorDirectoryRecords.filter((record) => {
      const statusMatch = (showActive && record.active) || (showInactive && !record.active);

      if (!statusMatch) {
        return false;
      }

      if (!normalizedTerm) {
        return true;
      }

      const searchableValue =
        searchField === "vendorNumber"
          ? record.vendorNumber
          : searchField === "name"
            ? record.name
            : searchField === "city"
              ? record.city
              : record.phone;

      return searchableValue.toLowerCase().includes(normalizedTerm);
    });
  }, [searchField, searchTerm, showActive, showInactive]);

  useEffect(() => {
    if (filteredVendors.length === 0) {
      if (selectedVendorId !== null) {
        setSelectedVendorId(null);
      }

      return;
    }

    if (!selectedVendorId || !filteredVendors.some((record) => record.id === selectedVendorId)) {
      setSelectedVendorId(filteredVendors[0].id);
    }
  }, [filteredVendors, selectedVendorId]);

  const selectedVendor = filteredVendors.find((record) => record.id === selectedVendorId) ?? null;

  function handleNewVendor() {
    setSearchTerm("");
    setSearchField("name");
    setShowActive(true);
    setShowInactive(false);
    setSelectedVendorId(vendorDirectoryRecords.find((record) => record.active)?.id ?? vendorDirectoryRecords[0]?.id ?? null);
  }

  function handleReportView() {
    setSearchTerm("");
    setSearchField("name");
    setShowActive(true);
    setShowInactive(true);
  }

  function handleDetailView() {
    if (!selectedVendor) {
      return;
    }

    onOpenVendorDetail(selectedVendor.id);
  }

  function handleActiveToggle() {
    if (showActive && !showInactive) {
      return;
    }

    setShowActive((current) => !current);
  }

  function handleInactiveToggle() {
    if (showInactive && !showActive) {
      return;
    }

    setShowInactive((current) => !current);
  }

  return (
    <div className="vendor-list-page">
      <section aria-label="Vendor list" className="vendor-list-window">
        <header className="vendor-list-titlebar">
          <div className="vendor-list-titlebar-copy">
            <h2>Vendor List</h2>
            <span>{storeName}</span>
          </div>

          <div aria-hidden="true" className="vendor-list-window-controls">
            <span className="vendor-list-window-control">_</span>
            <span className="vendor-list-window-control">[]</span>
            <span className="vendor-list-window-control is-close">X</span>
          </div>
        </header>

        <div className="vendor-list-toolbar">
          <div className="vendor-list-toolbar-group">
            <button className="vendor-list-toolbar-button" onClick={handleNewVendor} type="button">
              New
            </button>
          </div>

          <div className="vendor-list-toolbar-group is-end">
            <button className="vendor-list-toolbar-button" onClick={handleReportView} type="button">
              Report
            </button>
            <button className="vendor-list-toolbar-button" disabled={!selectedVendor} onClick={handleDetailView} type="button">
              Detail
            </button>
          </div>
        </div>

        <div className="vendor-list-filterbar">
          <label className="vendor-list-search-shell">
            <span>Search %</span>
            <input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={`Search ${searchFieldOptions.find((option) => option.id === searchField)?.label.toLowerCase() ?? "vendors"}`}
              value={searchTerm}
            />
          </label>

          <label className="vendor-list-field-shell">
            <span>Field</span>
            <select onChange={(event) => setSearchField(event.target.value as VendorListSearchField)} value={searchField}>
              {searchFieldOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="vendor-list-toggle">
            <input checked={showActive} onChange={handleActiveToggle} type="checkbox" />
            <span>Active</span>
          </label>

          <label className="vendor-list-toggle">
            <input checked={showInactive} onChange={handleInactiveToggle} type="checkbox" />
            <span>Inactive</span>
          </label>

          <div className="vendor-list-found-count">Found {filteredVendors.length}</div>
        </div>

        <div className="vendor-list-table-wrap">
          <table className="vendor-list-table">
            <thead>
              <tr>
                <th>Vendor #</th>
                <th>Name</th>
                <th>Address</th>
                <th>City</th>
                <th>State</th>
                <th>Zip Code</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.length === 0 ? (
                <tr className="vendor-list-empty-row">
                  <td colSpan={7}>No vendors match the current filters.</td>
                </tr>
              ) : (
                filteredVendors.map((record) => {
                  const isSelected = record.id === selectedVendorId;

                  return (
                    <tr
                      className={`${isSelected ? " is-selected" : ""}${record.active ? "" : " is-inactive"}`.trim()}
                      key={record.id}
                      onClick={() => setSelectedVendorId(record.id)}
                      onDoubleClick={() => onOpenVendorDetail(record.id)}
                    >
                      <td>{record.vendorNumber}</td>
                      <td>{record.name}</td>
                      <td>{formatVendorListAddress(record)}</td>
                      <td>{record.city}</td>
                      <td>{record.state}</td>
                      <td>{record.zipCode}</td>
                      <td>{record.phone}</td>
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