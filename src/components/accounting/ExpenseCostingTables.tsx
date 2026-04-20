import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "../ui/input";
import { formatAmount } from "../../utils/formatAmount";
import { PortalDropdown } from "../shared/PortalDropdown";
import { FilterSingleDropdown } from "../shared/FilterSingleDropdown";

// Types
export interface ExpenseLineItem {
  id: string;
  particulars: string;
  amount: number;
  currency: string;
  unitPrice?: number | string;
  per?: string;
  voucherNo?: string;
  isAutoFilled?: boolean;
  sourceVoucherLineItemId?: string; // ID link to the original voucher line item
  multiplyByContainers?: boolean; // Export only: multiply unit price by container count (default true)
}

export interface DomesticSection {
  segmentId: string;
  segmentLabel: string;
  containerNos: string[];
  items: ExpenseLineItem[];
}

export interface ExpenseTablesData {
  particulars: ExpenseLineItem[];
  additionalCharges: ExpenseLineItem[];
  refundableDeposits: ExpenseLineItem[];
  // Export-specific categories
  exportCategories?: { [categoryName: string]: ExpenseLineItem[] };
  // Domestic sections — one per province segment
  domesticSections?: DomesticSection[];
}

interface ExpenseCostingTablesProps {
  booking: any; // The full booking object
  vouchers: any[]; // List of vouchers linked to the booking
  onChange: (data: ExpenseTablesData) => void;
  isImport?: boolean;
  exchangeRate?: string; // Exchange rate for export bookings
  truckingVendor?: string; // Trucking vendor from trucking record (for import standardized items)
}

// Helper: Calculate total for a list of items
const calculateTotal = (items: ExpenseLineItem[]) => items.reduce((sum, i) => sum + (i.amount || 0), 0);

// Category definitions in display order — IMPORT only
const CATEGORIES: { key: keyof ExpenseTablesData; label: string; isRefundable?: boolean }[] = [
  { key: "particulars", label: "Particulars" },
  { key: "additionalCharges", label: "Additional Charges" },
];

// EXPORT fixed category order
const EXPORT_CATEGORY_ORDER = [
  "SHIPPING",
  "CUSTOMS",
  "PORT CHARGES",
  "FORM E",
  "MISCELLANEOUS",
  "TRUCKING",
];

// Export standardized suggested particulars per category (not auto-populated)
export const EXPORT_STANDARD_PARTICULARS: Record<string, string[]> = {
  "SHIPPING": ["Ocean Freight", "Seal Fee", "Docs Stamp", "Storage"],
  "CUSTOMS": ["Export Division", "ODC", "Royalty Fee", "Lodgement Fee", "Processing Fee"],
  "PORT CHARGES": ["Arrastre", "Shut Out", "Waiting Fee", "Weighing"],
  "FORM E": ["Facilitation", "Registration Fee", "Forms", "Phyto Certificate"],
  "MISCELLANEOUS": ["LONA", "Lalamove", "BIR", "Labor", "DG Sticker", "Vanning Certificate"],
  // TRUCKING intentionally omitted — remains manual/free-entry only
};

// Domestic section standardized items (for export province legs)
export const DOMESTIC_STANDARD_PARTICULARS = [
  "Domestic Freight",
  "Stripping/Hustling/Stuffing",
  "Trucking",
  "Labor",
  "Lona",
  "BIR",
];

// Get available (not yet used) domestic suggested particulars
export const getAvailableDomesticSuggestions = (currentItems: { particulars?: string; description?: string }[]): string[] => {
  const usedLabels = new Set(currentItems.map(i => (i.particulars || i.description || "").trim()));
  return DOMESTIC_STANDARD_PARTICULARS.filter(s => !usedLabels.has(s));
};

// Get available (not yet used) export suggested particulars for a category
export const getAvailableExportSuggestions = (categoryName: string, currentItems: { particulars?: string; description?: string }[]): string[] => {
  const suggestions = EXPORT_STANDARD_PARTICULARS[categoryName] || [];
  const usedLabels = new Set(currentItems.map(i => (i.particulars || i.description || "").trim()));
  return suggestions.filter(s => !usedLabels.has(s));
};

const formatExportCategoryName = (name: string) => {
  if (name === "FORM E") return "Form E";
  if (name === "PORT CHARGES") return "Port Charges";
  return name.charAt(0) + name.slice(1).toLowerCase();
};

// Standardized Import Particulars — the 8 items that always appear for IMPORT bookings
// Each returns a key (for matching/identification) and the generated label text
const IMPORT_STANDARD_PARTICULARS_KEYS = [
  "DUTIES_AND_TAXES",
  "LOCAL_CHARGES",
  "TRUCKING",
  "ARRASTRE_WHARFAGE",
  "BROKER",
  "SECTION",
  "CUSTOMS_LOCATION",
  "NOTARY_GOFAST_LODGEMENT",
] as const;

type ImportStandardKey = typeof IMPORT_STANDARD_PARTICULARS_KEYS[number];

// For provincial import PODs (CDO, Iloilo, Davao) these keys are not offered as standardized entries.
const PROVINCIAL_POD_EXCLUDED_KEYS: readonly ImportStandardKey[] = [
  "BROKER",
  "SECTION",
  "CUSTOMS_LOCATION",
  "NOTARY_GOFAST_LODGEMENT",
];

function isProvincialImportPod(booking: any): boolean {
  // Import bookings store the POD dropdown value in `pod`. Fall back to other field names for safety.
  const pod = booking?.pod || booking?.portOfDestination || booking?.port_of_destination || booking?.destination || "";
  return pod === "CDO" || pod === "Iloilo" || pod === "Davao";
}

function getActiveImportStandardKeys(booking: any): readonly ImportStandardKey[] {
  if (isProvincialImportPod(booking)) {
    return IMPORT_STANDARD_PARTICULARS_KEYS.filter(k => !PROVINCIAL_POD_EXCLUDED_KEYS.includes(k));
  }
  return IMPORT_STANDARD_PARTICULARS_KEYS;
}

function generateImportStandardLabel(key: ImportStandardKey, booking: any, truckingVendor?: string, containerCount?: number): string {
  switch (key) {
    case "DUTIES_AND_TAXES":
      return "Duties and Taxes";
    case "LOCAL_CHARGES": {
      // Build "{count}x{volumeType}" from container count and volume type
      const rawVol = booking?.volume || "";
      // Volume may already be "2x40'HC" or just "40'HC" — extract the type portion
      const volMatch = rawVol.match(/^\d+x(.+)$/i);
      const volumeType = volMatch ? volMatch[1] : rawVol; // e.g. "40'HC"
      const count = containerCount || 0;
      const vol = volumeType === "LCL" ? "LCL" : (count > 0 && volumeType ? `${count}x${volumeType}` : (rawVol || booking?.containerNo || "N/A"));
      const shippingLine = booking?.shippingLine || booking?.shipping_line || "N/A";
      return `${vol} - ${shippingLine} (Invoice Number #####)`;
    }
    case "TRUCKING": {
      const vendor = truckingVendor || booking?.trucker || booking?.truckingVendor || "N/A";
      const rawVol = booking?.volume || "";
      const volMatch = rawVol.match(/^\d+x(.+)$/i);
      const volumeType = volMatch ? volMatch[1] : rawVol;
      if (containerCount && containerCount > 0 && volumeType) {
        return volumeType === "LCL" ? `${vendor} LCL` : `${vendor} ${containerCount}x${volumeType}`;
      }
      const addr = booking?.destination || booking?.pod || "N/A";
      return `${vendor} Trucking - ${addr}`;
    }
    case "ARRASTRE_WHARFAGE":
      return "Arrastre and Wharfage";
    case "BROKER":
      return "Broker";
    case "SECTION": {
      const section = booking?.section || booking?.SOP || booking?.sop;
      return section ? `Section ${section}` : "Section #";
    }
    case "CUSTOMS_LOCATION": {
      const location = (booking?.destination || booking?.pod || "").toUpperCase();
      if (location.includes("NORTH") || location.includes("MICP")) return "Customs North";
      if (location.includes("SOUTH") || location.includes("POM")) return "Customs South";
      return "Customs";
    }
    case "NOTARY_GOFAST_LODGEMENT":
      return "Notary / Go Fast / Lodgement";
    default:
      return "";
  }
}

function getImportStandardAmount(key: ImportStandardKey, containerCount: number): number {
  if (key === "BROKER") return 1000 * containerCount;
  return 0;
}

// Voucher keyword matching to standard keys
function matchVoucherToStandardKey(desc: string): ImportStandardKey | null {
  if (desc.includes("Duties & Taxes") || desc.includes("Duties and Taxes")) return "DUTIES_AND_TAXES";
  if (desc.includes("Local Charges")) return "LOCAL_CHARGES";
  if (desc.includes("Trucking") || desc.includes("Hauling")) return "TRUCKING";
  if (desc.includes("Arrastre")) return "ARRASTRE_WHARFAGE";
  if (desc.includes("SOP") || desc.includes("Facilitation")) return "SECTION";
  if (desc.includes("Notary") || desc.includes("Go Fast") || desc.includes("Lodgement")) return "NOTARY_GOFAST_LODGEMENT";
  return null;
}

