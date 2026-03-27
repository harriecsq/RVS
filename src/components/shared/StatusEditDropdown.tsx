import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { NeuronStatusPill } from "../NeuronStatusPill";

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
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

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
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <button
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

      {isOpen && !disabled && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            background: "#FFFFFF",
            border: "1px solid #E5E9F0",
            borderRadius: "8px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            zIndex: 1000,
            minWidth: "200px",
            maxHeight: "300px",
            overflowY: "auto",
          }}
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
                if (!isUpdating) {
                  e.currentTarget.style.backgroundColor = "#F9FAFB";
                }
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
        </div>
      )}
    </div>
  );
}
