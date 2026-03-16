import React, { useState, useEffect } from "react";
import { usePopper } from "react-popper";
import { Save, X } from "lucide-react";

interface RefundPopoverProps {
  referenceElement: HTMLElement | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    refundDateSubmitted: string;
    refundCheckNo: string;
    refundAmount: string;
    refundDateRefunded: string;
  }) => void;
  initialData: {
    refundDateSubmitted?: string;
    refundCheckNo?: string;
    refundAmount?: number;
    refundDateRefunded?: string;
  };
  depositAmount: number;
}

export function RefundPopover({ referenceElement, isOpen, onClose, onSave, initialData, depositAmount }: RefundPopoverProps) {
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  const [arrowElement, setArrowElement] = useState<HTMLDivElement | null>(null);
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    modifiers: [
      { name: 'arrow', options: { element: arrowElement } },
      { name: 'offset', options: { offset: [0, 8] } },
      { name: 'preventOverflow', options: { padding: 8 } },
      { name: 'flip', options: { fallbackPlacements: ['top-end'] } },
    ],
    placement: 'bottom-end',
  });

  // Internal display state (MM/DD/YYYY)
  const [formData, setFormData] = useState({
    refundDateSubmitted: "", // displayed as MM/DD/YYYY
    refundCheckNo: "",
    refundAmount: "",
    refundDateRefunded: "" // displayed as MM/DD/YYYY
  });

  // Helper to convert ISO (YYYY-MM-DD) to Display (MM/DD/YYYY)
  const toDisplayDate = (isoDate?: string) => {
    if (!isoDate) return "";
    const parts = isoDate.split('-');
    if (parts.length === 3) {
        return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    return isoDate;
  };

  // Helper to convert Display (MM/DD/YYYY) to ISO (YYYY-MM-DD)
  const toIsoDate = (displayDate: string) => {
    if (!displayDate) return "";
    const parts = displayDate.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[0]}-${parts[1]}`; // YYYY-MM-DD
    }
    // Fallback if user entered something weird but we want to try to save it or it's already ISO
    return displayDate; 
  };

  // Helper to format number with commas
  const formatNumberWithCommas = (value: string) => {
    // Remove existing commas to get clean number string
    const cleanValue = value.replace(/,/g, '');
    if (!cleanValue || isNaN(Number(cleanValue))) return value;
    
    // Split integer and decimal parts
    const parts = cleanValue.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join('.');
  };

  useEffect(() => {
    if (isOpen) {
      const initialAmount = initialData.refundAmount !== undefined ? String(initialData.refundAmount) : "";
      setFormData({
        refundDateSubmitted: toDisplayDate(initialData.refundDateSubmitted),
        refundCheckNo: initialData.refundCheckNo || "",
        refundAmount: formatNumberWithCommas(initialAmount),
        refundDateRefunded: toDisplayDate(initialData.refundDateRefunded)
      });
    }
  }, [isOpen, initialData]);

  const handleDateChange = (val: string, field: 'refundDateSubmitted' | 'refundDateRefunded') => {
    // Remove all non-digit characters
    const numbers = val.replace(/\D/g, "");
    
    // Limit to 8 digits (MMDDYYYY)
    const truncated = numbers.slice(0, 8);
    
    let formatted = truncated;
    if (truncated.length > 2) {
      formatted = `${truncated.slice(0, 2)}/${truncated.slice(2)}`;
    }
    if (truncated.length > 4) {
      formatted = `${truncated.slice(0, 2)}/${truncated.slice(2, 4)}/${truncated.slice(4)}`;
    }
    
    setFormData(prev => ({ ...prev, [field]: formatted }));
  };

  const handleAmountChange = (val: string) => {
    // Allow digits, one decimal point
    const cleanVal = val.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleanVal.split('.');
    let formattedVal = cleanVal;
    if (parts.length > 2) {
        formattedVal = `${parts[0]}.${parts.slice(1).join('')}`;
    }
    
    // Apply comma formatting
    const commaFormatted = formatNumberWithCommas(formattedVal);
    setFormData(prev => ({ ...prev, refundAmount: commaFormatted }));
  };

  const handleDateBlur = (field: 'refundDateSubmitted' | 'refundDateRefunded') => {
      // Basic validation on blur if needed
      // If incomplete, maybe clear it? But let's leave it for now.
  };

  const handleSaveInternal = () => {
      // Clean amount before saving (remove commas)
      const cleanAmount = formData.refundAmount.replace(/,/g, '');
      
      onSave({
          ...formData,
          refundDateSubmitted: toIsoDate(formData.refundDateSubmitted),
          refundDateRefunded: toIsoDate(formData.refundDateRefunded),
          refundAmount: cleanAmount
      });
  };

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
        if (popperElement && !popperElement.contains(event.target as Node) && 
            referenceElement && !referenceElement.contains(event.target as Node)) {
            onClose();
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popperElement, referenceElement, onClose]);

  // Close on ESC
  useEffect(() => {
      const handleEsc = (e: KeyboardEvent) => {
          if (e.key === "Escape") onClose();
      };
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={setPopperElement}
      style={{
        ...styles.popper,
        zIndex: 100,
        backgroundColor: "white",
        border: "1px solid #E5E7EB",
        borderRadius: "12px",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        width: "320px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        fontFamily: "Inter, sans-serif"
      }}
      {...attributes.popper}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#111827", margin: 0 }}>Refund Details</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", padding: "4px" }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Date Submitted */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
            Date Submitted
          </label>
          <input
            type="text"
            value={formData.refundDateSubmitted}
            onChange={(e) => handleDateChange(e.target.value, 'refundDateSubmitted')}
            onBlur={() => handleDateBlur('refundDateSubmitted')}
            placeholder="MM/DD/YYYY"
            maxLength={10}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: "14px",
              border: "1px solid #D1D5DB",
              borderRadius: "8px",
              outline: "none",
              color: "#111827",
              fontFamily: "monospace" // Optional: helps align date chars
            }}
          />
        </div>

        {/* Refund Check No */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
            Refund Check No
          </label>
          <input
            type="text"
            value={formData.refundCheckNo}
            onChange={(e) => setFormData({ ...formData, refundCheckNo: e.target.value })}
            placeholder="Check #"
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: "14px",
              border: "1px solid #D1D5DB",
              borderRadius: "8px",
              outline: "none",
              color: "#111827"
            }}
          />
        </div>

        {/* Refund Amount */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
            Refund Amount
          </label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6B7280", fontSize: "14px" }}>₱</span>
            <input
              type="text"
              value={formData.refundAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.00"
              style={{
                width: "100%",
                padding: "10px 12px 10px 32px",
                fontSize: "14px",
                border: "1px solid #D1D5DB",
                borderRadius: "8px",
                outline: "none",
                color: "#111827"
              }}
            />
          </div>
        </div>

        {/* Date Refunded */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
            Date Refunded
          </label>
          <input
            type="text"
            value={formData.refundDateRefunded}
            onChange={(e) => handleDateChange(e.target.value, 'refundDateRefunded')}
            onBlur={() => handleDateBlur('refundDateRefunded')}
            placeholder="MM/DD/YYYY"
            maxLength={10}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: "14px",
              border: "1px solid #D1D5DB",
              borderRadius: "8px",
              outline: "none",
              color: "#111827",
              fontFamily: "monospace"
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
        <button
            onClick={onClose}
            style={{
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#374151",
                background: "white",
                border: "1px solid #D1D5DB",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F9FAFB"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
        >
            Cancel
        </button>
        <button
            onClick={handleSaveInternal}
            style={{
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 600,
                color: "white",
                background: "#0F766E",
                border: "1px solid #0F766E",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#0D6E66"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#0F766E"}
        >
            <Save size={14} />
            Save
        </button>
      </div>

      <div ref={setArrowElement} style={styles.arrow} />
    </div>
  );
}
