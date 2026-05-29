import { useEffect, useMemo, useState } from "react";

type StoreDmsStatus = "Active" | "Limited" | "Read-only";
type StoreFilterMode = "All Stores" | "Primary Store" | "Read-only" | "Needs Attention";

type StoreDepartment = {
  code: string;
  label: string;
};

type StoreIntegration = {
  id: string;
  label: string;
  status: "Connected" | "Pending";
};

type StoreRole = {
  role: string;
  userCount: number;
};

type StoreHours = {
  department: string;
  mondayFriday: string;
  saturday: string;
};

type StoreHealth = {
  checksPassed: number;
  errors: number;
  lastChecked: string;
  statusLabel: string;
  warnings: number;
};

type StoreRecord = {
  address: string;
  cityStateZip: string;
  code: string;
  departments: StoreDepartment[];
  dmsStatus: StoreDmsStatus;
  entityType: string;
  health: StoreHealth;
  hours: StoreHours[];
  id: string;
  integrations: StoreIntegration[];
  isPrimary: boolean;
  isReadOnly: boolean;
  lastUpdated: string;
  legalEntityName: string;
  name: string;
  phone: string;
  roles: StoreRole[];
  taxId: string;
  updatedBy: string;
};

const myStoreRows: StoreRecord[] = [
  {
    id: "downtown-motors",
    name: "Downtown Motors",
    code: "DTWN",
    address: "123 Main St.",
    cityStateZip: "Anytown, CA 90210",
    dmsStatus: "Active",
    entityType: "LLC",
    isPrimary: true,
    isReadOnly: true,
    lastUpdated: "May 20, 2025",
    legalEntityName: "Summit Auto Group, LLC",
    phone: "(555) 123-4567",
    taxId: "91-1234567",
    updatedBy: "DMS Admin",
    departments: [
      { code: "SLS", label: "Sales" },
      { code: "SVC", label: "Service" },
      { code: "PRT", label: "Parts" },
      { code: "ACC", label: "Accounting" },
      { code: "CRM", label: "CRM" }
    ],
    integrations: [
      { id: "elead", label: "elead", status: "Connected" },
      { id: "cdk", label: "CDK Global", status: "Connected" },
      { id: "dealertrack", label: "Dealertrack", status: "Connected" },
      { id: "mailchimp", label: "Mailchimp", status: "Connected" },
      { id: "docusign", label: "DocuSign", status: "Connected" },
      { id: "windward", label: "Windward", status: "Connected" }
    ],
    roles: [
      { role: "Store Manager", userCount: 2 },
      { role: "Service Manager", userCount: 3 },
      { role: "Sales Manager", userCount: 4 },
      { role: "Parts Manager", userCount: 2 },
      { role: "Accounting Manager", userCount: 2 }
    ],
    hours: [
      { department: "Sales", mondayFriday: "8:30 AM - 7:00 PM", saturday: "9:00 AM - 6:00 PM" },
      { department: "Service", mondayFriday: "7:00 AM - 6:00 PM", saturday: "8:00 AM - 1:00 PM" },
      { department: "Parts", mondayFriday: "7:30 AM - 5:30 PM", saturday: "8:00 AM - 12:00 PM" }
    ],
    health: {
      statusLabel: "Healthy",
      checksPassed: 28,
      warnings: 2,
      errors: 0,
      lastChecked: "May 20, 2025 9:15 AM"
    }
  },
  {
    id: "summit-ford",
    name: "Summit Ford",
    code: "FORD",
    address: "456 Summit Ave.",
    cityStateZip: "Anytown, CA 90210",
    dmsStatus: "Active",
    entityType: "Corp",
    isPrimary: false,
    isReadOnly: false,
    lastUpdated: "May 18, 2025",
    legalEntityName: "Summit Ford Retail, Inc.",
    phone: "(555) 111-2044",
    taxId: "91-8890123",
    updatedBy: "DMS Admin",
    departments: [
      { code: "SLS", label: "Sales" },
      { code: "SVC", label: "Service" },
      { code: "PRT", label: "Parts" },
      { code: "ACC", label: "Accounting" },
      { code: "CRM", label: "CRM" }
    ],
    integrations: [
      { id: "elead", label: "elead", status: "Connected" },
      { id: "cdk", label: "CDK Global", status: "Connected" },
      { id: "dealertrack", label: "Dealertrack", status: "Connected" },
      { id: "routeone", label: "RouteOne", status: "Connected" },
      { id: "docusign", label: "DocuSign", status: "Connected" },
      { id: "vauto", label: "vAuto", status: "Connected" },
      { id: "podium", label: "Podium", status: "Connected" }
    ],
    roles: [
      { role: "Store Manager", userCount: 1 },
      { role: "Service Manager", userCount: 2 },
      { role: "Sales Manager", userCount: 3 },
      { role: "Parts Manager", userCount: 1 },
      { role: "Accounting Manager", userCount: 2 }
    ],
    hours: [
      { department: "Sales", mondayFriday: "8:00 AM - 7:00 PM", saturday: "9:00 AM - 6:00 PM" },
      { department: "Service", mondayFriday: "7:00 AM - 6:00 PM", saturday: "8:00 AM - 12:00 PM" },
      { department: "Parts", mondayFriday: "7:30 AM - 5:30 PM", saturday: "8:00 AM - 12:00 PM" }
    ],
    health: {
      statusLabel: "Healthy",
      checksPassed: 31,
      warnings: 1,
      errors: 0,
      lastChecked: "May 18, 2025 4:10 PM"
    }
  },
  {
    id: "north-ridge-service",
    name: "North Ridge Service",
    code: "NRSVC",
    address: "789 North Ridge Rd.",
    cityStateZip: "Anytown, CA 90210",
    dmsStatus: "Limited",
    entityType: "LLC",
    isPrimary: false,
    isReadOnly: true,
    lastUpdated: "May 15, 2025",
    legalEntityName: "North Ridge Service Center",
    phone: "(555) 222-9981",
    taxId: "55-1122334",
    updatedBy: "DMS Admin",
    departments: [
      { code: "SVC", label: "Service" },
      { code: "PRT", label: "Parts" }
    ],
    integrations: [
      { id: "xtime", label: "Xtime", status: "Connected" },
      { id: "warranty", label: "Warranty Hub", status: "Pending" },
      { id: "parts-bridge", label: "Parts Bridge", status: "Connected" }
    ],
    roles: [
      { role: "Service Manager", userCount: 2 },
      { role: "Parts Manager", userCount: 1 }
    ],
    hours: [
      { department: "Service", mondayFriday: "7:00 AM - 6:00 PM", saturday: "8:00 AM - 2:00 PM" },
      { department: "Parts", mondayFriday: "7:30 AM - 5:00 PM", saturday: "8:00 AM - 12:00 PM" }
    ],
    health: {
      statusLabel: "Attention Needed",
      checksPassed: 18,
      warnings: 4,
      errors: 1,
      lastChecked: "May 15, 2025 2:42 PM"
    }
  },
  {
    id: "westside-parts-center",
    name: "Westside Parts Center",
    code: "WSPC",
    address: "321 Westside Blvd.",
    cityStateZip: "Anytown, CA 90210",
    dmsStatus: "Active",
    entityType: "LLC",
    isPrimary: false,
    isReadOnly: true,
    lastUpdated: "May 10, 2025",
    legalEntityName: "Westside Parts Center, LLC",
    phone: "(555) 444-1900",
    taxId: "88-2030405",
    updatedBy: "DMS Admin",
    departments: [{ code: "PRT", label: "Parts" }],
    integrations: [
      { id: "partsedge", label: "PartsEdge", status: "Connected" },
      { id: "inventory-sync", label: "Inventory Sync", status: "Connected" }
    ],
    roles: [
      { role: "Parts Manager", userCount: 2 },
      { role: "Accounting Manager", userCount: 1 }
    ],
    hours: [{ department: "Parts", mondayFriday: "7:00 AM - 5:00 PM", saturday: "8:00 AM - 12:00 PM" }],
    health: {
      statusLabel: "Healthy",
      checksPassed: 22,
      warnings: 0,
      errors: 0,
      lastChecked: "May 10, 2025 10:05 AM"
    }
  }
];

