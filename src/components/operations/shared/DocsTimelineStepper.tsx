import { useState, useRef, useEffect } from "react";
import { Trash2, X } from "lucide-react";
import { StandardButton } from "../../design-system/StandardButton";
import { NeuronTimePicker } from "./NeuronTimePicker";

export interface DocsTimelineStep {
  step: "Draft" | "Signed" | "Final" | "For Debit" | "Debited";
  datetime: string | null; // ISO string
  notes: string;
}

interface DocsTimelineStepperProps {
  timeline: DocsTimelineStep[];
  onUpdate: (newTimeline: DocsTimelineStep[]) => void;
}

const STEPS = [
  { label: "Draft" },
  { label: "Signed" },
  { label: "Final" },
  { label: "For Debit" },
  { label: "Debited" }
] as const;

// Constants for styling
const ACCENT_COLOR = "#10B981";
const NEUTRAL_LINE = "#D1D5DB";
const NEUTRAL_TEXT = "#9CA3AF";
const DARK_TEXT = "#111827";

export function DocsTimelineStepper({ timeline, onUpdate }: DocsTimelineStepperProps) {
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const [editData, setEditData] = useState<{ date: string; time: string; notes: string }>({ date: "", time: "", notes: "" });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Refs for each step container to anchor popover
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Initialize timeline merging with defaults
  const currentTimeline = STEPS.map(s => {
    const existing = timeline?.find(t => t.step === s.label);
    return existing || { step: s.label, datetime: null, notes: "" };
  });

  // Calculate states
  // Current = first step without datetime, or last if all completed
  let currentVisualStepIndex = currentTimeline.findIndex(t => !t.datetime);
  if (currentVisualStepIndex === -1) currentVisualStepIndex = currentTimeline.length - 1;

  useEffect(() => {
    // Close popover on click outside
    function handleClickOutside(event: MouseEvent) {
      if (activeStepIndex !== null && 
          popoverRef.current && 
          !popoverRef.current.contains(event.target as Node) &&
          !stepRefs.current[activeStepIndex]?.contains(event.target as Node)) {
        setActiveStepIndex(null);
        setShowClearConfirm(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeStepIndex]);

  const handleStepClick = (index: number) => {
    if (activeStepIndex === index) {
      setActiveStepIndex(null);
      return;
    }

    const stepData = currentTimeline[index];
    let dateStr = "";
    let timeStr = "";
    
    if (stepData.datetime) {
      const date = new Date(stepData.datetime);
      dateStr = date.toISOString().split('T')[0];
      timeStr = date.toTimeString().slice(0, 5);
    } else {
      const now = new Date();
      dateStr = now.toISOString().split('T')[0];
      timeStr = now.toTimeString().slice(0, 5);
    }

    setEditData({
      date: dateStr,
      time: timeStr,
      notes: stepData.notes || ""
    });
    
    // Position logic - Align slightly left of the step center or auto-adjust
    const el = stepRefs.current[index];
    if (el) {
      const popoverWidth = 300;
      let left = el.offsetLeft;
      
      // Adjust if too close to right edge
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        // Try to center under the step if possible
        const stepWidth = el.offsetWidth;
        const idealLeft = el.offsetLeft + (stepWidth / 2) - (popoverWidth / 2);
        
        // Clamp
        left = Math.max(0, Math.min(idealLeft, containerWidth - popoverWidth));
      }
      
      setPopoverPosition({ top: el.offsetHeight + 6, left });
    }

    setActiveStepIndex(index);
    setShowClearConfirm(false);
  };

  const handleSave = () => {
    if (activeStepIndex === null) return;
    
    const newTimeline = [...currentTimeline];
    const step = newTimeline[activeStepIndex];
    
    if (editData.date && editData.time) {
      step.datetime = `${editData.date}T${editData.time}`;
      step.notes = editData.notes;
      onUpdate(newTimeline);
      setActiveStepIndex(null);
    }
  };

  const handleClear = () => {
    if (activeStepIndex === null) return;
    
    const hasLaterSteps = currentTimeline.slice(activeStepIndex + 1).some(t => t.datetime);
    
    if (hasLaterSteps && !showClearConfirm) {
      setShowClearConfirm(true);
      return;
    }

    const newTimeline = [...currentTimeline];
    for (let i = activeStepIndex; i < newTimeline.length; i++) {
      newTimeline[i].datetime = null;
      newTimeline[i].notes = "";
    }
    
    onUpdate(newTimeline);
    setActiveStepIndex(null);
    setShowClearConfirm(false);
  };

  return (
    <div 
      ref={containerRef}
      style={{ 
        display: "flex", 
        width: "100%", 
        minWidth: "360px", // Ensure minimum width for spacing
        maxWidth: "500px", // Prevent it from stretching too wide
        marginLeft: "auto",
        position: "relative",
        justifyContent: "space-between"
      }}
    >
      {currentTimeline.map((t, i) => {
        const isFirst = i === 0;
        const isCompleted = !!t.datetime;
        const isCurrent = i === currentVisualStepIndex;
        // A step is "reached" only if it is completed (has a saved date).
        const isReached = isCompleted;
        
        // --- Styles ---
        const dotBg = isReached ? ACCENT_COLOR : "transparent";
        // If future (outlined), use Neutral border. If reached, use Accent border.
        const dotBorderColor = isReached ? ACCENT_COLOR : NEUTRAL_TEXT; 
        // Note: Neutral text color used for border to match "outlined neutral gray"
        
        // Sizes
        const dotSize = isCurrent ? "10px" : "8px";
        const dotRing = isCurrent ? `0 0 0 2px ${ACCENT_COLOR}66` : "none";
        
        // Line
        // The left connector belongs to this step visually
        const lineColor = isReached ? ACCENT_COLOR : NEUTRAL_LINE;
        
        // Text
        const labelColor = isReached ? DARK_TEXT : NEUTRAL_TEXT;
        const labelWeight = isCurrent ? 600 : 400;
        
        // Date & Time
        let dateLine = "";
        let timeLine = "";
        
        if (t.datetime) {
          const dateObj = new Date(t.datetime);
          dateLine = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
          timeLine = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        }

        return (
          <div 
            key={i}
            ref={el => stepRefs.current[i] = el}
            onClick={() => handleStepClick(i)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
              cursor: "pointer",
              isolation: "isolate" // Create stacking context
            }}
          >
            {/* 1. Top Row: Line + Dot */}
            <div style={{ 
              width: "100%", 
              height: "14px", // Fixed height for dot row
              display: "flex", 
              justifyContent: "center", 
              alignItems: "center",
              position: "relative",
              marginBottom: "4px"
            }}>
              {/* Connector Line (Left) */}
              {!isFirst && (
                <div style={{
                  position: "absolute",
                  left: "-50%",
                  width: "100%",
                  top: "50%",
                  marginTop: "-1px", // Center 2px line
                  height: "2px",
                  backgroundColor: lineColor,
                  zIndex: 0
                }} />
              )}
              
              {/* Dot */}
              <div style={{
                width: dotSize,
                height: dotSize,
                borderRadius: "50%",
                backgroundColor: dotBg,
                border: `2px solid ${dotBorderColor}`,
                boxShadow: dotRing,
                zIndex: 10, // Above line
                transition: "all 0.2s ease"
              }} />
            </div>
            
            {/* 2. Label */}
            <div style={{
              fontSize: "12px",
              lineHeight: "14px",
              color: labelColor,
              fontWeight: labelWeight,
              textAlign: "center",
              marginBottom: "4px",
              whiteSpace: "nowrap"
            }}>
              {t.step}
            </div>
            
            {/* 3. Date & Time Subtext */}
            {t.datetime && (
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "2px"
              }}>
                <div style={{
                  fontSize: "10px",
                  lineHeight: "12px",
                  color: NEUTRAL_TEXT,
                  textAlign: "center",
                  whiteSpace: "nowrap"
                }}>
                  {dateLine}
                </div>
                <div style={{
                  fontSize: "10px",
                  lineHeight: "12px",
                  color: NEUTRAL_TEXT,
                  textAlign: "center",
                  whiteSpace: "nowrap"
                }}>
                  {timeLine}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Popover */}
      {activeStepIndex !== null && (
        <div 
          ref={popoverRef}
          style={{
            position: "absolute",
            top: popoverPosition.top,
            left: popoverPosition.left,
            width: "300px",
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            border: "1px solid #E5E9F0",
            zIndex: 50,
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#111827", margin: 0 }}>
              Update: {STEPS[activeStepIndex].label}
            </h4>
            <button 
              onClick={() => setActiveStepIndex(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280" }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#4B5563", marginBottom: "4px" }}>Date</label>
              <div style={{ position: "relative" }}>
                <input 
                  type="date" 
                  value={editData.date}
                  onChange={e => setEditData({...editData, date: e.target.value})}
                  style={{ 
                    width: "100%", 
                    padding: "6px 8px 6px 8px", 
                    fontSize: "13px", 
                    border: "1px solid #D1D5DB", 
                    borderRadius: "4px",
                    color: "#111827",
                    cursor: "pointer"
                  }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#4B5563", marginBottom: "4px" }}>Time</label>
              <NeuronTimePicker value={editData.time} onChange={(v) => setEditData({...editData, time: v})} />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", color: "#4B5563", marginBottom: "4px" }}>Notes (Optional)</label>
            <textarea 
              value={editData.notes}
              onChange={e => setEditData({...editData, notes: e.target.value})}
              rows={2}
              style={{ 
                width: "100%", 
                padding: "8px", 
                fontSize: "13px", 
                border: "1px solid #D1D5DB", 
                borderRadius: "4px",
                color: "#111827",
                resize: "none",
                fontFamily: "inherit"
              }}
              placeholder="Add details..."
            />
          </div>

          {showClearConfirm ? (
            <div style={{ background: "#FEF2F2", padding: "8px", borderRadius: "4px", fontSize: "12px", color: "#EF4444" }}>
              <div style={{ marginBottom: "8px" }}>
                Clearing <strong>{STEPS[activeStepIndex].label}</strong> will also clear later steps. Continue?
              </div>
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  style={{ padding: "4px 8px", background: "white", border: "1px solid #FECACA", borderRadius: "4px", cursor: "pointer", color: "#7F1D1D" }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleClear}
                  style={{ padding: "4px 8px", background: "#EF4444", border: "none", borderRadius: "4px", cursor: "pointer", color: "white", fontWeight: 500 }}
                >
                  Confirm Clear
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
              <button 
                onClick={handleClear}
                style={{ 
                  background: "none", 
                  border: "none", 
                  cursor: "pointer", 
                  color: "#EF4444", 
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <Trash2 size={12} />
                Clear Step
              </button>

              <div style={{ display: "flex", gap: "8px" }}>
                <StandardButton 
                  variant="secondary" 
                  onClick={() => setActiveStepIndex(null)}
                  style={{ height: "32px", padding: "0 12px", fontSize: "13px" }}
                >
                  Cancel
                </StandardButton>
                <StandardButton 
                  variant="primary" 
                  onClick={handleSave}
                  style={{ height: "32px", padding: "0 12px", fontSize: "13px" }}
                >
                  Save
                </StandardButton>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}