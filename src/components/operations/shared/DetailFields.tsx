import { Lock, Trash2, Plus } from "lucide-react";
import { SingleDateInput } from "../../shared/UnifiedDateRangeFilter";

type EditData = Record<string, any>;

/** Read-only field with a lock icon. */
export function LockedField({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
  return (
    <div>
      <label style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "13px",
        fontWeight: 500,
        color: "var(--neuron-ink-base)",
        marginBottom: "8px"
      }}>
        {label}
        <Lock size={12} color="#9CA3AF" title={tooltip} style={{ cursor: "help" }} />
      </label>
      <div style={{
        padding: "10px 14px",
        backgroundColor: "#F9FAFB",
        border: "1px solid #E5E9F0",
        borderRadius: "6px",
        fontSize: "14px",
        color: "#6B7280",
        cursor: "not-allowed"
      }}>
        {value || "—"}
      </div>
    </div>
  );
}

export interface EditableFieldProps {
  fieldName: string;
  label: string;
  value: string;
  type?: "text" | "date" | "textarea" | "select";
  options?: string[];
  required?: boolean;
  placeholder?: string;
  isEditing?: boolean;
  editData?: EditData;
  setEditData?: (data: EditData) => void;
  capitalize?: boolean;
}

/** Label + value that swaps to an input/select/textarea/date picker in edit mode. */
export function EditableField({
  fieldName,
  label,
  value,
  type = "text",
  options = [],
  required = false,
  placeholder = "—",
  isEditing = false,
  editData = {},
  setEditData,
  capitalize = false,
}: EditableFieldProps) {

  // Helper to ensure date is YYYY-MM-DD for input fields
  const toInputDate = (dateVal: string | Date | undefined | null): string => {
    if (!dateVal) return "";
    try {
      // If it's already YYYY-MM-DD
      if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
        return dateVal;
      }
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return "";
      return d.toISOString().split('T')[0];
    } catch (e) {
      return "";
    }
  };

  // Helper to format date for display (MM/DD/YYYY)
  const toDisplayDate = (dateVal: string): string => {
    if (!dateVal) return "";
    try {
      const [y, m, d] = dateVal.split("-");
      if (y && m && d) {
        return `${m}/${d}/${y}`;
      }
      return dateVal;
    } catch (e) {
      return dateVal;
    }
  };

  // Use editData value if available, otherwise use original value
  const rawValue = editData[fieldName] !== undefined
    ? String(editData[fieldName] || "")
    : value;

  // For date inputs, ensure correct format
  // If type is date, we maintain YYYY-MM-DD internally for the DateInput value prop
  // But for View mode, we want to show MM/DD/YYYY
  const inputDateValue = type === "date" ? toInputDate(rawValue) : rawValue;
  const displayValue = type === "date" ? inputDateValue : rawValue;

  const isEmpty = !displayValue || displayValue.trim() === "";

  const handleChange = (newValue: string) => {
    if (setEditData) {
      setEditData({ ...editData, [fieldName]: newValue });
    }
  };

  // View mode (not editing)
  if (!isEditing) {
    return (
      <div>
        <label style={{
          display: "block",
          fontSize: "13px",
          fontWeight: 500,
          color: "var(--neuron-ink-base)",
          marginBottom: "8px"
        }}>
          {label} {required && <span style={{ color: "#EF4444" }}>*</span>}
        </label>
        <div style={{
          padding: "10px 14px",
          backgroundColor: isEmpty ? "white" : "#F9FAFB",
          border: isEmpty && required ? "2px dashed #FCD34D" : isEmpty ? "2px dashed #E5E9F0" : "1px solid #E5E9F0",
          borderRadius: "6px",
          fontSize: "14px",
          color: isEmpty ? "#9CA3AF" : "var(--neuron-ink-primary)",
          minHeight: type === "textarea" ? "80px" : "42px",
          display: "flex",
          alignItems: "center",
          textTransform: capitalize ? "uppercase" : undefined,
        }}>
          {isEmpty ? (
            <span style={{ color: "#9CA3AF" }}>{placeholder}</span>
          ) : type === "date" ? (
            toDisplayDate(displayValue)
          ) : (
            displayValue
          )}
        </div>
      </div>
    );
  }

  // Edit mode
  return (
    <div>
      <label style={{
        display: "block",
        fontSize: "13px",
        fontWeight: 500,
        color: "var(--neuron-ink-base)",
        marginBottom: "8px"
      }}>
        {label} {required && <span style={{ color: "#EF4444" }}>*</span>}
      </label>
      {type === "textarea" ? (
        <textarea
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          style={{
            width: "100%",
            padding: "10px 12px",
            backgroundColor: "white",
            border: "1px solid #E5E9F0",
            borderRadius: "6px",
            fontSize: "14px",
            color: "#0A1D4D",
            outline: "none",
            resize: "vertical",
            transition: "border-color 0.15s ease",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E9F0"; }}
        />
      ) : type === "select" ? (
        <select
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            backgroundColor: "white",
            border: "1px solid #E5E9F0",
            borderRadius: "6px",
            fontSize: "14px",
            color: "#0A1D4D",
            outline: "none",
            minHeight: "40px",
            appearance: "auto",
            transition: "border-color 0.15s ease",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E9F0"; }}
        >
          <option value="">Select...</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : type === "date" ? (
        <SingleDateInput
          value={displayValue}
          onChange={handleChange}
          placeholder="MM/DD/YYYY"
        />
      ) : (
        <input
          type={type}
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%",
            padding: "10px 12px",
            backgroundColor: "white",
            border: "1px solid #E5E9F0",
            borderRadius: "6px",
            fontSize: "14px",
            color: "#0A1D4D",
            outline: "none",
            minHeight: "40px",
            transition: "border-color 0.15s ease",
            textTransform: capitalize ? "uppercase" : undefined,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#0F766E"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E9F0"; }}
        />
      )}
    </div>
  );
}

export interface ContainerListFieldProps {
  fieldName: string;
  label: string;
  value: string | string[]; // Comma separated string or array
  isEditing?: boolean;
  editData?: EditData;
  setEditData?: (data: EditData) => void;
}

/** Editable list of container numbers — add/remove rows in edit mode. */
export function ContainerListField({
  fieldName,
  label,
  value,
  isEditing,
  editData = {},
  setEditData,
}: ContainerListFieldProps) {
  // Parse initial value
  const parseContainers = (val: any): string[] => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
          const parsed = val.split(',').map(s => s.trim());
          // In edit mode, preserve empty strings so new rows don't disappear
          return isEditing ? parsed : parsed.filter(Boolean);
      }
      return [];
  };

  // Determine current value
  const rawValue = isEditing && editData[fieldName] !== undefined
      ? editData[fieldName]
      : value;

  const containers = parseContainers(rawValue);
  // Ensure at least one empty row if editing and list is empty
  if (containers.length === 0 && isEditing) {
      if (editData[fieldName] === undefined) {
          // If just started editing and value was empty, treat as empty array
          // We push one empty string to start
          containers.push("");
      } else if (editData[fieldName] === "") {
          // Explicitly empty string means one empty row
          containers.push("");
      }
  }

  const handleChange = (index: number, val: string) => {
      const newContainers = [...containers];
      newContainers[index] = val;
      setEditData?.({ ...editData, [fieldName]: newContainers.join(', ') });
  };

  const addRow = () => {
      const newContainers = [...containers, ""];
      setEditData?.({ ...editData, [fieldName]: newContainers.join(', ') });
  };

  const removeRow = (index: number) => {
      const newContainers = containers.filter((_, i) => i !== index);
      setEditData?.({ ...editData, [fieldName]: newContainers.join(', ') });
  };

  if (!isEditing) {
      return (
          <div>
            <label style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--neuron-ink-base)",
              marginBottom: "8px"
            }}>
              {label}
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {containers.length > 0 ? containers.map((c, i) => (
                    <div key={i} style={{
                      padding: "10px 14px",
                      backgroundColor: "#FAFBFC",
                      border: "1px solid #E5E9F0",
                      borderRadius: "6px",
                      fontSize: "14px",
                      color: "var(--neuron-ink-primary)"
                    }}>
                      {c}
                    </div>
                )) : (
                    <div style={{
                      padding: "10px 14px",
                      backgroundColor: "#FAFBFC",
                      border: "2px dashed #E5E9F0",
                      borderRadius: "6px",
                      fontSize: "14px",
                      color: "#9CA3AF"
                    }}>—</div>
                )}
            </div>
          </div>
      );
  }

  return (
    <div>
      <label style={{
        display: "block",
        fontSize: "13px",
        fontWeight: 500,
        color: "var(--neuron-ink-base)",
        marginBottom: "8px"
      }}>
        {label}
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {containers.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={c}
                    onChange={(e) => handleChange(i, e.target.value)}
                    placeholder={`Container #${i + 1}`}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      backgroundColor: "white",
                      border: "1px solid #0F766E",
                      borderRadius: "6px",
                      fontSize: "14px",
                      color: "var(--neuron-ink-primary)",
                      outline: "none"
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={containers.length <= 1}
                    style={{
                        padding: '8px',
                        color: '#EF4444',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: containers.length <= 1 ? 'not-allowed' : 'pointer',
                        opacity: containers.length <= 1 ? 0.5 : 1
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
              </div>
          ))}
          <button
            type="button"
            onClick={addRow}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px',
                border: '1px dashed #0F766E',
                borderRadius: '6px',
                backgroundColor: '#F0FDFA',
                color: '#0F766E',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
            }}
          >
            <Plus size={14} /> Add Container
          </button>
      </div>
    </div>
  );
}