export function ExpenseCostingTables({ booking, vouchers, onChange, isImport, exchangeRate, truckingVendor }: ExpenseCostingTablesProps) {
  // Helper to create an empty line item
  const createEmptyItem = (): ExpenseLineItem => ({
    id: Math.random().toString(36).substr(2, 9),
    particulars: "",
    amount: 0,
    currency: "PHP",
    ...((!isImport) ? { unitPrice: 0, per: "40", multiplyByContainers: true } : {}),
  });

  // Export-specific: compute container count from booking
  const containerCount = (() => {
    if (!booking) return 0;
    if (booking.containerNumbers && Array.isArray(booking.containerNumbers)) return booking.containerNumbers.filter(Boolean).length;
    if (booking.containerNo) return booking.containerNo.split(',').filter(Boolean).length;
    if (booking.volume) {
      const match = booking.volume.match(/^(\d+)x/i);
      if (match) return parseInt(match[1]);
    }
    return 0;
  })();

  // Export-specific: compute volume amount
  const parsedExchangeRate = parseFloat(String(exchangeRate || "1")) || 1;
  const computeVolumeAmount = (unitPrice: number | string, per: string | undefined, currency: string | undefined, multiplyByContainers?: boolean) => {
    const parsedPrice = parseFloat(String(unitPrice)) || 0;
    const currencyMultiplier = (currency === "USD" || currency === "RMB") ? parsedExchangeRate : 1;
    const containerMultiplier = (multiplyByContainers !== false) ? containerCount : 1;
    return parsedPrice * currencyMultiplier * containerMultiplier;
  };

  // Export-specific: update handler that recomputes amount
  const handleExportUpdate = (table: keyof ExpenseTablesData, id: string, field: string, value: any) => {
    const newTables = { ...tables };
    newTables[table] = (newTables[table] as ExpenseLineItem[]).map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      // Recompute amount whenever unitPrice, per, currency, or multiplyByContainers changes
      if (field === 'unitPrice' || field === 'per' || field === 'currency' || field === 'multiplyByContainers') {
        updated.amount = computeVolumeAmount(
          field === 'unitPrice' ? value : updated.unitPrice || 0,
          field === 'per' ? value : updated.per,
          field === 'currency' ? value : updated.currency,
          field === 'multiplyByContainers' ? value : updated.multiplyByContainers
        );
      }
      return updated;
    });
    setTables(newTables);
    onChange(newTables);
  };

  // Export-specific: update handler for exportCategories
  const handleExportCategoryUpdate = (categoryName: string, id: string, field: string, value: any) => {
    const newTables = { ...tables };
    const cats = { ...(newTables.exportCategories || {}) };
    cats[categoryName] = (cats[categoryName] || []).map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'unitPrice' || field === 'per' || field === 'currency' || field === 'multiplyByContainers') {
        updated.amount = computeVolumeAmount(
          field === 'unitPrice' ? value : updated.unitPrice || 0,
          field === 'per' ? value : updated.per,
          field === 'currency' ? value : updated.currency,
          field === 'multiplyByContainers' ? value : updated.multiplyByContainers
        );
      }
      return updated;
    });
    newTables.exportCategories = cats;
    setTables(newTables);
    onChange(newTables);
  };

  // Export-specific: bulk currency switch for ALL export categories at once
  const handleExportGlobalBulkCurrency = (currency: string) => {
    const newTables = { ...tables };
    const cats = { ...(newTables.exportCategories || {}) };
    Object.keys(cats).forEach(catName => {
      cats[catName] = (cats[catName] || []).map(item => {
        const updated = { ...item, currency };
        updated.amount = computeVolumeAmount(updated.unitPrice || 0, updated.per, currency, updated.multiplyByContainers);
        return updated;
      });
    });
    newTables.exportCategories = cats;
    setTables(newTables);
    onChange(newTables);
  };

  // State for the 3 tables — each starts with one empty entry
  const [tables, setTables] = useState<ExpenseTablesData>({
    particulars: [createEmptyItem()],
    additionalCharges: [createEmptyItem()],
    refundableDeposits: [createEmptyItem()],
    ...((!isImport) ? {
      exportCategories: Object.fromEntries(
        EXPORT_CATEGORY_ORDER.map(cat => [cat, []])
      )
    } : {})
  });

  // Detect province segments (segments beyond the first one, for export bookings)
  const provinceSegments = (() => {
    if (isImport || !booking?.segments || !Array.isArray(booking.segments) || booking.segments.length <= 1) return [];
    return booking.segments.slice(1); // First segment is "Manila", rest are province legs
  })();

  // Export: track which categories are hidden (removed)
  const [hiddenExportCategories, setHiddenExportCategories] = useState<string[]>([]);
  // Import: track which categories are hidden (removed)
  const [hiddenImportCategories, setHiddenImportCategories] = useState<string[]>([]);
  const [showAddCategoryDropdown, setShowAddCategoryDropdown] = useState(false);
  const addCategoryRef = useRef<HTMLDivElement>(null);

  // Import Particulars: track which standardized items have been removed (so they can be re-added)
  const [removedStandardItems, setRemovedStandardItems] = useState<ImportStandardKey[]>([]);
  const [showAddParticularsDropdown, setShowAddParticularsDropdown] = useState(false);
  const addParticularsRef = useRef<HTMLDivElement>(null);

  // Export: track which category's add-item dropdown is open (by category name)
  const [showExportAddItemDropdown, setShowExportAddItemDropdown] = useState<string | null>(null);
  const exportAddItemRef = useRef<HTMLDivElement>(null);

  // Domestic sections: track which section's add-item dropdown is open (by segmentId)
  const [showDomesticAddItemDropdown, setShowDomesticAddItemDropdown] = useState<string | null>(null);
  const domesticAddItemRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addCategoryRef.current && !addCategoryRef.current.contains(e.target as Node)) {
        setShowAddCategoryDropdown(false);
      }
    };
    if (showAddCategoryDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAddCategoryDropdown]);

  // Close particulars dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addParticularsRef.current && !addParticularsRef.current.contains(e.target as Node)) {
        setShowAddParticularsDropdown(false);
      }
    };
    if (showAddParticularsDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAddParticularsDropdown]);

  // Close export add-item dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportAddItemRef.current && !exportAddItemRef.current.contains(e.target as Node)) {
        setShowExportAddItemDropdown(null);
      }
    };
    if (showExportAddItemDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showExportAddItemDropdown]);

  // Close domestic add-item dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (domesticAddItemRef.current && !domesticAddItemRef.current.contains(e.target as Node)) {
        setShowDomesticAddItemDropdown(null);
      }
    };
    if (showDomesticAddItemDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDomesticAddItemDropdown]);

  // Track the last processed state to handle async voucher loading
  const [lastProcessedState, setLastProcessedState] = useState<{bookingId: string, voucherCount: number, wasImport: boolean} | null>(null);

  // --- Auto-Mapping Logic ---
  useEffect(() => {
    const isNewBooking = booking && lastProcessedState?.bookingId !== booking.id;
    const hasNewVouchers = booking && lastProcessedState?.bookingId === booking.id && vouchers && vouchers.length > 0 && lastProcessedState?.voucherCount === 0;
    // Detect when isImport changes for the same already-processed booking (race condition fix)
    const templateChanged = booking && lastProcessedState?.bookingId === booking.id && lastProcessedState?.wasImport !== !!isImport;

    if (booking && (isNewBooking || hasNewVouchers || templateChanged)) {

      if (isImport) {
        // ── IMPORT: Generate the standardized items for this booking's POD ──
        // Provincial PODs (CDO, Iloilo, Davao) use a reduced set.
        const activeKeys = getActiveImportStandardKeys(booking);
        // Phase 1: Create standardized items with default amounts
        const standardizedItems: (ExpenseLineItem & { _standardKey: ImportStandardKey })[] =
          activeKeys.map(key => ({
            id: Math.random().toString(36).substr(2, 9),
            particulars: generateImportStandardLabel(key, booking, truckingVendor, containerCount),
            amount: getImportStandardAmount(key, containerCount),
            currency: "PHP",
            isAutoFilled: true,
            _standardKey: key,
          }));

        // Phase 2: Match vouchers to existing standardized items
        const newAdditional: ExpenseLineItem[] = [];
        const newRefundable: ExpenseLineItem[] = [];
        const matchedKeys = new Set<ImportStandardKey>();

        if (vouchers) {
          vouchers.forEach(voucher => {
            const lines = voucher.lineItems || [];
            lines.forEach((line: any) => {
              const desc = line.description || "";
              const amt = line.amount || 0;
              const vNo = voucher.voucherNumber;
              const sourceId = line.id;

              const matchedKey = matchVoucherToStandardKey(desc);
              const stdItem = matchedKey ? standardizedItems.find(i => i._standardKey === matchedKey) : undefined;

              if (matchedKey && stdItem && !matchedKeys.has(matchedKey)) {
                // Update the matching standardized item
                stdItem.amount = amt;
                stdItem.voucherNo = vNo;
                stdItem.sourceVoucherLineItemId = sourceId;
                matchedKeys.add(matchedKey);

                // For trucking vouchers with linked containers, update label with vendor + container info
                if (matchedKey === "TRUCKING") {
                  const linkedContainers = (voucher as any).linkedContainerNos;
                  const voucherVendor = (voucher as any).payee || truckingVendor || "";
                  if (Array.isArray(linkedContainers) && linkedContainers.length > 0 && voucherVendor) {
                    const rawVol = booking?.volume || "";
                    const volMatch = rawVol.match(/^\d+x(.+)$/i);
                    const volumeType = volMatch ? volMatch[1] : rawVol;
                    if (volumeType) {
                      stdItem.particulars = volumeType === "LCL" ? `${voucherVendor} LCL` : `${voucherVendor} ${linkedContainers.length}x${volumeType}`;
                    }
                  }
                }
              } else if (matchedKey && stdItem && matchedKeys.has(matchedKey)) {
                // Duplicate match — add as additional item in Particulars
                // (e.g. multiple trucking voucher lines)
                standardizedItems.push({
                  id: Math.random().toString(36).substr(2, 9),
                  particulars: desc,
                  amount: amt,
                  currency: "PHP",
                  voucherNo: vNo,
                  isAutoFilled: true,
                  sourceVoucherLineItemId: sourceId,
                  _standardKey: matchedKey,
                });
              } else if (desc.includes("DO Fee")) {
                newAdditional.push({
                  id: Math.random().toString(36).substr(2, 9),
                  particulars: "DO Fee",
                  amount: amt,
                  currency: "PHP",
                  voucherNo: vNo,
                  isAutoFilled: true,
                  sourceVoucherLineItemId: sourceId,
                });
              } else if (desc.includes("Container Deposit")) {
                newRefundable.push({
                  id: Math.random().toString(36).substr(2, 9),
                  particulars: "Container Deposit",
                  amount: amt,
                  currency: "PHP",
                  voucherNo: vNo,
                  isAutoFilled: true,
                  sourceVoucherLineItemId: sourceId,
                });
              } else {
                // Unmatched voucher line → Additional Charges
                newAdditional.push({
                  id: Math.random().toString(36).substr(2, 9),
                  particulars: desc,
                  amount: amt,
                  currency: "PHP",
                  voucherNo: vNo,
                  isAutoFilled: true,
                  sourceVoucherLineItemId: sourceId,
                });
              }
            });
          });
        }

        // Strip internal _standardKey before setting state
        const newParticulars: ExpenseLineItem[] = standardizedItems.map(({ _standardKey, ...rest }) => rest);

        const newState: ExpenseTablesData = {
          particulars: newParticulars,
          additionalCharges: newAdditional.length > 0 ? newAdditional : [createEmptyItem()],
          refundableDeposits: newRefundable.length > 0 ? newRefundable : [createEmptyItem()],
        };

        // Reset removed standard items since we're rebuilding
        setRemovedStandardItems([]);

        setTables(newState);
        setLastProcessedState({
          bookingId: booking.id,
          voucherCount: vouchers ? vouchers.length : 0,
          wasImport: true
        });
        onChange(newState);

      } else {
        // ── EXPORT: Start with empty categories — user adds items via dropdown ──
        // Build domestic sections for province segments (segments beyond the first)
        const segments = booking.segments || [];
        const domesticSections: DomesticSection[] = segments.length > 1
          ? segments.slice(1).map((seg: any) => {
              // Resolve containers: prefer containerNos array, fall back to parsing containerNo string
              let cNos: string[] = seg.containerNos && Array.isArray(seg.containerNos) && seg.containerNos.length > 0
                ? seg.containerNos.filter(Boolean)
                : [];
              if (cNos.length === 0 && seg.containerNo) {
                cNos = (typeof seg.containerNo === "string" ? seg.containerNo.split(",") : []).map((s: string) => s.trim()).filter(Boolean);
              }
              return {
                segmentId: seg.segmentId,
                segmentLabel: seg.segmentLabel || "Province",
                containerNos: cNos,
                items: [],
              };
            })
          : [];

        const newState: ExpenseTablesData = {
          particulars: [],
          additionalCharges: [],
          refundableDeposits: [],
          exportCategories: Object.fromEntries(
            EXPORT_CATEGORY_ORDER.map(cat => [cat, []])
          ),
          domesticSections,
        };

        setTables(newState);
        setLastProcessedState({
          bookingId: booking.id,
          voucherCount: vouchers ? vouchers.length : 0,
          wasImport: false
        });
        onChange(newState);
      }
    }
  }, [booking, vouchers, lastProcessedState, truckingVendor, isImport]);

  // Update the trucking item label when truckingVendor prop arrives asynchronously
  useEffect(() => {
    if (isImport && truckingVendor && booking && tables.particulars.length > 0) {
      const truckingLabel = generateImportStandardLabel("TRUCKING", booking, truckingVendor, containerCount);
      const truckingItem = tables.particulars.find(i => {
        const lower = i.particulars.toLowerCase();
        return lower.includes("trucking");
      });
      if (truckingItem && truckingItem.particulars !== truckingLabel) {
        const newTables = { ...tables };
        newTables.particulars = newTables.particulars.map(item =>
          item.id === truckingItem.id ? { ...item, particulars: truckingLabel } : item
        );
        setTables(newTables);
        onChange(newTables);
      }
    }
  }, [truckingVendor]);

  // --- Handlers ---
  const handleUpdate = (table: keyof ExpenseTablesData, id: string, field: keyof ExpenseLineItem, value: any) => {
    if (isImport) {
      const newTables = { ...tables };
      newTables[table] = (newTables[table] as ExpenseLineItem[]).map(item => 
        item.id === id ? { ...item, [field]: value } : item
      );
      setTables(newTables);
      onChange(newTables);
    } else {
      handleExportUpdate(table, id, field, value);
    }
  };

  const handleAdd = (table: keyof ExpenseTablesData) => {
    const newTables = { ...tables };
    (newTables[table] as ExpenseLineItem[]).push(createEmptyItem());
    setTables(newTables);
    onChange(newTables);
  };

  const handleRemove = (table: keyof ExpenseTablesData, id: string) => {
    const newTables = { ...tables };
    newTables[table] = (newTables[table] as ExpenseLineItem[]).filter(item => item.id !== id);
    setTables(newTables);
    onChange(newTables);
  };

  // Export category handlers
  const handleAddExportSuggestedItem = (categoryName: string, label: string) => {
    const newItem = { ...createEmptyItem(), particulars: label };
    const newTables = { ...tables };
    const cats = { ...(newTables.exportCategories || {}) };
    cats[categoryName] = [...(cats[categoryName] || []), newItem];
    newTables.exportCategories = cats;
    setTables(newTables);
    onChange(newTables);
    setShowExportAddItemDropdown(null);
  };

  const handleAddExportCustomItem = (categoryName: string) => {
    const newTables = { ...tables };
    const cats = { ...(newTables.exportCategories || {}) };
    cats[categoryName] = [...(cats[categoryName] || []), createEmptyItem()];
    newTables.exportCategories = cats;
    setTables(newTables);
    onChange(newTables);
    setShowExportAddItemDropdown(null);
  };

  const handleAddExportCategoryItem = (categoryName: string) => {
    const newTables = { ...tables };
    const cats = { ...(newTables.exportCategories || {}) };
    cats[categoryName] = [...(cats[categoryName] || []), createEmptyItem()];
    newTables.exportCategories = cats;
    setTables(newTables);
    onChange(newTables);
  };

  const handleRemoveExportCategoryItem = (categoryName: string, id: string) => {
    const newTables = { ...tables };
    const cats = { ...(newTables.exportCategories || {}) };
    cats[categoryName] = (cats[categoryName] || []).filter(item => item.id !== id);
    newTables.exportCategories = cats;
    setTables(newTables);
    onChange(newTables);
  };

  const handleRemoveExportCategory = (categoryName: string) => {
    setHiddenExportCategories(prev => [...prev, categoryName]);
    // Clear items from the category
    const newTables = { ...tables };
    const cats = { ...(newTables.exportCategories || {}) };
    cats[categoryName] = [];
    newTables.exportCategories = cats;
    setTables(newTables);
    onChange(newTables);
  };

  const handleRestoreExportCategory = (categoryName: string) => {
    setHiddenExportCategories(prev => prev.filter(c => c !== categoryName));
    // Restore category as empty — user adds items via dropdown
    const newTables = { ...tables };
    const cats = { ...(newTables.exportCategories || {}) };
    cats[categoryName] = [];
    newTables.exportCategories = cats;
    setTables(newTables);
    onChange(newTables);
    setShowAddCategoryDropdown(false);
  };

  // Domestic section handlers
  const handleDomesticAddSuggestedItem = (segmentId: string, label: string) => {
    const newItem = { ...createEmptyItem(), particulars: label };
    const newTables = { ...tables };
    const sections = (newTables.domesticSections || []).map(sec =>
      sec.segmentId === segmentId ? { ...sec, items: [...sec.items, newItem] } : sec
    );
    newTables.domesticSections = sections;
    setTables(newTables);
    onChange(newTables);
    setShowDomesticAddItemDropdown(null);
  };

  const handleDomesticAddCustomItem = (segmentId: string) => {
    const newTables = { ...tables };
    const sections = (newTables.domesticSections || []).map(sec =>
      sec.segmentId === segmentId ? { ...sec, items: [...sec.items, createEmptyItem()] } : sec
    );
    newTables.domesticSections = sections;
    setTables(newTables);
    onChange(newTables);
    setShowDomesticAddItemDropdown(null);
  };

  const handleDomesticUpdateItem = (segmentId: string, id: string, field: string, value: any) => {
    const newTables = { ...tables };
    const sections = (newTables.domesticSections || []).map(sec => {
      if (sec.segmentId !== segmentId) return sec;
      return {
        ...sec,
        items: sec.items.map(item => {
          if (item.id !== id) return item;
          const updated = { ...item, [field]: value };
          if (field === 'unitPrice' || field === 'per' || field === 'currency' || field === 'multiplyByContainers') {
            // Domestic sections use the segment's own container count
            const segContainerCount = sec.containerNos.filter(Boolean).length || 0;
            const parsedPrice = parseFloat(String(field === 'unitPrice' ? value : updated.unitPrice || 0)) || 0;
            const cur = field === 'currency' ? value : updated.currency;
            const currencyMultiplier = (cur === "USD" || cur === "RMB") ? parsedExchangeRate : 1;
            const mult = (field === 'multiplyByContainers' ? value : updated.multiplyByContainers) !== false ? segContainerCount : 1;
            updated.amount = parsedPrice * currencyMultiplier * mult;
          }
          return updated;
        }),
      };
    });
    newTables.domesticSections = sections;
    setTables(newTables);
    onChange(newTables);
  };

  const handleDomesticRemoveItem = (segmentId: string, id: string) => {
    const newTables = { ...tables };
    const sections = (newTables.domesticSections || []).map(sec =>
      sec.segmentId === segmentId ? { ...sec, items: sec.items.filter(item => item.id !== id) } : sec
    );
    newTables.domesticSections = sections;
    setTables(newTables);
    onChange(newTables);
  };

  // Import category handlers
  const handleRemoveImportCategory = (categoryKey: keyof ExpenseTablesData) => {
    setHiddenImportCategories(prev => [...prev, categoryKey as string]);
    const newTables = { ...tables };
    (newTables[categoryKey] as ExpenseLineItem[]) = [];
    setTables(newTables);
    onChange(newTables);
  };

  const handleRestoreImportCategory = (categoryKey: string) => {
    setHiddenImportCategories(prev => prev.filter(c => c !== categoryKey));
    const newTables = { ...tables };
    (newTables[categoryKey as keyof ExpenseTablesData] as ExpenseLineItem[]) = [createEmptyItem()];
    setTables(newTables);
    onChange(newTables);
    setShowAddCategoryDropdown(false);
  };

  // Import Particulars: add a standardized item back
  const handleAddStandardParticular = (key: ImportStandardKey) => {
    const label = generateImportStandardLabel(key, booking, truckingVendor, containerCount);
    const amount = getImportStandardAmount(key, containerCount);
    const newItem: ExpenseLineItem = {
      id: Math.random().toString(36).substr(2, 9),
      particulars: label,
      amount,
      currency: "PHP",
    };

    // Insert in correct order based on IMPORT_STANDARD_PARTICULARS_KEYS
    const keyIndex = IMPORT_STANDARD_PARTICULARS_KEYS.indexOf(key);
    const newTables = { ...tables };
    const currentItems = [...newTables.particulars];
    
    // Find the right insertion point: after the last standardized item with a lower index
    let insertAt = currentItems.length; // default: end
    for (let i = 0; i < currentItems.length; i++) {
      // Check if this item's text matches a standard key with a higher index
      const itemStdIdx = findStandardKeyIndex(currentItems[i].particulars);
      if (itemStdIdx !== -1 && itemStdIdx > keyIndex) {
        insertAt = i;
        break;
      }
    }
    
    currentItems.splice(insertAt, 0, newItem);
    newTables.particulars = currentItems;
    setTables(newTables);
    onChange(newTables);
    setRemovedStandardItems(prev => prev.filter(k => k !== key));
    setShowAddParticularsDropdown(false);
  };

  // Import Particulars: add a custom (free-entry) item
  const handleAddCustomParticular = () => {
    const newTables = { ...tables };
    newTables.particulars = [...newTables.particulars, createEmptyItem()];
    setTables(newTables);
    onChange(newTables);
    setShowAddParticularsDropdown(false);
  };

  // Helper: find which standard key index a particulars text matches (for ordering)
  const findStandardKeyIndex = (text: string): number => {
    const lower = text.toLowerCase();
    if (lower.includes("duties")) return 0;
    if (lower.includes("invoice number") || lower.match(/^\d+x/)) return 1;
    if (lower.includes("trucking")) return 2;
    if (lower.includes("arrastre")) return 3;
    if (lower === "broker") return 4;
    if (lower.includes("section")) return 5;
    if (lower.includes("customs")) return 6;
    if (lower.includes("notary") || lower.includes("lodgement")) return 7;
    return -1; // Not a standard item
  };

  // Import Particulars: handle removing an item and track if it was standardized
  const handleRemoveParticular = (id: string) => {
    const item = tables.particulars.find(i => i.id === id);
    if (item) {
      // Check if it matches a standardized key
      const stdIdx = findStandardKeyIndex(item.particulars);
      if (stdIdx !== -1) {
        const key = IMPORT_STANDARD_PARTICULARS_KEYS[stdIdx];
        setRemovedStandardItems(prev => [...prev, key]);
      }
    }
    const newTables = { ...tables };
    newTables.particulars = newTables.particulars.filter(i => i.id !== id);
    setTables(newTables);
    onChange(newTables);
  };

  const visibleImportCategories = CATEGORIES.filter(cat => !hiddenImportCategories.includes(cat.key as string));
  const removedImportCategories = CATEGORIES.filter(cat => hiddenImportCategories.includes(cat.key as string));

  const visibleExportCategories = EXPORT_CATEGORY_ORDER.filter(cat => !hiddenExportCategories.includes(cat));
  const removedExportCategories = EXPORT_CATEGORY_ORDER.filter(cat => hiddenExportCategories.includes(cat));

  // --- Calculate Unreconciled Items ---
  const [unreconciledItems, setUnreconciledItems] = useState<ExpenseLineItem[]>([]);

  useEffect(() => {
    if (!vouchers) {
      setUnreconciledItems([]);
      return;
    }

    const usedIds = new Set<string>();
    const allItems = [...tables.particulars, ...tables.additionalCharges, ...tables.refundableDeposits];
    // Also include export category items
    if (tables.exportCategories) {
      Object.values(tables.exportCategories).forEach(items => {
        allItems.push(...items);
      });
    }
    // Also include domestic section items
    if (tables.domesticSections) {
      tables.domesticSections.forEach(sec => allItems.push(...sec.items));
    }
    allItems.forEach(item => {
      if (item.sourceVoucherLineItemId) {
        usedIds.add(String(item.sourceVoucherLineItemId));
      }
    });

    const newUnreconciled: ExpenseLineItem[] = [];
    vouchers.forEach(voucher => {
      const lines = voucher.lineItems || voucher.line_items || [];
      lines.forEach((line: any) => {
        if (line.id) {
          const lineId = String(line.id);
          if (!usedIds.has(lineId)) {
            newUnreconciled.push({
              id: Math.random().toString(36).substr(2, 9),
              particulars: line.description || "Unreconciled Item",
              amount: line.amount || 0,
              currency: "PHP",
              voucherNo: voucher.voucherNumber,
              sourceVoucherLineItemId: lineId
            });
          }
        }
      });
    });

    setUnreconciledItems(newUnreconciled);
  }, [tables, vouchers]);

  const handleAddUnreconciled = (item: ExpenseLineItem, target: 'particulars' | 'additionalCharges' | 'refundableDeposits') => {
      const newTables = { ...tables };
      (newTables[target] as ExpenseLineItem[]).push(item);
      setTables(newTables);
      onChange(newTables);
  };

  // Grand total (excluding refundable deposits)
  const exportCategoryTotal = tables.exportCategories
    ? Object.values(tables.exportCategories).flat().reduce((sum, i) => sum + (i.amount || 0), 0)
    : 0;
  const domesticTotal = (tables.domesticSections || []).reduce(
    (sum, sec) => sum + sec.items.reduce((s, i) => s + (i.amount || 0), 0), 0
  );
  const grandTotal = isImport
    ? calculateTotal(tables.particulars) + calculateTotal(tables.additionalCharges)
    : exportCategoryTotal + domesticTotal;

  // Render a single export category section
  const renderExportCategorySection = (categoryName: string, catIndex: number) => {
    const items = tables.exportCategories?.[categoryName] || [];
    const categoryTotal = calculateTotal(items);

    return (
      <div key={categoryName}>
        {/* Category Section Header */}
        <div style={{
          padding: "10px 16px",
          background: "#F9FAFB",
          borderTop: catIndex > 0 ? "1px solid #E5E9F0" : "none",
          borderBottom: "1px solid #E5E9F0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "#0A1D4D",
              textTransform: "uppercase" as const,
              letterSpacing: "0.03em"
            }}>
              {formatExportCategoryName(categoryName)}
            </span>
            <span style={{ fontSize: "12px", color: "#667085" }}>
              ({items.length} item{items.length !== 1 ? 's' : ''})
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Add Item: dropdown with suggestions for non-Trucking, plain button for Trucking */}
            {categoryName !== "TRUCKING" ? (() => {
              const availableSuggestions = getAvailableExportSuggestions(categoryName, items);
              return (
                <div ref={showExportAddItemDropdown === categoryName ? exportAddItemRef : undefined} style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => setShowExportAddItemDropdown(prev => prev === categoryName ? null : categoryName)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      color: "#0F766E",
                      fontSize: "12px",
                      fontWeight: 500,
                      background: "transparent",
                      border: "1px solid #0F766E",
                      cursor: "pointer",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      transition: "all 0.15s ease"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(15,118,110,0.05)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <Plus size={12} /> Add Item <ChevronDown size={12} />
                  </button>
                  <PortalDropdown
                    isOpen={showExportAddItemDropdown === categoryName}
                    onClose={() => setShowExportAddItemDropdown(null)}
                    triggerRef={exportAddItemRef}
                    minWidth="220px"
                  >
                      {availableSuggestions.length > 0 && (
                        <>
                          <div style={{ padding: "6px 12px 4px", fontSize: "11px", fontWeight: 600, color: "#667085", textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
                            Suggested Items
                          </div>
                          {availableSuggestions.map(label => (
                            <button
                              key={label}
                              type="button"
                              onClick={() => handleAddExportSuggestedItem(categoryName, label)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                width: "100%",
                                padding: "9px 12px",
                                fontSize: "13px",
                                fontWeight: 500,
                                color: "#0A1D4D",
                                background: "white",
                                border: "none",
                                cursor: "pointer",
                                textAlign: "left" as const,
                                transition: "background 0.1s ease"
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "#F0FDFA"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                            >
                              <Plus size={14} color="#0F766E" />
                              {label}
                            </button>
                          ))}
                          <div style={{ height: "1px", background: "#E5E9F0", margin: "4px 0" }} />
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => handleAddExportCustomItem(categoryName)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          width: "100%",
                          padding: "9px 12px",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "#0F766E",
                          background: "white",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left" as const,
                          transition: "background 0.1s ease"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#F0FDFA"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                      >
                        <Plus size={14} color="#0F766E" />
                        Add Custom Item
                      </button>
                  </PortalDropdown>
                </div>
              );
            })() : (
              <button
                type="button"
                onClick={() => handleAddExportCategoryItem(categoryName)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  color: "#0F766E",
                  fontSize: "12px",
                  fontWeight: 500,
                  background: "transparent",
                  border: "1px solid #0F766E",
                  cursor: "pointer",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  transition: "all 0.15s ease"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(15,118,110,0.05)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <Plus size={12} /> Add Item
              </button>
            )}
            <button
              type="button"
              onClick={() => handleRemoveExportCategory(categoryName)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                color: "#EF4444",
                background: "transparent",
                border: "1px solid #EF4444",
                cursor: "pointer",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 500,
                transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#FEE2E2"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              title={`Remove ${formatExportCategoryName(categoryName)} category`}
            >
              ✕ Remove
            </button>
          </div>
        </div>

        {/* Category Line Items */}
        {items.length === 0 ? (
          <div style={{ padding: "16px", textAlign: "center", fontSize: "13px", color: "#667085", background: "white", borderBottom: "1px solid #E5E9F0" }}>
            No items.{" "}
            <button type="button" onClick={() => categoryName !== "TRUCKING" ? setShowExportAddItemDropdown(categoryName) : handleAddExportCategoryItem(categoryName)} style={{ color: "#0F766E", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontSize: "13px" }}>
              Add one
            </button>
          </div>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {items.map((item) => {
                  const volumeAmount = computeVolumeAmount(item.unitPrice || 0, item.per, item.currency, item.multiplyByContainers);
                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: "1px solid #E5E9F0",
                        background: "white"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#FAFBFC"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                    >
                      {/* Particulars */}
                      <td style={{ padding: "8px 8px 8px 16px", width: "30%" }}>
                        <input
                          type="text"
                          value={item.particulars}
                          onChange={(e) => handleExportCategoryUpdate(categoryName, item.id, 'particulars', e.target.value)}
                          placeholder="Enter particulars"
                          style={{
                            height: "36px",
                            width: "100%",
                            border: "1px solid #E5E9F0",
                            borderRadius: "4px",
                            padding: "0 10px",
                            fontSize: "14px",
                            color: "#0A1D4D",
                            background: "white",
                            outline: "none",
                            boxSizing: "border-box" as const,
                            transition: "border-color 0.15s ease"
                          }}
                          onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
                          onBlur={(e) => e.currentTarget.style.borderColor = "#E5E9F0"}
                        />
                      </td>
                      {/* Unit Price */}
                      <td style={{ padding: "8px", width: "25%", textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", width: "100%", justifyContent: "flex-end" }}>
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitPrice || ""}
                            onChange={(e) => handleExportCategoryUpdate(categoryName, item.id, 'unitPrice', e.target.value)}
                            placeholder="0.00"
                            style={{
                              height: "36px",
                              flex: 1,
                              minWidth: 0,
                              border: "1px solid #E5E9F0",
                              borderRadius: "4px",
                              padding: "0 6px",
                              fontSize: "13px",
                              color: "#0A1D4D",
                              background: "white",
                              outline: "none",
                              textAlign: "right" as const,
                              boxSizing: "border-box" as const,
                              transition: "border-color 0.15s ease"
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
                            onBlur={(e) => e.currentTarget.style.borderColor = "#E5E9F0"}
                          />
                          <select
                            value={item.currency || "PHP"}
                            onChange={(e) => handleExportCategoryUpdate(categoryName, item.id, 'currency', e.target.value)}
                            style={{
                              height: "36px",
                              width: "58px",
                              border: "1px solid #E5E9F0",
                              borderRadius: "4px",
                              padding: "0 2px",
                              fontSize: "11px",
                              fontWeight: 600,
                              color: "#0F766E",
                              background: "white",
                              outline: "none",
                              cursor: "pointer",
                              transition: "border-color 0.15s ease"
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
                            onBlur={(e) => e.currentTarget.style.borderColor = "#E5E9F0"}
                          >
                            <option value="PHP">PHP</option>
                            <option value="USD">USD</option>
                            <option value="RMB">RMB</option>
                          </select>
                          <select
                            value={item.per || "40"}
                            onChange={(e) => handleExportCategoryUpdate(categoryName, item.id, 'per', e.target.value)}
                            style={{
                              height: "36px",
                              width: "70px",
                              border: "1px solid #E5E9F0",
                              borderRadius: "4px",
                              padding: "0 2px",
                              fontSize: "11px",
                              color: "#667085",
                              background: "white",
                              outline: "none",
                              cursor: "pointer",
                              transition: "border-color 0.15s ease"
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
                            onBlur={(e) => e.currentTarget.style.borderColor = "#E5E9F0"}
                          >
                            <option value="40">PER 40</option>
                            <option value="20">PER 20</option>
                            <option value="BL">PER BL</option>
                          </select>
                        </div>
                      </td>
                      {/* Multiply by containers checkbox */}
                      <td style={{ padding: "8px", width: "5%", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={item.multiplyByContainers !== false}
                          onChange={(e) => handleExportCategoryUpdate(categoryName, item.id, 'multiplyByContainers', e.target.checked)}
                          title={item.multiplyByContainers !== false ? `Multiplied by ${containerCount} containers` : "Not multiplied by containers"}
                          style={{
                            width: "16px",
                            height: "16px",
                            accentColor: "#0F766E",
                            cursor: "pointer",
                          }}
                        />
                      </td>
                      {/* Volume */}
                      <td style={{ padding: "8px 16px", width: "13%", textAlign: "right", fontSize: "14px", color: "#0A1D4D", fontWeight: 600, background: "#FAFBFC" }}>
                        ₱{formatAmount(volumeAmount)}
                      </td>
                      {/* Voucher No */}
                      <td style={{ padding: "8px", width: "15%" }}>
                        <FilterSingleDropdown
                          value={item.voucherNo || ""}
                          onChange={(v) => handleExportCategoryUpdate(categoryName, item.id, 'voucherNo', v)}
                          options={(vouchers || []).map((v: any) => ({ value: v.voucherNumber, label: v.voucherNumber }))}
                          placeholder="Select Voucher"
                        />
                      </td>
                      {/* Voucher Amount */}
                      <td style={{ padding: "8px", width: "10%" }}>
                        <div style={{ padding: "0 10px", fontSize: "14px", color: "#0A1D4D", textAlign: "right", fontWeight: 500, lineHeight: "36px" }}>
                          ₱{formatAmount(item.amount || 0)}
                        </div>
                      </td>
                      {/* Actions */}
                      <td style={{ padding: "8px", width: "5%", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveExportCategoryItem(categoryName, item.id)}
                          style={{
                            color: "#D1D5DB",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: "4px",
                            transition: "color 0.15s ease"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = "#EF4444"}
                          onMouseLeave={(e) => e.currentTarget.style.color = "#D1D5DB"}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Category Subtotal */}
              <tfoot>
                <tr style={{ background: "#FAFBFC", borderBottom: "1px solid #E5E9F0" }}>
                  <td colSpan={4} style={{ padding: "10px 16px", textAlign: "right", fontSize: "12px", fontWeight: 600, color: "#667085", textTransform: "uppercase" as const }}>
                    Subtotal
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "right", fontSize: "14px", fontWeight: 700, color: "#0A1D4D" }}>
                    ₱{formatAmount(categoryTotal)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Unreconciled Items Table */}
      {unreconciledItems.length > 0 && (
        <div style={{
          border: "1px solid #F59E0B",
          borderRadius: "8px",
          overflow: "hidden",
          marginBottom: "16px",
          background: "white"
        }}>
          <div style={{
            background: "#FFFBEB",
            padding: "12px 16px",
            borderBottom: "1px solid rgba(245,158,11,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#D97706" }} />
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#92400E" }}>Unreconciled Voucher Items</span>
            <span style={{ fontSize: "12px", color: "#B45309", fontWeight: 500, marginLeft: "8px" }}>
              {unreconciledItems.length} item{unreconciledItems.length !== 1 ? 's' : ''} not included in expense
            </span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "white", borderBottom: "1px solid #E5E9F0" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 500, color: "#667085", textTransform: "uppercase" as const, width: "50%" }}>Particulars</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 500, color: "#667085", textTransform: "uppercase" as const, width: "15%" }}>Voucher No</th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", fontWeight: 500, color: "#667085", textTransform: "uppercase" as const, width: "25%" }}>Amount</th>
                <th style={{ width: "10%" }}></th>
              </tr>
            </thead>
            <tbody>
              {unreconciledItems.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #E5E9F0" }}>
                  <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 500, color: "#0A1D4D" }}>{item.particulars}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      background: "#F3F4F6",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      color: "#4B5563",
                      fontSize: "12px",
                      fontWeight: 500,
                      border: "1px solid #E5E9F0"
                    }}>
                      {item.voucherNo}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontSize: "14px", fontWeight: 700, color: "#0A1D4D" }}>
                    ₱{formatAmount(item.amount)}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={() => handleAddUnreconciled(item, 'particulars')}
                        style={{
                          fontSize: "11px",
                          fontWeight: 500,
                          color: "#0F766E",
                          background: "#F0FDFA",
                          border: "1px solid #0F766E",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          whiteSpace: "nowrap"
                        }}
                      >
                        + Part
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddUnreconciled(item, 'additionalCharges')}
                        style={{
                          fontSize: "11px",
                          fontWeight: 500,
                          color: "#1F2937",
                          background: "white",
                          border: "1px solid #E5E9F0",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          whiteSpace: "nowrap"
                        }}
                      >
                        + Misc
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Unified Expense Table */}
      <div style={{
        border: "1px solid #E5E9F0",
        borderRadius: "8px",
        overflow: "hidden",
      }}>
        {/* Table Title Header */}
        <div style={{
          background: "#FAFBFC",
          padding: "12px 16px",
          borderBottom: "1px solid #E5E9F0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>
            Charge Categories & Line Items
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Set All Currencies buttons for EXPORT */}
          {!isImport && (
            <>
              <span style={{ fontSize: "12px", color: "#667085", fontWeight: 500 }}>Set all currencies:</span>
              {["PHP", "USD", "RMB"].map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => handleExportGlobalBulkCurrency(cur)}
                  style={{
                    padding: "5px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#0F766E",
                    background: "white",
                    border: "1px solid #E5E9F0",
                    borderRadius: "6px",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#F0FDFA";
                    e.currentTarget.style.borderColor = "#0F766E";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "white";
                    e.currentTarget.style.borderColor = "#E5E9F0";
                  }}
                >
                  {cur}
                </button>
              ))}
            </>
          )}
          {/* Add Category button for IMPORT */}
          {isImport && removedImportCategories.length > 0 && (
            <div ref={addCategoryRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowAddCategoryDropdown(!showAddCategoryDropdown)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 14px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "white",
                  background: "#0F766E",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "background 0.15s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#0D6B63"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#0F766E"}
              >
                <Plus size={14} />
                Add Category
                <ChevronDown size={14} style={{ marginLeft: "2px" }} />
              </button>
              <PortalDropdown
                isOpen={showAddCategoryDropdown}
                onClose={() => setShowAddCategoryDropdown(false)}
                triggerRef={addCategoryRef}
                minWidth="260px"
              >
                  <div style={{ padding: "6px 12px 4px", fontSize: "11px", fontWeight: 600, color: "#667085", textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
                    Removed Categories
                  </div>
                  {removedImportCategories.map(cat => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => handleRestoreImportCategory(cat.key as string)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        width: "100%",
                        padding: "9px 12px",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#0A1D4D",
                        background: "white",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "background 0.1s ease"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#F0FDFA"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                    >
                      <Plus size={14} color="#0F766E" />
                      {cat.label}
                    </button>
                  ))}
              </PortalDropdown>
            </div>
          )}
          {/* Add Category button for EXPORT */}
          {!isImport && removedExportCategories.length > 0 && (
            <div ref={addCategoryRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowAddCategoryDropdown(!showAddCategoryDropdown)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 14px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "white",
                  background: "#0F766E",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "background 0.15s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#0D6B63"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#0F766E"}
              >
                <Plus size={14} />
                Add Category
                <ChevronDown size={14} style={{ marginLeft: "2px" }} />
              </button>
              <PortalDropdown
                isOpen={showAddCategoryDropdown}
                onClose={() => setShowAddCategoryDropdown(false)}
                triggerRef={addCategoryRef}
                minWidth="180px"
              >
                  <div style={{ padding: "6px 12px 4px", fontSize: "11px", fontWeight: 600, color: "#667085", textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
                    Removed Categories
                  </div>
                  {removedExportCategories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleRestoreExportCategory(cat)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        width: "100%",
                        padding: "9px 12px",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#0A1D4D",
                        background: "white",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "background 0.1s ease"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#F0FDFA"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                    >
                      <Plus size={14} color="#0F766E" />
                      {formatExportCategoryName(cat)}
                    </button>
                  ))}
              </PortalDropdown>
            </div>
          )}
          </div>
        </div>

        {/* Column Headers */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "white", borderBottom: "1px solid #E5E9F0" }}>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 500, color: "#667085", textTransform: "uppercase" as const, width: isImport ? "50%" : "30%" }}>Particulars</th>
              {!isImport && (
                <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", fontWeight: 500, color: "#667085", textTransform: "uppercase" as const, width: "25%" }}>Unit Price</th>
              )}
              {!isImport && (
                <th style={{ padding: "12px 8px", textAlign: "center", fontSize: "12px", fontWeight: 500, color: "#667085", textTransform: "uppercase" as const, width: "7%", whiteSpace: "nowrap" }} title="Multiply unit price by container count">Per Cont.</th>
              )}
              {!isImport && (
                <th style={{ padding: "12px 8px", textAlign: "right", fontSize: "12px", fontWeight: 500, color: "#667085", textTransform: "uppercase" as const, width: "11%" }}>{containerCount}X40'HC</th>
              )}
              <th style={{ padding: "12px 16px", textAlign: isImport ? "left" : "center", fontSize: "12px", fontWeight: 500, color: "#667085", textTransform: "uppercase" as const, width: "15%" }}>Voucher No</th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", fontWeight: 500, color: "#667085", textTransform: "uppercase" as const, width: isImport ? "25%" : "10%" }}>{isImport ? "Amount" : "Voucher Amt"}</th>
              <th style={{ width: "5%" }}></th>
            </tr>
          </thead>
        </table>

        {/* Category Sections */}
        {isImport ? (
          // IMPORT: Use the original 2-category structure
          visibleImportCategories.map((cat, catIndex) => {
            const items = tables[cat.key] as ExpenseLineItem[];
            const categoryTotal = calculateTotal(items);
            const isParticularsCategory = cat.key === "particulars";

            return (
              <div key={cat.key}>
                {/* Category Section Header */}
                <div style={{
                  padding: "10px 16px",
                  background: "#F9FAFB",
                  borderTop: catIndex > 0 ? "1px solid #E5E9F0" : "none",
                  borderBottom: "1px solid #E5E9F0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#0A1D4D",
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.03em"
                    }}>
                      {cat.label}
                    </span>
                    <span style={{ fontSize: "12px", color: "#667085" }}>
                      ({items.length} item{items.length !== 1 ? 's' : ''})
                    </span>
                    {cat.isRefundable && (
                      <span style={{
                        fontSize: "10px",
                        background: "rgba(15,118,110,0.1)",
                        color: "#0F766E",
                        border: "1px solid rgba(15,118,110,0.2)",
                        padding: "2px 8px",
                        borderRadius: "999px",
                        fontWeight: 500
                      }}>
                        Excluded from Cost
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {/* Add Item button — dropdown for Particulars, direct for others */}
                    {isParticularsCategory ? (
                      <div ref={addParticularsRef} style={{ position: "relative" }}>
                        <button
                          type="button"
                          onClick={() => setShowAddParticularsDropdown(prev => !prev)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            color: "#0F766E",
                            fontSize: "12px",
                            fontWeight: 500,
                            background: "transparent",
                            border: "1px solid #0F766E",
                            cursor: "pointer",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            transition: "all 0.15s ease"
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(15,118,110,0.05)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        >
                          <Plus size={12} /> Add Item <ChevronDown size={12} />
                        </button>
                        <PortalDropdown
                          isOpen={showAddParticularsDropdown}
                          onClose={() => setShowAddParticularsDropdown(false)}
                          triggerRef={addParticularsRef}
                          minWidth="260px"
                        >
                            {(() => {
                              const activeKeys = getActiveImportStandardKeys(booking);
                              const displayableRemoved = removedStandardItems.filter(k => activeKeys.includes(k));
                              if (displayableRemoved.length === 0) return null;
                              return (
                              <>
                                <div style={{ padding: "6px 12px 4px", fontSize: "11px", fontWeight: 600, color: "#667085", textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
                                  Standardized Items
                                </div>
                                {displayableRemoved.map(key => (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => handleAddStandardParticular(key)}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      width: "100%",
                                      padding: "9px 12px",
                                      fontSize: "13px",
                                      fontWeight: 500,
                                      color: "#0A1D4D",
                                      background: "white",
                                      border: "none",
                                      cursor: "pointer",
                                      textAlign: "left",
                                      transition: "background 0.1s ease"
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "#F0FDFA"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                                  >
                                    <Plus size={14} color="#0F766E" />
                                    {generateImportStandardLabel(key, booking, truckingVendor, containerCount)}
                                  </button>
                                ))}
                                <div style={{ height: "1px", background: "#E5E9F0", margin: "4px 0" }} />
                              </>
                              );
                            })()}
                            <button
                              type="button"
                              onClick={handleAddCustomParticular}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                width: "100%",
                                padding: "9px 12px",
                                fontSize: "13px",
                                fontWeight: 500,
                                color: "#0F766E",
                                background: "white",
                                border: "none",
                                cursor: "pointer",
                                textAlign: "left",
                                transition: "background 0.1s ease"
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "#F0FDFA"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                            >
                              <Plus size={14} color="#0F766E" />
                              Add Custom Item
                            </button>
                        </PortalDropdown>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAdd(cat.key)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          color: "#0F766E",
                          fontSize: "12px",
                          fontWeight: 500,
                          background: "transparent",
                          border: "1px solid #0F766E",
                          cursor: "pointer",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          transition: "all 0.15s ease"
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(15,118,110,0.05)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <Plus size={12} /> Add Item
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImportCategory(cat.key)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        color: "#EF4444",
                        background: "transparent",
                        border: "1px solid #EF4444",
                        cursor: "pointer",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 500,
                        transition: "all 0.15s ease"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#FEE2E2"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      title={`Remove ${cat.label} category`}
                    >
                      ✕ Remove
                    </button>
                  </div>
                </div>

                {/* Category Line Items */}
                {items.length === 0 ? (
                  <div style={{ padding: "16px", textAlign: "center", fontSize: "13px", color: "#667085", background: "white", borderBottom: "1px solid #E5E9F0" }}>
                    No items.{" "}
                    {isParticularsCategory ? (
                      <button type="button" onClick={() => setShowAddParticularsDropdown(true)} style={{ color: "#0F766E", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontSize: "13px" }}>
                        Add one
                      </button>
                    ) : (
                      <button type="button" onClick={() => handleAdd(cat.key)} style={{ color: "#0F766E", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontSize: "13px" }}>
                        Add one
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      {items.map((item, index) => {
                        return (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: "1px solid #E5E9F0",
                            background: "white"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#FAFBFC"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                        >
                          {/* Particulars */}
                          <td style={{ padding: "8px 8px 8px 16px", width: "50%" }}>
                            <input
                              type="text"
                              value={item.particulars}
                              onChange={(e) => handleUpdate(cat.key, item.id, 'particulars', e.target.value)}
                              placeholder="Enter particulars"
                              style={{
                                height: "36px",
                                width: "100%",
                                border: "1px solid #E5E9F0",
                                borderRadius: "4px",
                                padding: "0 10px",
                                fontSize: "14px",
                                color: "#0A1D4D",
                                background: "white",
                                outline: "none",
                                boxSizing: "border-box" as const,
                                transition: "border-color 0.15s ease"
                              }}
                              onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
                              onBlur={(e) => e.currentTarget.style.borderColor = "#E5E9F0"}
                            />
                          </td>
                          {/* Voucher No */}
                          <td style={{ padding: "8px", width: "15%" }}>
                            <FilterSingleDropdown
                              value={item.voucherNo || ""}
                              onChange={(v) => handleUpdate(cat.key, item.id, 'voucherNo', v)}
                              options={(vouchers || []).map((v: any) => ({ value: v.voucherNumber, label: v.voucherNumber }))}
                              placeholder="Select Voucher"
                            />
                          </td>
                          {/* Amount */}
                          <td style={{ padding: "8px", width: "25%" }}>
                            <input
                              type="number"
                              value={item.amount || ""}
                              onChange={(e) => handleUpdate(cat.key, item.id, 'amount', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              style={{
                                height: "36px",
                                width: "100%",
                                border: "1px solid #E5E9F0",
                                borderRadius: "4px",
                                padding: "0 10px",
                                fontSize: "14px",
                                color: "#0A1D4D",
                                background: "white",
                                outline: "none",
                                textAlign: "right" as const,
                                boxSizing: "border-box" as const,
                                transition: "border-color 0.15s ease"
                              }}
                              onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
                              onBlur={(e) => e.currentTarget.style.borderColor = "#E5E9F0"}
                            />
                          </td>
                          {/* Actions */}
                          <td style={{ padding: "8px", width: "5%", textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => isParticularsCategory ? handleRemoveParticular(item.id) : handleRemove(cat.key, item.id)}
                              style={{
                                color: "#D1D5DB",
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                padding: "4px",
                                transition: "color 0.15s ease"
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = "#EF4444"}
                              onMouseLeave={(e) => e.currentTarget.style.color = "#D1D5DB"}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                    {/* Category Subtotal */}
                    <tfoot>
                      <tr style={{ background: "#FAFBFC", borderBottom: "1px solid #E5E9F0" }}>
                        <td colSpan={2} style={{ padding: "10px 16px", textAlign: "right", fontSize: "12px", fontWeight: 600, color: "#667085", textTransform: "uppercase" as const }}>
                          Subtotal
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", fontSize: "14px", fontWeight: 700, color: "#0A1D4D" }}>
                          ₱{formatAmount(categoryTotal)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                  </>
                )}
              </div>
            );
          })
        ) : (
          // EXPORT: Use the 6 fixed export categories
          visibleExportCategories.map((catName, catIndex) => renderExportCategorySection(catName, catIndex))
        )}

        {/* Domestic Sections — one per province segment */}
        {!isImport && (tables.domesticSections || []).map((section) => {
          const sectionTotal = calculateTotal(section.items);
          const containerLabel = section.containerNos.filter(Boolean).join(", ") || "No containers";
          const segContainerCount = section.containerNos.filter(Boolean).length || 0;
          const availableSuggestions = getAvailableDomesticSuggestions(section.items);
          // Derive volume type from booking for the domestic volume header
          const rawVol = booking?.volume || "";
          const volMatch = rawVol.match(/^\d+x(.+)$/i);
          const volumeType = volMatch ? volMatch[1] : (rawVol || "40'HC");
          const domesticVolumeLabel = `${segContainerCount}X${volumeType}`;

          return (
            <div key={section.segmentId}>
              {/* Domestic Section Title */}
              <div style={{
                padding: "12px 16px",
                background: "#F0F4F3",
                borderTop: "2px solid #0F766E",
                borderBottom: "1px solid #E5E9F0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#0A1D4D",
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.03em"
                  }}>
                    Domestic — {containerLabel}
                  </span>
                  <span style={{ fontSize: "12px", color: "#667085" }}>
                    ({section.items.length} item{section.items.length !== 1 ? 's' : ''})
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div ref={showDomesticAddItemDropdown === section.segmentId ? domesticAddItemRef : undefined} style={{ position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => setShowDomesticAddItemDropdown(prev => prev === section.segmentId ? null : section.segmentId)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        color: "#0F766E",
                        fontSize: "12px",
                        fontWeight: 500,
                        background: "transparent",
                        border: "1px solid #0F766E",
                        cursor: "pointer",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        transition: "all 0.15s ease"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(15,118,110,0.05)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <Plus size={12} /> Add Item <ChevronDown size={12} />
                    </button>
                    <PortalDropdown
                      isOpen={showDomesticAddItemDropdown === section.segmentId}
                      onClose={() => setShowDomesticAddItemDropdown(null)}
                      triggerRef={domesticAddItemRef}
                      minWidth="240px"
                    >
                        {availableSuggestions.length > 0 && (
                          <>
                            <div style={{ padding: "6px 12px 4px", fontSize: "11px", fontWeight: 600, color: "#667085", textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
                              Suggested Items
                            </div>
                            {availableSuggestions.map(label => (
                              <button
                                key={label}
                                type="button"
                                onClick={() => handleDomesticAddSuggestedItem(section.segmentId, label)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  width: "100%",
                                  padding: "9px 12px",
                                  fontSize: "13px",
                                  fontWeight: 500,
                                  color: "#0A1D4D",
                                  background: "white",
                                  border: "none",
                                  cursor: "pointer",
                                  textAlign: "left" as const,
                                  transition: "background 0.1s ease"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = "#F0FDFA"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                              >
                                <Plus size={14} color="#0F766E" />
                                {label}
                              </button>
                            ))}
                            <div style={{ height: "1px", background: "#E5E9F0", margin: "4px 0" }} />
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDomesticAddCustomItem(section.segmentId)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            width: "100%",
                            padding: "9px 12px",
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "#0F766E",
                            background: "white",
                            border: "none",
                            cursor: "pointer",
                            textAlign: "left" as const,
                            transition: "background 0.1s ease"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#F0FDFA"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                        >
                          <Plus size={14} color="#0F766E" />
                          Add Custom Item
                        </button>
                    </PortalDropdown>
                  </div>
                </div>
              </div>

              {/* Domestic Column Headers */}
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "white", borderBottom: "1px solid #E5E9F0" }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 500, color: "#667085", textTransform: "uppercase" as const, width: "30%" }}>Particulars</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", fontWeight: 500, color: "#667085", textTransform: "uppercase" as const, width: "25%" }}>Unit Price</th>
                    <th style={{ padding: "12px 8px", textAlign: "center", fontSize: "12px", fontWeight: 500, color: "#667085", textTransform: "uppercase" as const, width: "7%", whiteSpace: "nowrap" }} title="Multiply unit price by container count">Per Cont.</th>
                    <th style={{ padding: "12px 8px", textAlign: "right", fontSize: "12px", fontWeight: 500, color: "#667085", textTransform: "uppercase" as const, width: "11%" }}>{domesticVolumeLabel}</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", fontWeight: 500, color: "#667085", textTransform: "uppercase" as const, width: "15%" }}>Voucher No</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", fontWeight: 500, color: "#667085", textTransform: "uppercase" as const, width: "10%" }}>Voucher Amt</th>
                    <th style={{ width: "5%" }}></th>
                  </tr>
                </thead>
              </table>

              {/* Domestic Line Items */}
              {section.items.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", fontSize: "13px", color: "#667085", background: "white", borderBottom: "1px solid #E5E9F0" }}>
                  No items.{" "}
                  <button type="button" onClick={() => setShowDomesticAddItemDropdown(section.segmentId)} style={{ color: "#0F766E", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontSize: "13px" }}>
                    Add one
                  </button>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {section.items.map((item) => {
                      const parsedPrice = parseFloat(String(item.unitPrice || 0)) || 0;
                      const cur = item.currency || "PHP";
                      const currencyMultiplier = (cur === "USD" || cur === "RMB") ? parsedExchangeRate : 1;
                      const mult = item.multiplyByContainers !== false ? segContainerCount : 1;
                      const volumeAmount = parsedPrice * currencyMultiplier * mult;
                      return (
                        <tr
                          key={item.id}
                          style={{ borderBottom: "1px solid #E5E9F0", background: "white" }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#FAFBFC"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                        >
                          {/* Particulars */}
                          <td style={{ padding: "8px 8px 8px 16px", width: "30%" }}>
                            <input
                              type="text"
                              value={item.particulars}
                              onChange={(e) => handleDomesticUpdateItem(section.segmentId, item.id, 'particulars', e.target.value)}
                              placeholder="Enter particulars"
                              style={{
                                height: "36px", width: "100%", border: "1px solid #E5E9F0", borderRadius: "4px",
                                padding: "0 10px", fontSize: "14px", color: "#0A1D4D", background: "white",
                                outline: "none", boxSizing: "border-box" as const, transition: "border-color 0.15s ease"
                              }}
                              onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
                              onBlur={(e) => e.currentTarget.style.borderColor = "#E5E9F0"}
                            />
                          </td>
                          {/* Unit Price */}
                          <td style={{ padding: "8px", width: "25%", textAlign: "right" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", width: "100%", justifyContent: "flex-end" }}>
                              <input
                                type="number"
                                step="0.01"
                                value={item.unitPrice || ""}
                                onChange={(e) => handleDomesticUpdateItem(section.segmentId, item.id, 'unitPrice', e.target.value)}
                                placeholder="0.00"
                                style={{
                                  height: "36px", flex: 1, minWidth: 0, border: "1px solid #E5E9F0", borderRadius: "4px",
                                  padding: "0 6px", fontSize: "13px", color: "#0A1D4D", background: "white",
                                  outline: "none", textAlign: "right" as const, boxSizing: "border-box" as const,
                                  transition: "border-color 0.15s ease"
                                }}
                                onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
                                onBlur={(e) => e.currentTarget.style.borderColor = "#E5E9F0"}
                              />
                              <select
                                value={item.currency || "PHP"}
                                onChange={(e) => handleDomesticUpdateItem(section.segmentId, item.id, 'currency', e.target.value)}
                                style={{
                                  height: "36px", width: "58px", border: "1px solid #E5E9F0", borderRadius: "4px",
                                  padding: "0 2px", fontSize: "11px", fontWeight: 600, color: "#0F766E",
                                  background: "white", outline: "none", cursor: "pointer", transition: "border-color 0.15s ease"
                                }}
                                onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
                                onBlur={(e) => e.currentTarget.style.borderColor = "#E5E9F0"}
                              >
                                <option value="PHP">PHP</option>
                                <option value="USD">USD</option>
                                <option value="RMB">RMB</option>
                              </select>
                              <select
                                value={item.per || "40"}
                                onChange={(e) => handleDomesticUpdateItem(section.segmentId, item.id, 'per', e.target.value)}
                                style={{
                                  height: "36px", width: "70px", border: "1px solid #E5E9F0", borderRadius: "4px",
                                  padding: "0 2px", fontSize: "11px", color: "#667085", background: "white",
                                  outline: "none", cursor: "pointer", transition: "border-color 0.15s ease"
                                }}
                                onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
                                onBlur={(e) => e.currentTarget.style.borderColor = "#E5E9F0"}
                              >
                                <option value="40">PER 40</option>
                                <option value="20">PER 20</option>
                                <option value="BL">PER BL</option>
                              </select>
                            </div>
                          </td>
                          {/* Multiply by containers checkbox */}
                          <td style={{ padding: "8px", width: "5%", textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={item.multiplyByContainers !== false}
                              onChange={(e) => handleDomesticUpdateItem(section.segmentId, item.id, 'multiplyByContainers', e.target.checked)}
                              title={item.multiplyByContainers !== false ? `Multiplied by ${segContainerCount} containers` : "Not multiplied by containers"}
                              style={{ width: "16px", height: "16px", accentColor: "#0F766E", cursor: "pointer" }}
                            />
                          </td>
                          {/* Volume */}
                          <td style={{ padding: "8px 16px", width: "13%", textAlign: "right", fontSize: "14px", color: "#0A1D4D", fontWeight: 600, background: "#FAFBFC" }}>
                            ₱{formatAmount(volumeAmount)}
                          </td>
                          {/* Voucher No */}
                          <td style={{ padding: "8px", width: "15%" }}>
                            <select
                              value={item.voucherNo || ""}
                              onChange={(e) => handleDomesticUpdateItem(section.segmentId, item.id, 'voucherNo', e.target.value)}
                              style={{
                                height: "36px", width: "100%", border: "1px solid transparent", borderRadius: "6px",
                                padding: "0 8px", fontSize: "13px", color: "#0A1D4D", background: "transparent",
                                outline: "none", appearance: "none" as const, cursor: "pointer",
                                transition: "border-color 0.15s ease",
                                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23667085' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                                backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", backgroundSize: "14px"
                              }}
                              onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
                              onBlur={(e) => e.currentTarget.style.borderColor = "transparent"}
                            >
                              <option value="">Select Voucher</option>
                              {(vouchers || []).map((v: any) => (
                                <option key={v.id || v.voucherNumber} value={v.voucherNumber}>
                                  {v.voucherNumber}
                                </option>
                              ))}
                            </select>
                          </td>
                          {/* Voucher Amount */}
                          <td style={{ padding: "8px", width: "10%" }}>
                            <div style={{ padding: "0 10px", fontSize: "14px", color: "#0A1D4D", textAlign: "right", fontWeight: 500, lineHeight: "36px" }}>
                              ₱{formatAmount(item.amount || 0)}
                            </div>
                          </td>
                          {/* Actions */}
                          <td style={{ padding: "8px", width: "5%", textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleDomesticRemoveItem(section.segmentId, item.id)}
                              style={{ color: "#D1D5DB", background: "transparent", border: "none", cursor: "pointer", padding: "4px", transition: "color 0.15s ease" }}
                              onMouseEnter={(e) => e.currentTarget.style.color = "#EF4444"}
                              onMouseLeave={(e) => e.currentTarget.style.color = "#D1D5DB"}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#FAFBFC", borderBottom: "1px solid #E5E9F0" }}>
                      <td colSpan={4} style={{ padding: "10px 16px", textAlign: "right", fontSize: "12px", fontWeight: 600, color: "#667085", textTransform: "uppercase" as const }}>
                        Subtotal
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "right", fontSize: "14px", fontWeight: 700, color: "#0A1D4D" }}>
                        ₱{formatAmount(sectionTotal)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          );
        })}

        {/* Grand Total — integrated footer */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tfoot>
            <tr style={{ background: "#F0F4F3", borderTop: "2px solid #E5E9F0" }}>
              <td colSpan={2} style={{ padding: "14px 16px", textAlign: "right", fontSize: "13px", fontWeight: 700, color: "#0A1D4D", textTransform: "uppercase" as const, letterSpacing: "0.03em", width: "65%" }}>
                Grand Total
                {isImport && (
                  <div style={{ fontSize: "11px", fontWeight: 400, color: "#667085", marginTop: "2px" }}>(Excludes Refundable Deposits)</div>
                )}
              </td>
              <td style={{ padding: "14px 16px", textAlign: "right", fontSize: "18px", fontWeight: 700, color: "#0A1D4D", width: "25%" }}>
                ₱{formatAmount(grandTotal)}
              </td>
              <td style={{ width: "4%" }}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Refundable Deposits — separate section below */}
      {isImport && (
      <div style={{
        border: "1px solid #E5E9F0",
        borderRadius: "8px",
        overflow: "hidden",
        marginTop: "24px"
      }}>
        <div style={{
          padding: "12px 16px",
          background: "#FAFBFC",
          borderBottom: "1px solid #E5E9F0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>
              Refundable Deposits
            </h3>
            <span style={{
              fontSize: "10px",
              background: "rgba(15,118,110,0.1)",
              color: "#0F766E",
              border: "1px solid rgba(15,118,110,0.2)",
              padding: "2px 8px",
              borderRadius: "999px",
              fontWeight: 500
            }}>
              Excluded from Cost
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleAdd("refundableDeposits")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: "#0F766E",
              fontSize: "12px",
              fontWeight: 500,
              background: "transparent",
              border: "1px solid #0F766E",
              cursor: "pointer",
              padding: "4px 10px",
              borderRadius: "6px",
              transition: "all 0.15s ease"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(15,118,110,0.05)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <Plus size={12} /> Add Item
          </button>
        </div>

        {tables.refundableDeposits.length === 0 ? (
          <div style={{ padding: "16px", textAlign: "center", fontSize: "13px", color: "#667085", background: "white" }}>
            No items.{" "}
            <button type="button" onClick={() => handleAdd("refundableDeposits")} style={{ color: "#0F766E", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontSize: "13px" }}>
              Add one
            </button>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "white", borderBottom: "1px solid #E5E9F0" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 500, color: "#667085", textTransform: "uppercase" as const, width: "50%" }}>Particulars</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 500, color: "#667085", textTransform: "uppercase" as const, width: "15%" }}>Voucher No</th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", fontWeight: 500, color: "#667085", textTransform: "uppercase" as const, width: "25%" }}>Amount</th>
                <th style={{ width: "10%" }}></th>
              </tr>
            </thead>
            <tbody>
              {tables.refundableDeposits.map((item) => (
                <tr
                  key={item.id}
                  style={{ borderBottom: "1px solid #E5E9F0", background: "white" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#FAFBFC"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                >
                  <td style={{ padding: "8px 8px 8px 16px", width: "50%" }}>
                    <input
                      type="text"
                      value={item.particulars}
                      onChange={(e) => handleUpdate("refundableDeposits", item.id, 'particulars', e.target.value)}
                      placeholder="Enter particulars"
                      style={{
                        height: "36px",
                        width: "100%",
                        border: "1px solid transparent",
                        borderRadius: "6px",
                        padding: "0 10px",
                        fontSize: "14px",
                        color: "#0A1D4D",
                        background: "transparent",
                        outline: "none",
                        boxSizing: "border-box" as const,
                        transition: "border-color 0.15s ease"
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
                      onBlur={(e) => e.currentTarget.style.borderColor = "transparent"}
                      onMouseEnter={(e) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = "#E5E9F0"; }}
                      onMouseLeave={(e) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = "transparent"; }}
                    />
                  </td>
                  <td style={{ padding: "8px", width: "15%" }}>
                    <select
                      value={item.voucherNo || ""}
                      onChange={(e) => handleUpdate("refundableDeposits", item.id, 'voucherNo', e.target.value)}
                      style={{
                        height: "36px",
                        width: "100%",
                        border: "1px solid transparent",
                        borderRadius: "6px",
                        padding: "0 8px",
                        fontSize: "13px",
                        color: "#0A1D4D",
                        background: "transparent",
                        outline: "none",
                        appearance: "none" as const,
                        cursor: "pointer",
                        transition: "border-color 0.15s ease",
                        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23667085' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 8px center",
                        backgroundSize: "14px"
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
                      onBlur={(e) => e.currentTarget.style.borderColor = "transparent"}
                    >
                      <option value="">Select Voucher</option>
                      {(vouchers || []).map((v: any) => (
                        <option key={v.id || v.voucherNumber} value={v.voucherNumber}>
                          {v.voucherNumber}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: "8px", width: "25%" }}>
                    <input
                      type="number"
                      value={item.amount || ""}
                      onChange={(e) => handleUpdate("refundableDeposits", item.id, 'amount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      style={{
                        height: "36px",
                        width: "100%",
                        border: "1px solid transparent",
                        borderRadius: "6px",
                        padding: "0 10px",
                        fontSize: "14px",
                        color: "#0A1D4D",
                        background: "transparent",
                        outline: "none",
                        textAlign: "right" as const,
                        boxSizing: "border-box" as const,
                        transition: "border-color 0.15s ease"
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = "#0F766E"}
                      onBlur={(e) => e.currentTarget.style.borderColor = "transparent"}
                      onMouseEnter={(e) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = "#E5E9F0"; }}
                      onMouseLeave={(e) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = "transparent"; }}
                    />
                  </td>
                  <td style={{ padding: "8px", width: "10%", textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => handleRemove("refundableDeposits", item.id)}
                      style={{
                        color: "#D1D5DB",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        transition: "color 0.15s ease"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "#EF4444"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "#D1D5DB"}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "#FAFBFC", borderTop: "1px solid #E5E9F0" }}>
                <td colSpan={2} style={{ padding: "10px 16px", textAlign: "right", fontSize: "12px", fontWeight: 600, color: "#667085", textTransform: "uppercase" as const }}>
                  Subtotal
                </td>
                <td style={{ padding: "10px 16px", textAlign: "right", fontSize: "14px", fontWeight: 700, color: "#0A1D4D" }}>
                  ₱{formatAmount(calculateTotal(tables.refundableDeposits))}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
      )}
    </div>
  );
}
