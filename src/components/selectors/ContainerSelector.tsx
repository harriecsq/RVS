/**
 * ContainerSelector — shared component for selecting containers from a booking.
 * Used in trucking creation (single-select + basis autofill) and voucher creation (multi-select).
 */
import { useState, useEffect } from "react";
import { Check, Copy } from "lucide-react";
import { publicAnonKey } from "../../utils/supabase/info";
import { API_BASE_URL } from "@/utils/api-config";
import type { TruckingRecord } from "../operations/CreateTruckingModal";

export interface ContainerInfo {
  containerNo: string;
  size: string;
}

interface ContainerSelectorProps {
  bookingId: string;
  mode: "single" | "multi";
  alreadyLinkedContainerNos?: string[];
  selectedContainerNos: string[];
  onSelectionChange: (containerNos: string[], containers: ContainerInfo[]) => void;
  existingTruckingRecords?: TruckingRecord[];
  onBasisSelected?: (record: TruckingRecord) => void;
}

function extractSize(s: string): string {
  if (!s) return "20'GP";
  if (s.includes("'")) return s;
  const upper = s.toUpperCase();
  if (upper.includes("40RH") || upper.includes("REEFER")) return "40'RF";
  if (upper.includes("40HC")) return "40'HC";
  if (upper.includes("40HQ")) return "40'HQ";
  if (upper.includes("40SD")) return "40'SD";
  if (upper.includes("40GP")) return "40'GP";
  if (upper.includes("40")) return "40'HC";
  if (upper.includes("20HC")) return "20'HC";
  if (upper.includes("20HQ")) return "20'HQ";
  if (upper.includes("20GP")) return "20'GP";
  if (upper.includes("20")) return "20'GP";
  return "20'GP";
}

function parseContainersFromBooking(b: any): ContainerInfo[] {
  const rawContainers = b.containers || b.containerNo || b.container_no || b.containerNumber || b.container_number || "";
  const rawVolume = b.volume_containers || b.volume || b.measurement || "";

  if (rawContainers) {
    if (Array.isArray(rawContainers)) {
      return rawContainers.map((c: any) => ({
        containerNo: typeof c === "string" ? c : (c.containerNo || c.container_no || c.containerNumber || ""),
        size: typeof c === "string" ? extractSize(rawVolume) : (c.size || c.containerSize || extractSize(rawVolume)),
      }));
    } else if (typeof rawContainers === "string" && rawContainers.trim()) {
      const parts = rawContainers.split(",").map((s: string) => s.trim()).filter(Boolean);
      const size = extractSize(rawVolume);
      return parts.map((p: string) => ({ containerNo: p, size }));
    }
  }

  if (rawVolume) {
    const match = rawVolume.match(/(\d+)\s*[xX]\s*(.*)/);
    if (match) {
      const count = parseInt(match[1], 10);
      const size = extractSize(match[2]);
      return Array(count).fill(null).map((_, i) => ({ containerNo: `Container ${i + 1} (TBD)`, size }));
    }
  }

  return [];
}

export function ContainerSelector({
  bookingId,
  mode,
  alreadyLinkedContainerNos = [],
  selectedContainerNos,
  onSelectionChange,
  existingTruckingRecords = [],
  onBasisSelected,
}: ContainerSelectorProps) {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (bookingId) fetchContainers();
  }, [bookingId]);

  const fetchContainers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await res.json();
      if (result.success && result.data) {
        setContainers(parseContainersFromBooking(result.data));
      }
    } catch (err) {
      console.error("Error fetching booking containers:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleContainer = (containerNo: string) => {
    if (alreadyLinkedContainerNos.includes(containerNo)) return;

    let newSelection: string[];
    if (mode === "single") {
      newSelection = selectedContainerNos.includes(containerNo) ? [] : [containerNo];
    } else {
      newSelection = selectedContainerNos.includes(containerNo)
        ? selectedContainerNos.filter((n) => n !== containerNo)
        : [...selectedContainerNos, containerNo];
    }

    const selectedInfos = containers.filter((c) => newSelection.includes(c.containerNo));
    onSelectionChange(newSelection, selectedInfos);
  };

  if (isLoading) {
    return <p style={{ fontSize: "13px", color: "#667085", padding: "8px 0" }}>Loading containers...</p>;
  }

  if (containers.length === 0) {
    return <p style={{ fontSize: "13px", color: "#667085", padding: "8px 0" }}>No containers found for this booking.</p>;
  }

  return (
    <div>
      <div style={{ border: "1px solid #E5E9F0", borderRadius: "8px", overflow: "hidden" }}>
        {containers.map((c) => {
          const isLinked = alreadyLinkedContainerNos.includes(c.containerNo);
          const isSelected = selectedContainerNos.includes(c.containerNo);
          const isDisabled = isLinked;

          return (
            <div
              key={c.containerNo}
              onClick={() => !isDisabled && toggleContainer(c.containerNo)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderBottom: "1px solid #E5E9F0",
                cursor: isDisabled ? "not-allowed" : "pointer",
                backgroundColor: isSelected ? "#F0FDF4" : isDisabled ? "#F9FAFB" : "#FFFFFF",
                opacity: isDisabled ? 0.5 : 1,
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  flexShrink: 0,
                  border: `1.5px solid ${isSelected || isLinked ? "#0F766E" : "#D1D5DB"}`,
                  backgroundColor: isSelected || isLinked ? "#0F766E" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {(isSelected || isLinked) && <Check size={11} color="white" />}
              </div>

              <div style={{ flex: 1 }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D" }}>
                  {c.containerNo}
                </span>
                <span style={{ fontSize: "13px", color: "#667085", marginLeft: "12px" }}>
                  {c.size}
                </span>
              </div>

              {isLinked && (
                <span style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#667085",
                  backgroundColor: "#F3F4F6",
                  padding: "2px 8px",
                  borderRadius: "4px",
                }}>
                  Trucking assigned
                </span>
              )}
            </div>
          );
        })}
      </div>

      {onBasisSelected && existingTruckingRecords.length > 0 && (
        <div style={{ marginTop: "12px" }}>
          <label style={{ fontSize: "13px", fontWeight: 500, color: "#667085", display: "block", marginBottom: "6px" }}>
            <Copy size={13} style={{ marginRight: "4px", verticalAlign: "middle" }} />
            Copy details from existing trucking record:
          </label>
          <select
            onChange={(e) => {
              const record = existingTruckingRecords.find((r) => r.id === e.target.value);
              if (record) onBasisSelected(record);
            }}
            defaultValue=""
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: "14px",
              border: "1px solid #E5E9F0",
              borderRadius: "8px",
              backgroundColor: "#FFFFFF",
              color: "#0A1D4D",
              cursor: "pointer",
            }}
          >
            <option value="" disabled>Select a record to copy from...</option>
            {existingTruckingRecords.map((r) => (
              <option key={r.id} value={r.id}>
                {r.containerNo || "Unknown"} — {r.truckingVendor || "No vendor"} — {r.truckingRate ? `Rate: ${r.truckingRate}` : "No rate"}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
