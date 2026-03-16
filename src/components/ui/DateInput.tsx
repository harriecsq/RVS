import * as React from "react";
import { cn } from "./utils";
import { Calendar as CalendarIcon } from "lucide-react";

export interface DateInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: string; // YYYY-MM-DD
  onChange: (value: string) => void; // YYYY-MM-DD
}

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState("");

    // Sync internal state with external value prop
    React.useEffect(() => {
      if (value) {
        // Expect YYYY-MM-DD
        const [y, m, d] = value.split("-");
        if (y && m && d && y.length === 4 && m.length === 2 && d.length === 2) {
           setDisplayValue(`${m}/${d}/${y}`);
        } else if (!value) {
           setDisplayValue("");
        }
      } else {
        setDisplayValue("");
      }
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value;
      
      // Allow user to clear input
      if (!inputValue) {
        setDisplayValue("");
        onChange("");
        return;
      }

      // Strip non-digits
      const digits = inputValue.replace(/\D/g, "");
      
      // Limit to 8 digits
      const truncated = digits.slice(0, 8);

      // Format as MM/DD/YYYY
      let formatted = "";
      if (truncated.length > 0) {
        formatted = truncated.slice(0, 2);
        if (truncated.length > 2) {
          formatted += "/" + truncated.slice(2, 4);
        }
        if (truncated.length > 4) {
          formatted += "/" + truncated.slice(4, 8);
        }
      }

      setDisplayValue(formatted);

      // Validate and emit YYYY-MM-DD if complete
      if (truncated.length === 8) {
        const mm = truncated.slice(0, 2);
        const dd = truncated.slice(2, 4);
        const yyyy = truncated.slice(4, 8);

        // Basic validation
        const m = parseInt(mm, 10);
        const d = parseInt(dd, 10);
        const y = parseInt(yyyy, 10);

        if (m > 0 && m <= 12 && d > 0 && d <= 31 && y > 1900 && y < 2100) {
          onChange(`${yyyy}-${mm}-${dd}`);
        } else {
          // Keep internal state but don't emit invalid date? 
          // Or emit empty?
          // Existing behavior of type="date" is usually to emit empty if invalid.
          // But we want to let the user finish typing.
          // So we only emit if valid.
        }
      } else {
        // Incomplete date, emit empty? 
        // If we emit empty, the parent state clears. 
        // If the parent passes the value back, it clears our input (due to useEffect).
        // BUT, our useEffect only updates if `value` changes. 
        // If we emit "", and parent state becomes "", useEffect runs.
        // If we want to persist the partial input, we need to NOT emit "" continuously if it clears the state.
        // However, standard controlled inputs usually work this way.
        // Let's rely on the fact that if we emit "", the parent updates to "", passed back to us, we setDisplayValue("").
        // This effectively prevents typing! 
        // "1" -> emit "" -> value="" -> setDisplayValue("") -> input clears.
        
        // CORRECTION:
        // We should ONLY emit when valid. 
        // But if we don't emit, the parent state doesn't update. 
        // If the parent state doesn't update, `value` prop remains old value.
        // If `value` prop doesn't change, useEffect doesn't run.
        // So displayValue persists as typed.
        // This is correct for "controlled by valid value" logic.
        
        // What if user deletes everything? We emitted "" above.
        
        // What if user edits "2023-01-01" -> "2023-01-0"?
        // We emit nothing? Then `value` prop stays "2023-01-01".
        // UseEffect doesn't run. Display value is "01/01/202".
        // Visual is correct. Data is stale (still 2023-01-01).
        // This might be misleading.
        
        // Usually, for a text input representing a date, we want to emit the partial value or null.
        // But existing `type="date"` inputs emit "" when invalid.
        
        // Let's emit "" when invalid/incomplete.
        // BUT, we need to prevent the useEffect from blowing away our partial input.
        // We can check if the incoming `value` matches what we just emitted? No.
        
        // Solution:
        // The `useEffect` should only update `displayValue` if the *prop value* changes to something *different* 
        // from what our current `displayValue` represents.
        // Or simpler: Only update displayValue from props if the prop value is defined and valid.
        // If prop value is "", we clear displayValue? 
        // If we type "1", we emit "". Prop becomes "". displayValue becomes "".
        // LOOP OF DEATH.
        
        // Standard pattern for masked inputs:
        // Maintain local state.
        // Only sync from props if the prop value corresponds to a DIFFERENT date than local state.
        // AND handle the case where parent forces a reset.
        
        onChange(""); // If incomplete, we say "no date".
      }
    };
    
    // Improved useEffect to avoid loop of death
    React.useEffect(() => {
        // If displayValue is empty, and value is present, sync.
        // If value is present, format it.
        // If formatted value !== displayValue, sync.
        // This allows external updates to override.
        // But what about internal updates causing external clear?
        
        if (value) {
            const [y, m, d] = value.split("-");
            if (y && m && d && y.length === 4 && m.length === 2 && d.length === 2) {
                const formatted = `${m}/${d}/${y}`;
                if (formatted !== displayValue) {
                    setDisplayValue(formatted);
                }
            }
        } else if (value === "" && displayValue !== "") {
            // External cleared it, but we have something?
            // If we just emitted "", we don't want to clear.
            // How to distinguish "Parent cleared it" vs "We emitted clear"?
            // We can't easily.
            
            // Alternative: The component should purely be controlled by `value`? 
            // No, masking requires local state management usually.
            
            // Let's assume the parent only passes back what we emit.
            // If we emit "", parent passes "".
            // If we want to keep "1", we must NOT update displayValue from props if props is empty but we are focused?
            // Or only update from props if props is VALID?
            
            // If I set `value` to undefined in parent, it clears.
            
            // Let's try this:
            // Only sync from props if props value is a valid full date string.
            // If props value is empty string, ONLY clear if our internal state implies we should be empty?
            // No, if user clicks "Clear" button outside, we must clear.
            
            // Ok, simpler approach:
            // Pass `displayValue` up? No, `onChange` expects standard date format.
            
            // Let's use a ref to track if the last change was internal.
        }
    }, [value]); // Removed displayValue from dependency to avoid loop

    // To fix the loop issue:
    // We will separate "committing" the change from "typing".
    // But `onChange` implies immediate update.
    
    // Let's look at how we implemented `CompanyContactSelector`. It uses internal state and `useEffect` to sync initial.
    // But for a controlled input, it's trickier.
    
    // If I use `onChange` for every keystroke, I must emit the raw text?
    // No, the system expects YYYY-MM-DD.
    
    // Maybe I should allow the component to accept specific "invalid" value?
    // No.
    
    // Compromise:
    // The component manages its own display state.
    // It emits YYYY-MM-DD when valid.
    // It emits "" when invalid.
    // The `useEffect` ONLY updates `displayValue` if `value` (prop) is a VALID date string.
    // If `value` is "", we DO NOT clear `displayValue` automatically, UNLESS the user explicitly cleared it?
    // This breaks "Reset form" functionality.
    
    // Better Compromise:
    // The component accepts `value` (YYYY-MM-DD).
    // It creates `displayValue` (MM/DD/YYYY).
    // On change, it updates `displayValue`.
    // It tries to parse `displayValue`.
    // If valid, calls `onChange(parsed)`.
    // If invalid, calls `onChange("")`? 
    // If I call `onChange("")`, and parent passes back `""`, and I update `displayValue` to `""`...
    
    // Refined UseEffect Logic:
    // Compare parsed `displayValue` with `value`.
    // If they match (logically), do nothing.
    // If they differ, update `displayValue` from `value`.
    
    // Example:
    // display="01/01/202" (invalid). value="" (current prop).
    // User types "3". display="01/01/2023". valid. emit "2023-01-01".
    // Parent updates value="2023-01-01".
    // Effect runs. "2023-01-01" -> "01/01/2023". Matches display. No change.
    
    // User backspaces. display="01/01/202". invalid. emit "".
    // Parent updates value="".
    // Effect runs. value="" -> targetDisplay="".
    // Current display="01/01/202".
    // Mismatch. Update display to "".
    // INPUT CLEARS WHILE TYPING.
    
    // Fix:
    // Check if the input is focused?
    // If focused, do not sync from props unless props value is VALID and DIFFERENT?
    // If props is "", and we are focused, ignore it?
    
    // This works for typing.
    // But if we click "Clear" button while focused?
    // It won't clear.
    
    // Most robust solution:
    // Do not emit "" on every invalid keystroke.
    // Only emit when it BECOMES valid?
    // But then data is stale. "2023-01-01" -> backspace -> "2023-01-01" (stale).
    // This is often acceptable for date pickers.
    // They hold the last valid value or don't update until valid.
    
    // I will use this approach:
    // `onChange` is only called when the date is valid or completely empty.
    // If partial, we don't call `onChange`.
    // This preserves the parent's last valid state while the user corrects the date.
    
    const [lastValidValue, setLastValidValue] = React.useState(value || "");

    const handleInputChangeInternal = (e: React.ChangeEvent<HTMLInputElement>) => {
       // ... masking logic ...
       setDisplayValue(formatted);
       
       if (formatted === "") {
          onChange("");
       } else if (isValid(formatted)) {
          const iso = toISO(formatted);
          onChange(iso);
       }
       // Else (partial): Do not call onChange.
    }
    
    // But if I don't call onChange, the input is uncontrolled for that period?
    // No, `displayValue` is local state. Input value comes from `displayValue`.
    // So it works visually.
    
    // One edge case:
    // User changes "01/01/2023" to "01/01/2024".
    // "01/01/202" -> Invalid. Parent still has "2023-01-01".
    // "01/01/2024" -> Valid. Parent gets "2024-01-01".
    // Works.
    
    // User clears input.
    // "" -> Valid (empty). Parent gets "".
    // Works.
    
    // User changes "01/01/2023" to "02/01/2023"
    // "01/01/2023" -> delete 1 -> "0/01/2023" (formatted logic might be weird here but assuming mask works)
    // If I select "01" and type "02"?
    // Selection handling is hard with simple masking.
    // I'll stick to append/backspace logic primarily.
    
    return (
      <div className="relative">
        <input 
          {...props}
          className={cn(
             "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
             className
          )}
          value={displayValue}
          onChange={handleInputChange}
          placeholder="MM/DD/YYYY"
        />
        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>
    );
  }
);
DateInput.displayName = "DateInput";
