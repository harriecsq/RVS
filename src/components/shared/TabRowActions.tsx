import { Clock, Edit3 } from "lucide-react";
import { StandardButton } from "../design-system/StandardButton";
import { ActionsDropdown } from "./ActionsDropdown";

interface TabRowActionsProps {
  showTimeline: boolean;
  onToggleTimeline: () => void;
  editLabel: string | null;
  onEdit: () => void;
  isEditing: boolean;
  onCancel: () => void;
  onSave: () => void;
  isSaving?: boolean;
  saveLabel?: string;
  onDelete: () => void;
  onDownloadPDF?: () => void;
  onDownloadWord?: () => void;
  showDownload?: boolean;
}

export function TabRowActions({
  showTimeline,
  onToggleTimeline,
  editLabel,
  onEdit,
  isEditing,
  onCancel,
  onSave,
  isSaving = false,
  saveLabel,
  onDelete,
  onDownloadPDF,
  onDownloadWord,
  showDownload,
}: TabRowActionsProps) {
  return (
    <>
      <StandardButton
        variant={showTimeline ? "secondary" : "outline"}
        size="sm"
        onClick={onToggleTimeline}
        icon={<Clock size={14} />}
      >
        Activity
      </StandardButton>

      {isEditing ? (
        <>
          <StandardButton variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </StandardButton>
          <StandardButton variant="primary" size="sm" onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : (saveLabel || "Save")}
          </StandardButton>
        </>
      ) : (
        editLabel && (
          <StandardButton
            variant="secondary"
            size="sm"
            icon={<Edit3 size={14} />}
            onClick={onEdit}
          >
            {editLabel}
          </StandardButton>
        )
      )}

      <ActionsDropdown
        onDownloadPDF={onDownloadPDF}
        onDownloadWord={onDownloadWord}
        onDelete={onDelete}
        showDownload={showDownload}
        compact
      />
    </>
  );
}
