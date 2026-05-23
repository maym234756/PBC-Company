import type { StoreOption } from "../types";

interface StoreSelectModalProps {
  open: boolean;
  title: string;
  subtitle: string;
  stores: StoreOption[];
  activeStoreId?: string;
  onSelect: (store: StoreOption) => void;
  onClose: () => void;
}

export function StoreSelectModal({
  open,
  title,
  subtitle,
  stores,
  activeStoreId,
  onSelect,
  onClose
}: StoreSelectModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div aria-modal="true" className="modal-panel" role="dialog">
        <div className="modal-header">
          <div>
            <p className="section-eyebrow">Store selection</p>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <p className="modal-copy">{subtitle}</p>
        <div className="store-grid">
          {stores.map((store) => {
            const isActive = store.id === activeStoreId;

            return (
              <button
                className={`store-card${isActive ? " active" : ""}`}
                key={store.id}
                onClick={() => onSelect(store)}
                type="button"
              >
                <span className="store-code">{store.code}</span>
                <strong>{store.name}</strong>
                <span>{store.statusLine}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}