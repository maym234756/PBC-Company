import { useState } from "react";
import type { NavigationGroup, NavigationMenuItem } from "../types";

interface TopTabsProps {
  items: NavigationGroup[];
  layout?: "sheet" | "tabs";
  isItemVisible?: (groupLabel: string, item: string) => boolean;
  isItemPinnable?: (groupLabel: string, item: string) => boolean;
  isItemPinned?: (groupLabel: string, item: string) => boolean;
  onPinItem?: (groupLabel: string, item: string) => void;
  onSelectItem?: (groupLabel: string, item: string) => void;
}

function getNavigationItemLabel(item: NavigationMenuItem) {
  return typeof item === "string" ? item : item.label;
}

function isNavigationSubmenu(item: NavigationMenuItem): item is Exclude<NavigationMenuItem, string> & { items: NavigationMenuItem[] } {
  return typeof item !== "string" && "items" in item && Array.isArray(item.items);
}

export function TopTabs({ items, layout = "tabs", isItemVisible, isItemPinnable, isItemPinned, onPinItem, onSelectItem }: TopTabsProps) {
  const [openLabel, setOpenLabel] = useState<string | null>(null);

  function hasVisibleLeaf(groupLabel: string, menuItem: NavigationMenuItem): boolean {
    if (isNavigationSubmenu(menuItem)) {
      return menuItem.items.some((childItem) => hasVisibleLeaf(groupLabel, childItem));
    }

    const label = getNavigationItemLabel(menuItem);
    return isItemVisible?.(groupLabel, label) ?? true;
  }

  function renderMenuItems(groupLabel: string, menuItems: NavigationMenuItem[], parentPath: string[] = []) {
    return menuItems.map((item) => {
      const label = getNavigationItemLabel(item);
      const itemPath = [...parentPath, label];

      if (isNavigationSubmenu(item)) {
        const hasVisibleChildren = item.items.some((childItem) => hasVisibleLeaf(groupLabel, childItem));

        if (!hasVisibleChildren) {
          return null;
        }

        return (
          <div className="tab-menu-entry tab-menu-submenu-shell" key={`${groupLabel}:${itemPath.join("/")}`}>
            <button className="tab-menu-item tab-menu-item-submenu" type="button">
              <span>{label}</span>
              <span aria-hidden="true" className="tab-menu-chevron">
                ›
              </span>
            </button>
            <div className="tab-submenu">
              {renderMenuItems(groupLabel, item.items, itemPath)}
            </div>
          </div>
        );
      }

      if (!(isItemVisible?.(groupLabel, label) ?? true)) {
        return null;
      }

      const pinned = isItemPinned?.(groupLabel, label) ?? false;
      const pinnable = isItemPinnable?.(groupLabel, label) ?? false;

      return (
        <button
          className="tab-menu-item"
          key={`${groupLabel}:${itemPath.join("/")}`}
          onClick={() => {
            onSelectItem?.(groupLabel, label);
            setOpenLabel(null);
          }}
          onContextMenu={(event) => {
            if (!pinnable) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();
            onPinItem?.(groupLabel, label);
          }}
          title={
            pinnable
              ? pinned
                ? "Already in top buttons. Right-clicking keeps this widget pinned."
                : "Right-click to add this to top buttons"
              : undefined
          }
          type="button"
        >
          <span>{label}</span>
        </button>
      );
    });
  }

  function renderSheetItems(groupLabel: string, menuItems: NavigationMenuItem[], parentPath: string[] = []) {
    return menuItems.map((item) => {
      const label = getNavigationItemLabel(item);
      const itemPath = [...parentPath, label];

      if (isNavigationSubmenu(item)) {
        const hasVisibleChildren = item.items.some((childItem) => hasVisibleLeaf(groupLabel, childItem));

        if (!hasVisibleChildren) {
          return null;
        }

        return (
          <div className="top-tabs-sheet-branch" key={`${groupLabel}:${itemPath.join("/")}`}>
            <div className="top-tabs-sheet-branch-label">{label}</div>
            <div className="top-tabs-sheet-branch-items">{renderSheetItems(groupLabel, item.items, itemPath)}</div>
          </div>
        );
      }

      if (!(isItemVisible?.(groupLabel, label) ?? true)) {
        return null;
      }

      const pinned = isItemPinned?.(groupLabel, label) ?? false;
      const pinnable = isItemPinnable?.(groupLabel, label) ?? false;

      return (
        <button
          className="top-tabs-sheet-item"
          key={`${groupLabel}:${itemPath.join("/")}`}
          onClick={() => onSelectItem?.(groupLabel, label)}
          onContextMenu={(event) => {
            if (!pinnable) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();
            onPinItem?.(groupLabel, label);
          }}
          title={
            pinnable
              ? pinned
                ? "Already in top buttons. Right-clicking keeps this widget pinned."
                : "Right-click to add this to top buttons"
              : undefined
          }
          type="button"
        >
          <span>{label}</span>
        </button>
      );
    });
  }

  if (layout === "sheet") {
    return (
      <div className="top-tabs-sheet">
        {items.map((group) => {
          const hasVisibleItems = group.items.some((item) => hasVisibleLeaf(group.label, item));

          if (!hasVisibleItems) {
            return null;
          }

          return (
            <section className="top-tabs-sheet-group" key={group.label}>
              <h3>{group.label}</h3>
              <div className="top-tabs-sheet-group-items">{renderSheetItems(group.label, group.items)}</div>
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <div className="top-tabs">
      {items.map((group) => {
        const isOpen = openLabel === group.label;

        return (
          <div
            className="tab-wrap"
            key={group.label}
            onMouseEnter={() => {
              if (openLabel) {
                setOpenLabel(group.label);
              }
            }}
            onMouseLeave={() => {
              if (openLabel === group.label) {
                setOpenLabel(null);
              }
            }}
          >
            <button
              className={`tab-button${isOpen ? " open" : ""}`}
              onClick={() => setOpenLabel(isOpen ? null : group.label)}
              type="button"
            >
              {group.label}
            </button>
            {isOpen ? (
              <div className="tab-menu">
                {renderMenuItems(group.label, group.items)}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}