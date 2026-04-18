import { useState, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";
import { NeuronStatusPill } from "../NeuronStatusPill";
import { PortalDropdown } from "./PortalDropdown";

interface StatusEditDropdownProps {
  currentStatus: string;
  availableStatuses: string[];
  onStatusChange: (newStatus: string) => Promise<void>;
  disabled?: boolean;
}

export function StatusEditDropdown({
  currentStatus,
  availableStatuses,
  onStatusChange,
  disabled = false,
}: StatusEditDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleStatusSelect = async (newStatus: string) => {
    if (newStatus === currentStatus || isUpdating) return;
    setIsUpdating(true);
    try {
      await onStatusChange(newStatus);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || isUpdating}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "transparent",
          border: "none",
          cursor: disabled || isUpdating ? "not-allowed" : "pointer",
          padding: "0",
          opacity: disabled || isUpdating ? 0.6 : 1,
        }}
      >
        <NeuronStatusPill status={currentStatus} size="sm" />
        {!disabled && (
          <ChevronDown
            size={16}
            color="#6B7280"
            style={{
              transition: "transform 0.2s ease",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        )}
      </button>

      <PortalDropdown
        isOpen={isOpen && !disabled}
        onClose={() => setIsOpen(false)}
        triggerRef={triggerRef}
        minWidth="200px"
        align="right"
      >
        {availableStatuses.map((status) => (
          <button
            key={status}
            onClick={() => handleStatusSelect(status)}
            disabled={isUpdating}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              padding: "10px 12px",
              background: "transparent",
              border: "none",
              cursor: isUpdating ? "not-allowed" : "pointer",
              textAlign: "left",
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!isUpdating) e.currentTarget.style.backgroundColor = "#F9FAFB";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <NeuronStatusPill status={status} size="sm" />
            {status === currentStatus && (
              <Check size={16} color="#0F766E" strokeWidth={2.5} />
            )}
          </button>
        ))}
      </PortalDropdown>
    </div>
  );
}
