import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { PortalDropdown } from "../shared/PortalDropdown";

/**
 * ComboInput - Dynamic Auto-Fill Input Component
 * 
 * A smart input field that adapts its behavior based on the number of available options:
 * - 0 options: Plain text input, no chevron
 * - 1 option: Auto-filled with green indicator (#E8F5F3 bg, #0F766E border), no chevron
 * - 2+ options: Text input with searchable dropdown, chevron visible
 * 
 * @example
 * // Basic usage
 * <ComboInput
 *   id="clientName"
 *   label="Client Name"
 *   value={clientName}
 *   onChange={(value) => setClientName(value)}
 *   options={['Client A', 'Client B', 'Client C']}
 *   placeholder="Select or enter client name"
 * />
 * 
 * @param {string} id - Unique identifier for the input field
 * @param {string} label - Optional label displayed above the input
 * @param {string} value - Current value of the input
 * @param {(value: string) => void} onChange - Callback fired when value changes
 * @param {string[]} options - Array of available options for auto-fill/dropdown
 * @param {string} placeholder - Placeholder text when input is empty
 */
interface ComboInputProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  id?: string;
}

export function ComboInput({
  value,
  options,
  onChange,
  placeholder = "Enter or select...",
  label,
  id,
}: ComboInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<string[]>(options);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine if field is auto-filled (1 option and value matches it)
  const isAutoFilled = options.length === 1 && value === options[0];
  
  // Determine if dropdown chevron should be visible (2+ options)
  const showChevron = options.length >= 2;

  // Determine if field should show green styling (only when value matches an option)
  const isMatch = options.length > 0 && value !== "" && options.includes(value);

  // Update filtered options when value or options change
  useEffect(() => {
    if (value) {
      const filtered = options.filter((option) =>
        option.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(options);
    }
  }, [value, options]);

  // Reset filtered options to show ALL options when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setFilteredOptions(options);
      setHighlightedIndex(-1);
    }
  }, [isOpen, options]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setHighlightedIndex(-1);
  };

  const handleSelectOption = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Only allow keyboard dropdown opening if there are 2+ options
    if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp") && showChevron) {
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelectOption(filteredOptions[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const highlightedElement = dropdownRef.current.querySelector(
        `[data-index="${highlightedIndex}"]`
      ) as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [highlightedIndex]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {label && (
        <label
          htmlFor={id}
          style={{
            display: "block",
            fontSize: "13px",
            fontWeight: 500,
            color: "#0A1D4D",
            marginBottom: "8px",
          }}
        >
          {label}
        </label>
      )}
      <div ref={containerRef} style={{ position: "relative" }}>
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            width: "100%",
            // Dynamic padding: less right padding when no chevron
            padding: showChevron ? "10px 36px 10px 12px" : "10px 12px",
            fontSize: "14px",
            color: "#0A1D4D",
            // Green background when options are available
            backgroundColor: isMatch ? "#E8F5F3" : "white",
            // Green border when options are available
            border: isMatch ? "1px solid #0F766E" : "1px solid #E5E9F0",
            borderRadius: "8px",
            outline: "none",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (!isOpen && !isMatch) {
              e.currentTarget.style.borderColor = "#D0D5DD";
            }
          }}
          onMouseLeave={(e) => {
            if (!isOpen) {
              // Restore appropriate border color
              e.currentTarget.style.borderColor = isMatch ? "#0F766E" : "#E5E9F0";
            }
          }}
          onFocusCapture={(e) => {
            e.currentTarget.style.borderColor = "#0F766E";
            e.currentTarget.style.boxShadow = "0 0 0 2px rgba(15, 118, 110, 0.1)";
          }}
          onBlurCapture={(e) => {
            if (!isOpen) {
              // Restore appropriate border color
              e.currentTarget.style.borderColor = isMatch ? "#0F766E" : "#E5E9F0";
              e.currentTarget.style.boxShadow = "none";
            }
          }}
        />
        {/* Only show chevron button when there are 2+ options */}
        {showChevron && (
          <button
            ref={buttonRef}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            style={{
              position: "absolute",
              right: "8px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#667085",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#0F766E";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#667085";
            }}
          >
            <ChevronDown
              size={18}
              style={{
                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
          </button>
        )}
      </div>

      <PortalDropdown
        isOpen={isOpen && showChevron}
        onClose={() => setIsOpen(false)}
        triggerRef={containerRef}
        align="left"
      >
        <div ref={dropdownRef}>
          {filteredOptions.length === 0 ? (
            <div style={{ padding: "12px 16px", fontSize: "14px", color: "#667085", textAlign: "center" }}>
              No options found
            </div>
          ) : (
            filteredOptions.map((option, index) => {
              const isHighlighted = index === highlightedIndex;
              const isSelected = option === value;
              return (
                <div
                  key={index}
                  data-index={index}
                  onClick={() => handleSelectOption(option)}
                  style={{
                    padding: "10px 16px", fontSize: "14px", color: "#0A1D4D", cursor: "pointer",
                    backgroundColor: isHighlighted ? "#0F766E0A" : isSelected ? "#0F766E15" : "white",
                    borderBottom: index < filteredOptions.length - 1 ? "1px solid #F0F2F5" : "none",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={(e) => { if (!isHighlighted) e.currentTarget.style.backgroundColor = "#F8FAFB"; }}
                  onMouseLeave={(e) => {
                    if (!isHighlighted && !isSelected) e.currentTarget.style.backgroundColor = "white";
                    else if (isSelected && !isHighlighted) e.currentTarget.style.backgroundColor = "#0F766E15";
                  }}
                >
                  <span>{option}</span>
                  {isSelected && <Check size={16} style={{ color: "#0F766E", flexShrink: 0 }} />}
                </div>
              );
            })
          )}
        </div>
      </PortalDropdown>
    </div>
  );
}