function getStatusTone(status: StoreDmsStatus) {
  switch (status) {
    case "Active":
      return "positive";
    case "Limited":
      return "warning";
    case "Read-only":
    default:
      return "neutral";
  }
}

interface MyStoresWorkspaceProps {
  storeName: string;
}

export function MyStoresWorkspace({ storeName }: MyStoresWorkspaceProps) {
  const [stores] = useState<StoreRecord[]>(myStoreRows);
  const [selectedStoreId, setSelectedStoreId] = useState(myStoreRows[0]?.id ?? "");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<StoreFilterMode>("All Stores");
  const [statusNotice, setStatusNotice] = useState(
    "Store setup is currently managed by DMS Admin. Use this page to review store configuration, departments, integrations, and setup health."
  );

  const filteredStores = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return stores.filter((store) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        store.name.toLowerCase().includes(normalizedSearch) ||
        store.code.toLowerCase().includes(normalizedSearch) ||
        `${store.address} ${store.cityStateZip}`.toLowerCase().includes(normalizedSearch);
      const matchesFilter =
        filterMode === "All Stores" ||
        (filterMode === "Primary Store" && store.isPrimary) ||
        (filterMode === "Read-only" && store.isReadOnly) ||
        (filterMode === "Needs Attention" && (store.health.warnings > 0 || store.health.errors > 0));

      return matchesSearch && matchesFilter;
    });
  }, [filterMode, searchTerm, stores]);

  useEffect(() => {
    if (filteredStores.some((store) => store.id === selectedStoreId)) {
      return;
    }

    setSelectedStoreId(filteredStores[0]?.id ?? stores[0]?.id ?? "");
  }, [filteredStores, selectedStoreId, stores]);

  const selectedStore =
    filteredStores.find((store) => store.id === selectedStoreId) ??
    stores.find((store) => store.id === selectedStoreId) ??
    filteredStores[0] ??
    stores[0] ??
    null;

  return (
    <div className="my-stores-page">
      <section className="my-stores-header">
        <div className="my-stores-header-copy">
          <span className="my-stores-eyebrow">Store Network Administration</span>
          <div className="my-stores-heading-row">
            <h2>My Stores</h2>
            <span className="my-stores-heading-badge">Configured by DMS Admin</span>
          </div>
          <p>View and manage the stores configured for your dealership. Store setup for {storeName} is currently managed by DMS Admin.</p>
        </div>
        <div className="my-stores-header-actions">
          <button className="my-stores-secondary-button" onClick={() => setStatusNotice("Change request draft opened in mock mode.")} type="button">Request Change</button>
          <button className="my-stores-secondary-button" onClick={() => setStatusNotice("Audit log preview opened in mock mode.")} type="button">View Audit Log</button>
          <button className="my-stores-primary-button" onClick={() => setStatusNotice("Store export package queued in mock mode.")} type="button">Export Store Info</button>
        </div>
      </section>

      <div className="my-stores-notice">{statusNotice}</div>

      <section className="my-stores-shell">
        <div className="my-stores-directory-card">
          <div className="my-stores-toolbar">
            <label className="my-stores-search-field">
              <span>Search stores</span>
              <input onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search stores by name, code, or address..." value={searchTerm} />
            </label>
            <label className="my-stores-filter-field">
              <span>Filters</span>
              <select onChange={(event) => setFilterMode(event.target.value as StoreFilterMode)} value={filterMode}>
                <option>All Stores</option>
                <option>Primary Store</option>
                <option>Read-only</option>
                <option>Needs Attention</option>
              </select>
            </label>
          </div>

          <div className="my-stores-table-shell">
            <table className="my-stores-table">
              <thead>
                <tr>
                  <th>Store Name</th>
                  <th>Store Code</th>
                  <th>Address</th>
                  <th>Departments Enabled</th>
                  <th>DMS Status</th>
                  <th>Integrations</th>
                  <th>Last Updated</th>
                  <th aria-hidden="true">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {filteredStores.map((store) => (
                  <tr className={store.id === selectedStore?.id ? "is-selected" : ""} key={store.id} onClick={() => setSelectedStoreId(store.id)}>
                    <td>
                      <button className="my-stores-row-button" type="button">
                        <div className="my-stores-name-cell">
                          <strong>{store.name}</strong>
                          {store.isPrimary ? <span className="my-stores-inline-tag">Primary Store</span> : null}
                        </div>
                      </button>
                    </td>
                    <td>{store.code}</td>
                    <td>
                      <div className="my-stores-address-cell">
                        <span>{store.address}</span>
                        <span>{store.cityStateZip}</span>
                      </div>
                    </td>
                    <td>
                      <div className="my-stores-department-chip-row">
                        {store.departments.map((department) => (
                          <span className="my-stores-department-chip" key={department.code}>{department.label}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`my-stores-status-chip tone-${getStatusTone(store.dmsStatus)}`}>{store.dmsStatus}</span>
                    </td>
                    <td>{store.integrations.length}</td>
                    <td>
                      <div className="my-stores-address-cell">
                        <span>{store.lastUpdated}</span>
                        <span>by {store.updatedBy}</span>
                      </div>
                    </td>
                    <td className="my-stores-chevron">&gt;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="my-stores-table-footer">Showing 1 to {filteredStores.length} of {stores.length} stores</footer>
        </div>

        {selectedStore ? (
          <aside className="my-stores-detail-card">
            <header className="my-stores-detail-header">
              <div className="my-stores-detail-heading-row">
                <h3>{selectedStore.name}</h3>
                {selectedStore.isPrimary ? <span className="my-stores-inline-tag is-primary">Primary Store</span> : null}
                {selectedStore.isReadOnly ? <span className="my-stores-inline-tag">Read-only</span> : null}
              </div>
              <button className="my-stores-close-button" onClick={() => setStatusNotice(`${selectedStore.name} detail panel stays pinned while this mock page is open.`)} type="button">X</button>
            </header>

            <section className="my-stores-detail-section">
              <header className="my-stores-section-heading">
                <strong>Store Profile</strong>
                <span>Read-only</span>
              </header>
              <div className="my-stores-definition-grid">
                <div>
                  <span>Store Code</span>
                  <strong>{selectedStore.code}</strong>
                </div>
                <div>
                  <span>DMS Status</span>
                  <strong>{selectedStore.dmsStatus}</strong>
                </div>
                <div>
                  <span>Address</span>
                  <strong>{selectedStore.address}, {selectedStore.cityStateZip}</strong>
                </div>
                <div>
                  <span>Phone</span>
                  <strong>{selectedStore.phone}</strong>
                </div>
              </div>
            </section>

            <section className="my-stores-detail-section">
              <header className="my-stores-section-heading">
                <strong>Legal Entity</strong>
                <span>Read-only</span>
              </header>
              <div className="my-stores-definition-grid">
                <div>
                  <span>Legal Entity Name</span>
                  <strong>{selectedStore.legalEntityName}</strong>
                </div>
                <div>
                  <span>Tax ID</span>
                  <strong>{selectedStore.taxId}</strong>
                </div>
                <div>
                  <span>Entity Type</span>
                  <strong>{selectedStore.entityType}</strong>
                </div>
              </div>
            </section>

            <section className="my-stores-detail-section">
              <header className="my-stores-section-heading">
                <strong>Hours of Operation</strong>
                <span>Read-only</span>
              </header>
              <div className="my-stores-hours-grid">
                {selectedStore.hours.map((entry) => (
                  <div className="my-stores-hours-row" key={entry.department}>
                    <strong>{entry.department}</strong>
                    <span>Mon - Fri {entry.mondayFriday}</span>
                    <span>Sat {entry.saturday}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="my-stores-detail-section">
              <header className="my-stores-section-heading">
                <strong>Departments Enabled</strong>
                <span>Read-only</span>
              </header>
              <div className="my-stores-department-chip-row">
                {selectedStore.departments.map((department) => (
                  <span className="my-stores-department-chip" key={department.code}>{department.label}</span>
                ))}
              </div>
            </section>

            <section className="my-stores-detail-section">
              <header className="my-stores-section-heading">
                <strong>Assigned Roles (at this store)</strong>
                <span>Read-only</span>
              </header>
              <div className="my-stores-role-grid">
                {selectedStore.roles.map((role) => (
                  <div className="my-stores-role-card" key={role.role}>
                    <span>{role.role}</span>
                    <strong>{role.userCount} Users</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="my-stores-detail-section">
              <header className="my-stores-section-heading">
                <strong>Connected Integrations</strong>
                <button className="my-stores-text-button" onClick={() => setStatusNotice(`Integration inventory for ${selectedStore.name} opened in mock mode.`)} type="button">View all ({selectedStore.integrations.length})</button>
              </header>
              <div className="my-stores-integration-grid">
                {selectedStore.integrations.map((integration) => (
                  <div className="my-stores-integration-card" key={integration.id}>
                    <strong>{integration.label}</strong>
                    <span>{integration.status}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="my-stores-detail-section">
              <header className="my-stores-section-heading">
                <strong>Setup Health</strong>
                <span>Read-only</span>
              </header>
              <div className="my-stores-health-shell">
                <div className="my-stores-health-overview">
                  <strong>{selectedStore.health.statusLabel}</strong>
                  <span>All critical settings are configured for the current view.</span>
                </div>
                <div className="my-stores-health-metrics">
                  <div>
                    <span>Checks Passed</span>
                    <strong>{selectedStore.health.checksPassed}</strong>
                  </div>
                  <div>
                    <span>Warnings</span>
                    <strong>{selectedStore.health.warnings}</strong>
                  </div>
                  <div>
                    <span>Errors</span>
                    <strong>{selectedStore.health.errors}</strong>
                  </div>
                  <div>
                    <span>Last Checked</span>
                    <strong>{selectedStore.health.lastChecked}</strong>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        ) : null}
      </section>
    </div>
  );
}