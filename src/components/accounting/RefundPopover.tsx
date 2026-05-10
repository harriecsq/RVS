import React, { useState, useEffect } from "react";
import { usePopper } from "react-popper";
import { Save, X } from "lucide-react";
import { NeuronDatePicker } from "../operations/shared/NeuronDatePicker";

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

  // Internal state — dates stored as ISO (YYYY-MM-DD)
  const [formData, setFormData] = useState({
    refundDateSubmitted: "",
    refundCheckNo: "",
    refundAmount: "",
    refundDateRefunded: "",
  });

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
        refundDateSubmitted: initialData.refundDateSubmitted || "",
        refundCheckNo: initialData.refundCheckNo || "",
        refundAmount: formatNumberWithCommas(initialAmount),
        refundDateRefunded: initialData.refundDateRefunded || "",
      });
    }
  }, [isOpen, initialData]);

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

  const handleSaveInternal = () => {
    const cleanAmount = formData.refundAmount.replace(/,/g, '');
    onSave({ ...formData, refundAmount: cleanAmount });
  };

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const inCalendar = !!(target as Element).closest?.("[data-neuron-calendar]");
      if (inCalendar) return;
      if (popperElement && !popperElement.contains(target) &&
          referenceElement && !referenceElement.contains(target)) {
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
        border: "1px solid #E5E9F0",
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
          <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#344054", marginBottom: "6px" }}>
            Date Submitted
          </label>
          <NeuronDatePicker
            value={formData.refundDateSubmitted}
            onChange={(iso) => setFormData(prev => ({ ...prev, refundDateSubmitted: iso }))}
            placeholder="Select date"
          />
        </div>

        {/* Refund Check No */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#344054", marginBottom: "6px" }}>
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
          <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#344054", marginBottom: "6px" }}>
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
          <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#344054", marginBottom: "6px" }}>
            Date Refunded
          </label>
          <NeuronDatePicker
            value={formData.refundDateRefunded}
            onChange={(iso) => setFormData(prev => ({ ...prev, refundDateRefunded: iso }))}
            placeholder="Select date"
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
                color: "#344054",
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
