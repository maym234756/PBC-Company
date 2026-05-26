interface EmptyStateProps {
  icon?: string;
  title: string;
  detail?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon = "📋", title, detail, action }: EmptyStateProps) {
  return (
    <div className="legacy-empty-state">
      <div className="legacy-empty-state-icon">{icon}</div>
      <div className="legacy-empty-state-title">{title}</div>
      {detail && <div className="legacy-empty-state-detail">{detail}</div>}
      {action && (
        <button className="legacy-task-status-button" onClick={action.onClick} type="button">{action.label}</button>
      )}
    </div>
  );
}
