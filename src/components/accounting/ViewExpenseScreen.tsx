import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Edit3, Clock, ChevronDown, ChevronRight, Plus, X, Trash2, FileText, Receipt, Save, Pencil, Link2, Paperclip } from "lucide-react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "sonner@2.0.3";
import { VouchersTab } from "./VouchersTab";
import { StandardTabs, StandardButton } from "../design-system";
import { ActionsDropdown } from "../shared/ActionsDropdown";
import { BookingSelector } from "../selectors/BookingSelector";

import { RefundPopover } from "./RefundPopover";
import { formatAmount } from "../../utils/formatAmount";
import { EXPORT_STANDARD_PARTICULARS, getAvailableExportSuggestions } from "./ExpenseCostingTables";
import { AttachmentsTab } from "../shared/AttachmentsTab";
import { NotesSection } from "../shared/NotesSection";
import { API_BASE_URL } from '@/utils/api-config';

interface ViewExpenseScreenProps {
  expenseId: string;
  onBack?: () => void;
  onDeleted?: () => void;
  /** When true, hides header/back button, metadata bar, and tab navigation. Renders overview content only. */
  embedded?: boolean;
}

interface LineItem {
  category: string;
  description: string;
  amount: number | string;
  unitPrice?: number | string;
  per?: string;
  currency?: string;
  voucherNo?: string;
  sourceVoucherLineItemId?: string;
  // Refund Fields
  refundDateSubmitted?: string;
  refundCheckNo?: string;
  refundAmount?: number;
  refundDateRefunded?: string;
}

interface ExpenseData {
  id: string;
  expenseNumber: string;
  projectId: string;
  projectNumber?: string;
  bookingIds: string[];
  linkedBookingIds?: string[]; // Support for expenses created from projects
  category: string;
  vendor?: string;
  amount: number;
  expenseDate: string;
  paymentMethod?: string;
  description?: string;
  receiptNumber?: string;
  notes?: string;
  documentTemplate: "IMPORT" | "EXPORT" | "";
  status: string;
  createdAt: string;
  billing_amount?: number;
  
  // IMPORT-specific fields
  pod?: string;
  commodity?: string;
  blNumber?: string;
  containerNo?: string;
  weight?: string;
  vesselVoyage?: string;
  origin?: string;
  releasingDate?: string;
  
  // EXPORT-specific fields
  clientShipper?: string;
  destination?: string;
  loadingAddress?: string;
  exchangeRate?: string;
  containerNumbers?: string[];
  charges?: LineItem[];
  
  // Common fields
  client?: string;
  shipperConsignee?: string;
}

interface Booking {
  id: string;
  bookingId?: string;          // Primary field used by backend
  bookingNumber?: string;
  booking_number?: string;
  project_id?: string;          // Project ID reference
  customer_id?: string;         // Client ID reference
  client_id?: string;           // Client ID reference (alternative)
  companyName?: string;         // Company name field (will be fetched)
  company_name?: string;        // Company name field (snake_case)
  clientName?: string;
  client_name?: string;
  customerName?: string;        // Alternative client field
  customer_name?: string;       // Alternative client field
  shipper?: string;             // Alternative client field
}

interface Client {
  id: string;
  name?: string;
  company_name?: string;
}

interface Project {
  id: string;
  projectNumber?: string;
  project_number?: string;
  movement?: string;
}

export function ViewExpenseScreen({ expenseId, onBack, onDeleted, embedded = false }: ViewExpenseScreenProps) {
  const [expense, setExpense] = useState<ExpenseData | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // Billing Calculator State
  const [showBillingCalculator, setShowBillingCalculator] = useState(false);
  const [billingCalcMode, setBillingCalcMode] = useState<"margin" | "percent" | "total">("margin");
  
  // Use string state for inputs to allow flexible typing (e.g. "1.", "0.00", "")
  const [marginInput, setMarginInput] = useState<string>("");
  const [percentInput, setPercentInput] = useState<string>("");
  const [totalInput, setTotalInput] = useState<string>("");

  const [editedExpense, setEditedExpense] = useState<ExpenseData | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});
  const [activeTab, setActiveTab] = useState<"overview" | "vouchers" | "attachments">("overview");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [voucherLinkFilter, setVoucherLinkFilter] = useState<"ALL" | "LINKED" | "UNLINKED">("ALL");
  const [vouchers, setVouchers] = useState<any[]>([]);
  
  // For edit mode dropdowns
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [bookingSearchTerm, setBookingSearchTerm] = useState("");
  const [showBookingDropdown, setShowBookingDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  
  // Unreconciled Items State
  const [unreconciledItems, setUnreconciledItems] = useState<any[]>([]);

  // Linking State
  const [linkingLineItem, setLinkingLineItem] = useState<LineItem | null>(null);
  
  // Tooltip State
  const [hoveredTooltip, setHoveredTooltip] = useState<{ text: string, x: number, y: number } | null>(null);

  // Refund Popover State
  const [refundPopoverState, setRefundPopoverState] = useState<{
    isOpen: boolean;
    referenceElement: HTMLElement | null;
    lineItemIndex: number;
    initialData: any;
    depositAmount: number;
  }>({
    isOpen: false,
    referenceElement: null,
    lineItemIndex: -1,
    initialData: {},
    depositAmount: 0
  });

  // Trucking Loading Address (fetched from trucking record)
  const [truckingLoadingAddress, setTruckingLoadingAddress] = useState<string>("");

  // Add Category Dropdown State (for EXPORT)
  const [showAddCategoryDropdown, setShowAddCategoryDropdown] = useState(false);
  const addCategoryDropdownRef = useRef<HTMLDivElement>(null);

  // Track removed export categories in edit mode (so empty categories can still render)
  const [removedExportCategories, setRemovedExportCategories] = useState<string[]>([]);

  // Export Add Item Dropdown State (per-category suggested particulars)
  const [showExportAddItemDropdown, setShowExportAddItemDropdown] = useState<string | null>(null);
  const exportAddItemRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addCategoryDropdownRef.current && !addCategoryDropdownRef.current.contains(e.target as Node)) {
        setShowAddCategoryDropdown(false);
      }
    };
    if (showAddCategoryDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAddCategoryDropdown]);

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

  const handleOpenRefundPopover = (e: React.MouseEvent<HTMLButtonElement>, item: LineItem) => {
    if (!expense?.charges) return;
    
    // Find absolute index in charges array
    const absoluteIndex = expense.charges.indexOf(item);
    if (absoluteIndex === -1) return;

    setRefundPopoverState({
      isOpen: true,
      referenceElement: e.currentTarget,
      lineItemIndex: absoluteIndex,
      initialData: {
        refundDateSubmitted: item.refundDateSubmitted,
        refundCheckNo: item.refundCheckNo,
        refundAmount: item.refundAmount,
        refundDateRefunded: item.refundDateRefunded
      },
      depositAmount: typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount || 0))
    });
  };

  const handleCloseRefundPopover = () => {
    setRefundPopoverState(prev => ({ ...prev, isOpen: false, referenceElement: null }));
  };

  const handleSaveRefund = async (data: any) => {
    if (!expense || refundPopoverState.lineItemIndex === -1) return;

    const updatedCharges = [...(expense.charges || [])];
    const targetCharge = updatedCharges[refundPopoverState.lineItemIndex];

    // Update the charge with new refund data
    updatedCharges[refundPopoverState.lineItemIndex] = {
      ...targetCharge,
      refundDateSubmitted: data.refundDateSubmitted,
      refundCheckNo: data.refundCheckNo,
      refundAmount: data.refundAmount ? parseFloat(data.refundAmount) : undefined,
      refundDateRefunded: data.refundDateRefunded
    };

    // Optimistic update
    const updatedExpense = { ...expense, charges: updatedCharges };
    setExpense(updatedExpense);
    if (!isEditing) setEditedExpense(updatedExpense); // Keep edited synced if not editing
    handleCloseRefundPopover();

    // Persist to backend
    try {
      const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
        method: "PATCH",
        headers: {
            "Authorization": `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ charges: updatedCharges }),
      });

      if (!response.ok) throw new Error("Failed to save refund details");
      
      toast.success("Refund details saved");
      // Refetch to ensure consistency
      fetchExpenseDetails();
    } catch (error) {
        console.error("Error saving refund:", error);
        toast.error("Failed to save refund details");
    }
  };

  useEffect(() => {
    if (isEditing) {
      fetchVouchers();
    }
  }, [isEditing]);

  // Helper to check if a line item has a voucher linked
  const hasVoucherLinked = (item: LineItem, index?: number): boolean => {
    // Check if the item itself has a source link (Robust check)
    return !!(item.sourceVoucherLineItemId || item.sourceVoucherLineItemId);
  };

  useEffect(() => {
    // 1. Build a map of all voucher items for O(1) lookup
    const voucherLineItemsMap = new Map<string, any>();
    vouchers.forEach(v => {
        let lines: any[] = [];
        // Robust parsing
        if (Array.isArray(v.lineItems)) lines = v.lineItems;
        else if (Array.isArray(v.line_items)) lines = v.line_items;
        else if (typeof v.lineItems === 'string') { try { lines = JSON.parse(v.lineItems); } catch(e){} }
        else if (typeof v.line_items === 'string') { try { lines = JSON.parse(v.line_items); } catch(e){} }

        lines.forEach(line => {
            if (line.id) {
                voucherLineItemsMap.set(String(line.id), { 
                    ...line, 
                    voucherNumber: v.voucherNumber 
                });
            }
        });
    });

    // 2. Sync Logic: Update expense charges with live voucher data
    if (vouchers.length > 0 && expense) {
        const performSync = (baseExpense: ExpenseData) => {
            if (!baseExpense.charges) return null;
            
            let hasChanges = false;
            const updatedCharges = baseExpense.charges.map(charge => {
                const linkId = charge.sourceVoucherLineItemId || charge.source_voucher_line_item_id;
                
                if (linkId) {
                    const liveItem = voucherLineItemsMap.get(String(linkId));
                    if (liveItem) {
                        // Found: Sync Amount ONLY (Keep description as is)
                        // Check if amount changed
                        if (charge.amount !== liveItem.amount) {
                            hasChanges = true;
                            return { 
                                ...charge, 
                                amount: liveItem.amount,
                                // Also sync unitPrice if per is not "40" (which implies manual calculation)
                                // or just sync it to keep data clean.
                                unitPrice: liveItem.amount 
                            };
                        }
                    } else {
                        // Not Found: Item was deleted from voucher -> Remove from expense
                        hasChanges = true;
                        return null; 
                    }
                }
                return charge;
            }).filter(Boolean) as LineItem[];

            if (hasChanges || updatedCharges.length !== baseExpense.charges.length) {
                return { ...baseExpense, charges: updatedCharges };
            }
            return null;
        };

        // Sync 'expense' state (View Mode)
        const syncedExpense = performSync(expense);
        if (syncedExpense) {
            console.log("Synced expense with live vouchers");
            setExpense(syncedExpense);
            if (!isEditing) setEditedExpense(syncedExpense);
        }

        // Sync 'editedExpense' state (Edit Mode)
        if (isEditing && editedExpense) {
            const syncedEdited = performSync(editedExpense);
            if (syncedEdited) {
                setEditedExpense(syncedEdited);
            }
        }
    }

    // 3. Unreconciled Items Calculation
    const currentExpense = isEditing ? editedExpense : expense;
    
    if (vouchers.length > 0 && currentExpense) {
      const expenseLineItemIds = new Set<string>();
      
      // Collect all linked IDs from current expense charges
      if (currentExpense.charges && Array.isArray(currentExpense.charges)) {
        currentExpense.charges.forEach((charge: any) => {
          const sourceId = charge.sourceVoucherLineItemId || charge.source_voucher_line_item_id;
          if (sourceId) {
            expenseLineItemIds.add(String(sourceId));
          }
        });
      }
      
      const newUnreconciled: any[] = [];
      
      // Iterate using the map we already built (or rebuild from vouchers if needed, but iterating vouchers is fine)
      vouchers.forEach(voucher => {
        let lines: any[] = [];
        if (Array.isArray(voucher.lineItems)) lines = voucher.lineItems;
        else if (Array.isArray(voucher.line_items)) lines = voucher.line_items;
        else if (typeof voucher.lineItems === 'string') { try { lines = JSON.parse(voucher.lineItems); } catch(e){} }
        else if (typeof voucher.line_items === 'string') { try { lines = JSON.parse(voucher.line_items); } catch(e){} }
        
        lines.forEach((line: any) => {
          if (line.id) {
            const lineId = String(line.id);
            if (!expenseLineItemIds.has(lineId)) {
              newUnreconciled.push({
                ...line,
                id: lineId,
                voucherNumber: voucher.voucherNumber
              });
            }
          }
        });
      });
      
      setUnreconciledItems(newUnreconciled);
    } else {
      setUnreconciledItems([]);
    }
  }, [isEditing, vouchers, editedExpense, expense?.charges]); // Trigger on charges change too

  const handleAddUnreconciledItem = (item: any, targetCategory: string) => {
    if (!editedExpense) return;
    
    // Determine the category based on target
    let categoryName = targetCategory;
    
    if (targetCategory === "Particulars") {
        categoryName = "Particulars";
    } else if (targetCategory === "Additional Charges") {
        categoryName = "Additional Charges";
    } else if (targetCategory === "Refundable Deposits") {
        categoryName = "Refundable Deposits";
    }
    
    const newItem: LineItem = {
      category: categoryName,
      description: item.description || "Unreconciled Item",
      amount: item.amount || 0,
      currency: "PHP",
      voucherNo: item.voucherNumber,
      sourceVoucherLineItemId: item.id
    };
    
    const updatedCharges = [...(editedExpense.charges || []), newItem];
    setEditedExpense({ ...editedExpense, charges: updatedCharges });
    
    // Ensure the category is expanded
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: true
    }));
    
    toast.success(`Added to ${categoryName}`);
  };

  const handleLinkVoucherItem = (voucherItem: any) => {
    if (!linkingLineItem || !editedExpense || !editedExpense.charges) return;

    const actualIndex = editedExpense.charges.findIndex(c => c === linkingLineItem);
    if (actualIndex === -1) return;

    const updatedCharges = [...editedExpense.charges];
    const targetItem = updatedCharges[actualIndex];

    // Update the item
    updatedCharges[actualIndex] = {
      ...targetItem,
      voucherNo: voucherItem.voucherNumber,
      sourceVoucherLineItemId: voucherItem.id,
      amount: voucherItem.amount,
      unitPrice: voucherItem.amount, // Sync unit price too
    };

    setEditedExpense({ ...editedExpense, charges: updatedCharges });
    setLinkingLineItem(null); // Close modal
    toast.success("Linked to voucher item");
  };

  const handleUnlinkVoucherItem = () => {
    if (!linkingLineItem || !editedExpense || !editedExpense.charges) return;

    const actualIndex = editedExpense.charges.findIndex(c => c === linkingLineItem);
    if (actualIndex === -1) return;

    const updatedCharges = [...editedExpense.charges];
    const targetItem = updatedCharges[actualIndex];

    updatedCharges[actualIndex] = {
      ...targetItem,
      voucherNo: undefined,
      sourceVoucherLineItemId: undefined,
      // Keep amount as is, but now it's editable
    };

    setEditedExpense({ ...editedExpense, charges: updatedCharges });
    setLinkingLineItem(null); // Close modal
    toast.success("Unlinked voucher item");
  };

  // Helper to get booking IDs from either bookingIds or linkedBookingIds field
  const getBookingIds = (expenseData: ExpenseData | null): string[] => {
    if (!expenseData) return [];
    return expenseData.bookingIds || expenseData.linkedBookingIds || [];
  };

  // Helper to format booking display name as "Company Name - Client Name"
  const getBookingDisplayName = (booking: Booking): string => {
    const companyName = booking.companyName || booking.company_name || "";
    const clientName = booking.clientName || booking.client_name || booking.customerName || booking.customer_name || booking.shipper || "";
    
    if (companyName && clientName) {
      return `${companyName} - ${clientName}`;
    } else if (companyName) {
      return companyName;
    } else if (clientName) {
      return clientName;
    }
    return "—";
  };

  // Helper to convert date to MM-DD-YYYY format for display
  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return "";
    
    try {
      // Already in MM-DD-YYYY or MM/DD/YYYY format
      if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
          const [month, day, year] = parts;
          return `${month.padStart(2, '0')}-${day.padStart(2, '0')}-${year}`;
        }
      }
      
      if (dateString.includes('-') && dateString.split('-')[0].length === 2) {
        // Already in MM-DD-YYYY format
        return dateString;
      }
      
      // Handle ISO format or YYYY-MM-DD format
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}-${day}-${year}`;
      }
    } catch (error) {
      console.error("Error formatting date:", error);
    }
    
    return "";
  };

  useEffect(() => {
    fetchExpenseDetails();
    fetchProjectsAndBookings();
    // fetchVouchers(); // Removed: We will fetch vouchers based on bookings once expense is loaded
  }, [expenseId]);

  // New Effect: Fetch vouchers from linked bookings whenever expense booking IDs change
  useEffect(() => {
    if (expense) {
      const ids = getBookingIds(expense);
      if (ids.length > 0) {
        fetchBookingVouchers(ids);
      } else {
        setVouchers([]);
      }
    }
  }, [expense?.bookingIds, expense?.linkedBookingIds]); // React to changes in booking links

  // Fetch trucking record loading address for export bookings
  useEffect(() => {
    if (expense && expense.documentTemplate === "EXPORT") {
      const ids = getBookingIds(expense);
      if (ids.length > 0) {
        (async () => {
          for (const bookingId of ids) {
            try {
              const res = await fetch(`${API_BASE_URL}/trucking-records?linkedBookingId=${bookingId}`, {
                headers: { Authorization: `Bearer ${publicAnonKey}` },
              });
              const result = await res.json();
              if (result.success && Array.isArray(result.data) && result.data.length > 0) {
                const truckingAddr = result.data[0].truckingAddress || result.data[0].trucking_address || "";
                if (truckingAddr) {
                  setTruckingLoadingAddress(truckingAddr);
                  return; // Found one, stop looking
                }
              }
            } catch (err) {
              console.error("Error fetching trucking record for loading address:", err);
            }
          }
        })();
      }
    }
  }, [expense?.documentTemplate, expense?.bookingIds, expense?.linkedBookingIds]);

  const fetchBookingVouchers = async (bookingIds: string[]) => {
    try {
      console.log("Fetching vouchers for bookings:", bookingIds);
      const promises = bookingIds.map(id => 
        fetch(`${API_BASE_URL}/bookings/${id}/vouchers`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }).then(res => res.json())
      );

      const results = await Promise.all(promises);
      
      const allVouchers: any[] = [];
      results.forEach(result => {
        if (result.success && Array.isArray(result.data)) {
          allVouchers.push(...result.data);
        }
      });

      // Deduplicate vouchers by ID (in case of overlap or multiple fetches)
      const uniqueVouchers = Array.from(
        new Map(allVouchers.map(v => [v.id, v])).values()
      );

      console.log('Fetched unique booking vouchers:', uniqueVouchers);
      setVouchers(uniqueVouchers);
    } catch (error) {
      console.error("Error fetching booking vouchers:", error);
      toast.error("Failed to load linked vouchers");
    }
  };

  // Deprecated: Old fetchVouchers (replaced by fetchBookingVouchers)
  const fetchVouchers = async () => {
    // Kept for reference but not used
  };

  const fetchExpenseDetails = async () => {
    setIsLoading(true);
    try {
      const expenseResponse = await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
        headers: {
          "Authorization": `Bearer ${publicAnonKey}`,
        },
      });

      if (!expenseResponse.ok) {
        throw new Error("Failed to fetch expense details");
      }

      const expenseResult = await expenseResponse.json();
      
      console.log("Expense Result:", expenseResult);
      
      if (expenseResult.success && expenseResult.data) {
        const expenseData = expenseResult.data;
        console.log("Expense Data:", expenseData);
        setExpense(expenseData);
        setEditedExpense(expenseData);

        // Initialize expanded state for all categories
        if (expenseData.charges && expenseData.charges.length > 0) {
          const categories = [...new Set(expenseData.charges.map((c: LineItem) => c.category))];
          const initialExpandedState: { [key: string]: boolean } = {};
          categories.forEach(cat => {
            initialExpandedState[cat] = true;
          });
          setExpandedCategories(initialExpandedState);
        }

        if (expenseData.projectId) {
          const projectResponse = await fetch(`${API_BASE_URL}/projects/${expenseData.projectId}`, {
            headers: {
              "Authorization": `Bearer ${publicAnonKey}`,
            },
          });

          if (projectResponse.ok) {
            const projectResult = await projectResponse.json();
            if (projectResult.success && projectResult.data) {
              setProject(projectResult.data);
            }
          }
        }

        // Support both bookingIds (new format) and linkedBookingIds (from projects)
        // Filter out null, undefined, empty strings, and string "null"/"undefined" values
        const bookingIdsToFetch = (expenseData.bookingIds || expenseData.linkedBookingIds || [])
          .filter((id: string) => id != null && id !== "" && id !== "null" && id !== "undefined");
        
        console.log("Booking IDs to fetch (after filtering nulls):", bookingIdsToFetch);
        console.log("Full expense data:", expenseData);
        
        if (bookingIdsToFetch && bookingIdsToFetch.length > 0) {
          const bookingPromises = bookingIdsToFetch.map(async (bookingId: string) => {
            console.log(`Attempting to fetch booking: ${bookingId}`);
            const endpoints = [
              `${API_BASE_URL}/export-bookings/${bookingId}`,
              `${API_BASE_URL}/import-bookings/${bookingId}`,
              `${API_BASE_URL}/forwarding-bookings/${bookingId}`,
              `${API_BASE_URL}/trucking-bookings/${bookingId}`,
              `${API_BASE_URL}/brokerage-bookings/${bookingId}`,
              `${API_BASE_URL}/marine-insurance-bookings/${bookingId}`,
              `${API_BASE_URL}/others-bookings/${bookingId}`,
            ];

            for (const endpoint of endpoints) {
              try {
                const response = await fetch(endpoint, {
                  headers: {
                    "Authorization": `Bearer ${publicAnonKey}`,
                  },
                });

                if (response.ok) {
                  const result = await response.json();
                  if (result.success && result.data) {
                    console.log(`Found booking ${bookingId} at ${endpoint}:`, result.data);
                    // Normalize: ensure id field exists (use bookingId as fallback)
                    return {
                      ...result.data,
                      id: result.data.id || result.data.bookingId || bookingId
                    };
                  }
                }
              } catch (error) {
                console.log(`Failed to fetch from ${endpoint}:`, error);
                continue;
              }
            }
            console.log(`Booking ${bookingId} not found in any endpoint`);
            return null;
          });

          const bookingResults = await Promise.all(bookingPromises);
          console.log("Booking results:", bookingResults);
          const validBookings = bookingResults.filter((b): b is Booking => b !== null);
          console.log("Valid bookings:", validBookings);
          
          // Fetch client/company names for each booking
          const enrichedBookings = await Promise.all(
            validBookings.map(async (booking) => {
              const clientId = booking.customer_id || booking.client_id;
              console.log(`Booking ${booking.bookingId} has client_id: ${clientId}`);
              if (clientId) {
                try {
                  const clientResponse = await fetch(`${API_BASE_URL}/clients/${clientId}`, {
                    headers: {
                      "Authorization": `Bearer ${publicAnonKey}`,
                    },
                  });
                  
                  if (clientResponse.ok) {
                    const clientResult = await clientResponse.json();
                    if (clientResult.success && clientResult.data) {
                      console.log(`Fetched company name for ${clientId}:`, clientResult.data.company_name || clientResult.data.name);
                      return {
                        ...booking,
                        companyName: clientResult.data.company_name || clientResult.data.name
                      };
                    }
                  } else {
                    console.log(`Failed to fetch client ${clientId}: ${clientResponse.status}`);
                  }
                } catch (error) {
                  console.log(`Failed to fetch client ${clientId}:`, error);
                }
              } else {
                console.log(`Booking ${booking.bookingId} has no client_id or customer_id field`);
              }
              return booking;
            })
          );
          
          setBookings(enrichedBookings);
        } else {
          console.log("No booking IDs to fetch");
        }
      }
    } catch (error) {
      console.error("Error fetching expense details:", error);
      toast.error("Failed to load expense details");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjectsAndBookings = async () => {
    try {
      const projectsResponse = await fetch(`${API_BASE_URL}/projects`, {
        headers: {
          "Authorization": `Bearer ${publicAnonKey}`,
        },
      });

      if (projectsResponse.ok) {
        const projectsResult = await projectsResponse.json();
        if (projectsResult.success && projectsResult.data) {
          setAllProjects(projectsResult.data);
        }
      }

      const bookingsResponse = await fetch(`${API_BASE_URL}/bookings`, {
        headers: {
          "Authorization": `Bearer ${publicAnonKey}`,
        },
      });

      if (bookingsResponse.ok) {
        const bookingsResult = await bookingsResponse.json();
        if (bookingsResult.success && bookingsResult.data) {
          // Normalize all bookings to have proper id field
          const normalizedBookings = bookingsResult.data.map((b: any) => ({
            ...b,
            id: b.id || b.bookingId || b.booking_number || b.bookingNumber
          }));
          setAllBookings(normalizedBookings);
        }
      }
    } catch (error) {
      console.error("Error fetching projects and bookings:", error);
      toast.error("Failed to load projects and bookings");
    }
  };

  // Helper for Container Numbers
  const ExpenseContainerField = () => {
    // Determine current value
    const rawValue = isEditing 
        ? editedExpense?.containerNumbers 
        : expense?.containerNumbers;
    
    // Parse
    let containers: string[] = [];
    if (rawValue) {
        if (Array.isArray(rawValue)) {
            containers = rawValue;
        } else if (typeof rawValue === 'string') {
            containers = (rawValue as string).split(',').map(s => s.trim()).filter(Boolean);
        }
    } else if (expense?.containerNo) {
        // Fallback to legacy field
        containers = [expense.containerNo];
    }
    
    // Fallback if empty array
    if (containers.length === 0) containers = [];

    const handleChange = (index: number, val: string) => {
        if (!editedExpense) return;
        const newContainers = [...containers];
        newContainers[index] = val;
        setEditedExpense({ ...editedExpense, containerNumbers: newContainers, containerNo: newContainers.join(', ') });
    };

    const addRow = () => {
        if (!editedExpense) return;
        setEditedExpense({ ...editedExpense, containerNumbers: [...containers, ""], containerNo: [...containers, ""].join(', ') });
    };

    const removeRow = (index: number) => {
        if (!editedExpense) return;
        const newContainers = containers.filter((_, i) => i !== index);
        setEditedExpense({ ...editedExpense, containerNumbers: newContainers, containerNo: newContainers.join(', ') });
    };

    if (!isEditing) {
        return (
          <div>
            <div style={{ fontSize: "13px", color: "#667085", marginBottom: "8px", fontWeight: 500 }}>
              Container Numbers
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {containers.length > 0 ? containers.map((c, i) => (
                    <div key={i} style={{
                      padding: "10px 12px",
                      fontSize: "14px",
                      color: "#0A1D4D",
                      background: "#F9FAFB",
                      border: "1px solid #E5E9F0",
                      borderRadius: "8px"
                    }}>
                      {c}
                    </div>
                )) : (
                    <div style={{
                      padding: "10px 12px",
                      fontSize: "14px",
                      color: "#9CA3AF",
                      background: "#F9FAFB",
                      border: "1px solid #E5E9F0",
                      borderRadius: "8px"
                    }}>—</div>
                )}
            </div>
          </div>
        );
    }

    // Edit mode
    const editableContainers = containers.length > 0 ? containers : [""];

    return (
        <div>
            <div style={{ fontSize: "13px", color: "#667085", marginBottom: "8px", fontWeight: 500 }}>Container Numbers</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {editableContainers.map((c, i) => (
                    <div key={i} style={{ display: "flex", gap: "8px" }}>
                        <input
                            type="text"
                            value={c}
                            onChange={(e) => handleChange(i, e.target.value)}
                            style={{ width: "100%", padding: "10px 12px", fontSize: "14px", color: "#0A1D4D", background: "white", border: "1px solid #E5E9F0", borderRadius: "8px" }}
                            placeholder={`Container #${i + 1}`}
                        />
                        <button
                            type="button"
                            onClick={() => {
                                if (editableContainers.length <= 1 && i === 0) {
                                    setEditedExpense({ ...editedExpense!, containerNumbers: [], containerNo: "" });
                                } else {
                                    removeRow(i);
                                }
                            }}
                            disabled={editableContainers.length <= 1}
                            style={{ 
                                padding: "8px", 
                                color: "#EF4444", 
                                background: "transparent", 
                                border: "none",
                                cursor: editableContainers.length <= 1 ? "not-allowed" : "pointer",
                                opacity: editableContainers.length <= 1 ? 0.5 : 1
                            }}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    onClick={addRow}
                    style={{
                        padding: "8px",
                        border: "1px dashed #0F766E",
                        borderRadius: "6px",
                        background: "#F0FDFA",
                        color: "#0F766E",
                        fontSize: "13px",
                        fontWeight: 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px"
                    }}
                >
                    <Plus size={14} /> Add Container
                </button>
            </div>
        </div>
    );
  };

  const handleSave = async () => {
    if (!editedExpense) return;

    try {
      // Clean up charges: ensure amounts are numbers
      const cleanedCharges = editedExpense.charges?.map(c => ({
        ...c,
        amount: parseFloat(String(c.amount)) || 0,
        unitPrice: c.unitPrice ? (parseFloat(String(c.unitPrice)) || 0) : 0
      }));

      // Calculate total amount from charges (line items)
      const grandTotal = cleanedCharges 
        ? cleanedCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0) 
        : 0;
      
      // Update the amount field with calculated total
      const expenseToSave = {
        ...editedExpense,
        charges: cleanedCharges,
        amount: grandTotal
      };
      
      console.log('💰 Saving expense with calculated amount:', {
        expenseId: editedExpense.id,
        chargesCount: editedExpense.charges?.length || 0,
        calculatedTotal: grandTotal,
        previousAmount: editedExpense.amount
      });

      const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(expenseToSave),
      });

      if (!response.ok) {
        throw new Error("Failed to update expense");
      }

      const result = await response.json();
      if (result.success && result.data) {
        toast.success("Changes saved successfully");
        setIsEditing(false);
        setRemovedExportCategories([]);
        // Refetch expense details to get enriched data (company names, etc.)
        await fetchExpenseDetails();
      } else {
        toast.error("Failed to update expense");
      }
    } catch (error) {
      console.error("Error updating expense:", error);
      toast.error("Failed to update expense");
    }
  };

  const handleSaveBillingAmount = async () => {
    if (!expense) return;
    
    // Parse the total amount from the input
    const billingAmount = parseFloat(totalInput);
    if (isNaN(billingAmount)) {
      toast.error("Invalid billing amount");
      return;
    }

    try {
      console.log('💰 Saving billing amount:', {
        expenseId: expense.id,
        billingAmount: billingAmount
      });

      const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ billing_amount: billingAmount }),
      });

      if (!response.ok) {
        throw new Error("Failed to update billing amount");
      }

      const result = await response.json();
      if (result.success && result.data) {
        toast.success("Billing amount saved successfully");
        setShowBillingCalculator(false); // Close calculator on success
        await fetchExpenseDetails();
      } else {
        toast.error("Failed to update billing amount");
      }
    } catch (error) {
      console.error("Error updating billing amount:", error);
      toast.error("Failed to update billing amount");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!expense) return;

    try {
      console.log(`🔄 Updating expense status from ${expense.status} to ${newStatus}`);
      
      const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      const result = await response.json();
      if (result.success && result.data) {
        toast.success(`Status updated to ${newStatus}`);
        setShowStatusDropdown(false);
        // Refetch expense details
        await fetchExpenseDetails();
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedExpense(expense);
    setRemovedExportCategories([]);
  };

  const handleDeleteExpense = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${publicAnonKey}`
        }
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || "Failed to delete expense");
        setShowDeleteConfirm(false);
        return;
      }

      toast.success("Expense deleted successfully");
      console.log("Expense deleted successfully");
      setShowDeleteConfirm(false);
      if (onDeleted) onDeleted(); // Refresh the list
      if (onBack) onBack(); // Go back to list view
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("An error occurred while deleting the expense");
      setShowDeleteConfirm(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const [month, day, year] = parts;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString("en-US", { 
            month: "long", 
            day: "numeric", 
            year: "numeric" 
          });
        }
      }
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return date.toLocaleDateString("en-US", { 
      month: "long", 
      day: "numeric", 
      year: "numeric" 
    });
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const groupChargesByCategory = (charges: LineItem[]) => {
    const grouped: { [key: string]: LineItem[] } = {};
    charges.forEach(charge => {
      if (!grouped[charge.category]) {
        grouped[charge.category] = [];
      }
      grouped[charge.category].push(charge);
    });
    return grouped;
  };

  const calculateCategoryTotal = (items: LineItem[]) => {
    return items.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);
  };

  const handleUpdateLineItem = (categoryName: string, itemIndex: number, field: keyof LineItem, value: any) => {
    if (!editedExpense?.charges) return;
    
    const updatedCharges = [...editedExpense.charges];
    const chargeIndex = updatedCharges.findIndex((charge, idx) => {
      const grouped = groupChargesByCategory(updatedCharges.slice(0, idx + 1));
      return charge.category === categoryName && grouped[categoryName] && grouped[categoryName].length - 1 === itemIndex;
    });
    
    if (chargeIndex !== -1) {
      updatedCharges[chargeIndex] = {
        ...updatedCharges[chargeIndex],
        [field]: value
      };
      setEditedExpense({ ...editedExpense, charges: updatedCharges });
    }
  };

  // Add export suggested item (pre-filled description)
  const handleAddExportSuggestedLineItem = (categoryName: string, label: string) => {
    if (!editedExpense) return;
    const newItem: LineItem = {
      category: categoryName,
      description: label,
      amount: 0,
      unitPrice: 0,
      per: "40",
      currency: editedExpense?.charges?.[0]?.currency || expense?.charges?.[0]?.currency || "PHP",
      voucherNo: ""
    };
    const updatedCharges = [...(editedExpense.charges || []), newItem];
    setEditedExpense({ ...editedExpense, charges: updatedCharges });
    setShowExportAddItemDropdown(null);
  };

  // Add export custom item (blank description)
  const handleAddExportCustomLineItem = (categoryName: string) => {
    if (!editedExpense) return;
    const newItem: LineItem = {
      category: categoryName,
      description: "",
      amount: 0,
      unitPrice: 0,
      per: "40",
      currency: editedExpense?.charges?.[0]?.currency || expense?.charges?.[0]?.currency || "PHP",
      voucherNo: ""
    };
    const updatedCharges = [...(editedExpense.charges || []), newItem];
    setEditedExpense({ ...editedExpense, charges: updatedCharges });
    setShowExportAddItemDropdown(null);
  };

  const handleAddLineItem = (categoryName: string) => {
    if (!editedExpense) return;
    
    const newItem: LineItem = {
      category: categoryName,
      description: "",
      amount: 0,
      unitPrice: 0,
      per: "40",
      currency: editedExpense?.charges?.[0]?.currency || expense?.charges?.[0]?.currency || "PHP",
      voucherNo: ""
    };
    
    const updatedCharges = [...(editedExpense.charges || []), newItem];
    setEditedExpense({ ...editedExpense, charges: updatedCharges });
  };

  const handleRemoveLineItem = (categoryName: string, itemIndex: number) => {
    if (!editedExpense?.charges) return;
    
    const groupedCharges = groupChargesByCategory(editedExpense.charges);
    const categoryItems = groupedCharges[categoryName];
    if (!categoryItems || !categoryItems[itemIndex]) return;
    
    const itemToRemove = categoryItems[itemIndex];
    const updatedCharges = editedExpense.charges.filter(charge => charge !== itemToRemove);
    
    setEditedExpense({ ...editedExpense, charges: updatedCharges });
  };

  const EXPORT_AVAILABLE_CATEGORIES = [
    "SHIPPING",
    "CUSTOMS",
    "PORT CHARGES",
    "FORM E",
    "MISCELLANEOUS",
    "TRUCKING",
  ];

  const IMPORT_AVAILABLE_CATEGORIES = [
    "PARTICULARS",
    "ADDITIONAL CHARGES",
  ];

  const handleAddCategory = (categoryName: string) => {
    if (!categoryName || !categoryName.trim()) return;
    
    const isImportTemplate = expense.documentTemplate === "IMPORT";
    const isExportCategory = !isImportTemplate && EXPORT_AVAILABLE_CATEGORIES.includes(categoryName.trim().toUpperCase());

    if (isExportCategory) {
      // For export: just un-remove the category (it renders empty, user adds items via dropdown)
      setRemovedExportCategories(prev => prev.filter(c => c !== categoryName.trim().toUpperCase()));
      setExpandedCategories({ ...expandedCategories, [categoryName.trim().toUpperCase()]: true });
      return;
    }

    const newItem: LineItem = {
      category: categoryName.trim().toUpperCase(),
      description: "",
      amount: 0,
      ...(isImportTemplate ? {} : {
        unitPrice: 0,
        per: "40",
        currency: editedExpense?.charges?.[0]?.currency || expense?.charges?.[0]?.currency || "PHP",
      }),
      voucherNo: ""
    };
    
    const updatedCharges = [...(editedExpense?.charges || []), newItem];
    setEditedExpense({ ...editedExpense!, charges: updatedCharges });
    setExpandedCategories({ ...expandedCategories, [categoryName.trim().toUpperCase()]: true });
  };

  const handleRemoveCategory = (categoryName: string) => {
    if (!editedExpense?.charges) return;

    // For export: track as removed so it disappears from rendering but can be restored
    if (expense.documentTemplate !== "IMPORT" && EXPORT_AVAILABLE_CATEGORIES.includes(categoryName)) {
      setRemovedExportCategories(prev => [...prev, categoryName]);
    }
    
    const updatedCharges = editedExpense.charges.filter(charge => charge.category !== categoryName);
    setEditedExpense({ ...editedExpense, charges: updatedCharges });
    
    const newExpandedCategories = { ...expandedCategories };
    delete newExpandedCategories[categoryName];
    setExpandedCategories(newExpandedCategories);
  };

  const handleUpdateCategoryName = (oldCategoryName: string, newCategoryName: string) => {
    if (!editedExpense?.charges || !newCategoryName.trim()) return;
    
    const updatedCharges = editedExpense.charges.map(charge => 
      charge.category === oldCategoryName 
        ? { ...charge, category: newCategoryName.trim().toUpperCase() }
        : charge
    );
    
    setEditedExpense({ ...editedExpense, charges: updatedCharges });
    
    const newExpandedCategories = { ...expandedCategories };
    if (oldCategoryName in newExpandedCategories) {
      newExpandedCategories[newCategoryName.trim().toUpperCase()] = newExpandedCategories[oldCategoryName];
      delete newExpandedCategories[oldCategoryName];
    }
    setExpandedCategories(newExpandedCategories);
  };

  const handleMainCurrencyChange = (newCurrency: string) => {
    if (!editedExpense?.charges) return;
    const rate = parseFloat(String(editedExpense?.exchangeRate || expense?.exchangeRate || "1")) || 1;
    const contCount = editedExpense.containerNumbers?.length || expense?.containerNumbers?.length || 0;
    
    const updatedCharges = editedExpense.charges.map(charge => {
      const parsedPrice = parseFloat(String(charge.unitPrice)) || 0;
      const currencyMultiplier = (newCurrency === "USD" || newCurrency === "RMB") ? rate : 1;
      const containerMultiplier = (charge.per === "40" || charge.per === "20") ? contCount : 1;
      const newAmount = parsedPrice * currencyMultiplier * containerMultiplier;
      return {
        ...charge,
        currency: newCurrency,
        amount: newAmount
      };
    });
    
    setEditedExpense({ ...editedExpense, charges: updatedCharges });
  };

  const getAvailableCategoriesToAdd = () => {
    if (expense.documentTemplate !== "IMPORT") {
      // For export: available = categories in the removed list
      return removedExportCategories.filter(cat => EXPORT_AVAILABLE_CATEGORIES.includes(cat));
    }
    const existingCategories = Object.keys(chargesByCategory);
    return IMPORT_AVAILABLE_CATEGORIES.filter(cat => !existingCategories.includes(cat));
  };

  const formatCategoryName = (categoryName: string) => {
    if (categoryName === "FORM E") return "Form E";
    if (categoryName === "PORT CHARGES") return "Port Charges";
    if (categoryName === "PARTICULARS") return "Particulars";
    if (categoryName === "ADDITIONAL CHARGES") return "Additional Charges";
    return categoryName.charAt(0) + categoryName.slice(1).toLowerCase();
  };

  if (isLoading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        background: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{ color: "#667085" }}>Loading expense details...</div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        background: "#FFFFFF",
        padding: "32px 48px"
      }}>
        <div style={{ color: "#EF4444" }}>Expense not found</div>
        {onBack && (
          <button onClick={onBack} style={{ marginTop: "16px" }}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Expenses
          </button>
        )}
      </div>
    );
  }

  const displayedExpense = isEditing && editedExpense ? editedExpense : expense;
  const chargesByCategory = displayedExpense.charges ? groupChargesByCategory(displayedExpense.charges) : {};
  
  // Filter categories and line items based on voucher link filter
  const getFilteredChargesByCategory = () => {
    if (voucherLinkFilter === "ALL") {
      return chargesByCategory;
    }

    const filteredCategories: { [key: string]: LineItem[] } = {};

    Object.entries(chargesByCategory).forEach(([categoryName, items]) => {
      const filteredItems = items.filter(item => {
        if (voucherLinkFilter === "LINKED") {
          return hasVoucherLinked(item);
        } else if (voucherLinkFilter === "UNLINKED") {
          return !hasVoucherLinked(item);
        }
        return true;
      });

      // Only include category if it has matching items
      if (filteredItems.length > 0) {
        filteredCategories[categoryName] = filteredItems;
      }
    });

    return filteredCategories;
  };

  const getLinkedVoucherInfo = (item: LineItem) => {
    const linkId = item.sourceVoucherLineItemId || (item as any).source_voucher_line_item_id;
    if (!linkId) return null;
    
    for (const v of vouchers) {
        let lines: any[] = [];
        if (Array.isArray(v.lineItems)) lines = v.lineItems;
        else if (Array.isArray(v.line_items)) lines = v.line_items;
        else if (typeof v.lineItems === 'string') { try { lines = JSON.parse(v.lineItems); } catch(e){} }
        else if (typeof v.line_items === 'string') { try { lines = JSON.parse(v.line_items); } catch(e){} }
        
        const found = lines.find((l: any) => String(l.id) === String(linkId));
        if (found) {
            return {
                voucherNumber: v.voucherNumber,
                description: found.description
            };
        }
    }
    return null;
  };

  const filteredChargesByCategory = getFilteredChargesByCategory();
  
  // Calculate grand total from filtered items only (Excluding Refundable Deposits)
  const grandTotal = Object.entries(filteredChargesByCategory)
    .filter(([category]) => category !== "Refundable Deposits")
    .map(([_, items]) => items)
    .flat()
    .reduce((sum, c) => sum + (parseFloat(String(c.amount)) || 0), 0);

  // Calculate pending amount based on PAID vouchers
  const paidAmount = vouchers
    .filter(v => v.status === "Paid")
    .reduce((sum, v) => sum + (v.amount || 0), 0);
  
  const pendingAmount = 0; // Removed pending amount logic
    
  const containerCount = displayedExpense.containerNumbers?.length || 0;

  const renderCategoryTable = (categoryName: string, items: LineItem[]) => {
    const categoryTotal = calculateCategoryTotal(items);
    const isExpanded = expandedCategories[categoryName] !== false;
    const isRefundCategory = categoryName === "Refundable Deposits" || categoryName === "Container Deposit";
    const isExportTemplate = expense.documentTemplate !== "IMPORT";
    const exchangeRate = parseFloat(String(editedExpense?.exchangeRate || expense?.exchangeRate || "1")) || 1;

    // Helper to compute volume amount for export line items
    const computeVolumeAmount = (unitPrice: number | string, per: string | undefined, currency: string | undefined) => {
      const parsedPrice = parseFloat(String(unitPrice)) || 0;
      const currencyMultiplier = (currency === "USD" || currency === "RMB") ? exchangeRate : 1;
      const containerMultiplier = (per === "40" || per === "20") ? containerCount : 1;
      return parsedPrice * currencyMultiplier * containerMultiplier;
    };

    return (
      <div
        key={categoryName}
        style={{
          borderTop: "1px solid #E5E9F0",
          overflow: "hidden"
        }}
      >
        {/* Category Header */}
        <div
          style={{
            padding: "12px 16px",
            background: "#F9FAFB",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: isExpanded ? "1px solid #E5E9F0" : "none"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {!isRefundCategory && (
              <button
                onClick={() => toggleCategory(categoryName)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center"
                }}
              >
                {isExpanded ? <ChevronDown size={20} color="#667085" /> : <ChevronRight size={20} color="#667085" />}
              </button>
            )}
            {isEditing && !isExportTemplate ? (
              <input
                type="text"
                value={categoryName}
                onChange={(e) => handleUpdateCategoryName(categoryName, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                size={Math.max(categoryName.length, 1)}
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#0A1D4D",
                  textTransform: "uppercase",
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  outline: "none",
                  width: `${Math.max(categoryName.length + 1, 2)}ch`,
                  maxWidth: "200px"
                }}
              />
            ) : (
              <span
                onClick={() => toggleCategory(categoryName)}
                style={{ fontSize: "15px", fontWeight: 600, color: "#0A1D4D", textTransform: "uppercase", cursor: "pointer" }}
              >
                {isExportTemplate ? formatCategoryName(categoryName) : categoryName}
              </span>
            )}
            {!isRefundCategory && (
              <span style={{ fontSize: "14px", color: "#667085" }}>
                ({items.length} item{items.length !== 1 ? 's' : ''})
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {isEditing && (() => {
              const isTrucking = categoryName === "TRUCKING";
              const hasExportSuggestions = isExportTemplate && !isTrucking && !isRefundCategory;
              if (hasExportSuggestions) {
                const availableSuggestions = getAvailableExportSuggestions(categoryName, items.map(i => ({ description: i.description })));
                return (
                  <div ref={showExportAddItemDropdown === categoryName ? exportAddItemRef : undefined} style={{ position: "relative" }}>
                    <button
                      onClick={() => setShowExportAddItemDropdown(prev => prev === categoryName ? null : categoryName)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "4px 10px",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#0F766E",
                        background: "transparent",
                        border: "1px solid #0F766E",
                        borderRadius: "6px",
                        cursor: "pointer",
                        transition: "all 0.15s ease"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(15,118,110,0.05)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <Plus size={12} />
                      Add Item
                      <ChevronDown size={12} />
                    </button>
                    {showExportAddItemDropdown === categoryName && (
                      <div style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        right: 0,
                        background: "white",
                        border: "1px solid #E5E9F0",
                        borderRadius: "8px",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                        zIndex: 50,
                        minWidth: "220px",
                        overflow: "hidden"
                      }}>
                        {availableSuggestions.length > 0 && (
                          <>
                            <div style={{ padding: "6px 12px 4px", fontSize: "11px", fontWeight: 600, color: "#667085", textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
                              Suggested Items
                            </div>
                            {availableSuggestions.map(label => (
                              <button
                                key={label}
                                onClick={() => handleAddExportSuggestedLineItem(categoryName, label)}
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
                          onClick={() => handleAddExportCustomLineItem(categoryName)}
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
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <button
                  onClick={() => handleAddLineItem(categoryName)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 10px",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "#0F766E",
                    background: "transparent",
                    border: "1px solid #0F766E",
                    borderRadius: "6px",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(15,118,110,0.05)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <Plus size={12} />
                  Add Item
                </button>
              );
            })()}
            {isEditing && (
              <button
                onClick={() => handleRemoveCategory(categoryName)}
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
              >
                ✕ Remove
              </button>
            )}
            <div style={{ fontSize: "15px", fontWeight: 600, color: "#0A1D4D", minWidth: "100px", textAlign: "right" }}>
              ₱{formatAmount(categoryTotal)}
            </div>
          </div>
        </div>

        {/* Category Items */}
        {isExpanded && (
          <div style={{ background: "white" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              {expense.documentTemplate === "IMPORT" ? (
                <>
                  <thead>
                    <tr style={{ background: "#FAFAFA", borderBottom: "1px solid #E5E9F0" }}>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600 }}>Particulars</th>
                      <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", color: "#667085", fontWeight: 600, width: "150px" }}>Voucher No</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", color: "#667085", fontWeight: 600, width: "150px" }}>Amount</th>
                      {(isRefundCategory && !isEditing) && (
                        <>
                            <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", color: "#667085", fontWeight: 600, width: "100px" }}>Deduction</th>
                            <th style={{ padding: "12px 24px 12px 16px", textAlign: "center", fontSize: "12px", color: "#667085", fontWeight: 600, width: "180px" }}>Refund Status</th>
                            <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", color: "#667085", fontWeight: 600, width: "40px" }}></th>
                        </>
                      )}
                      {isEditing && <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", color: "#667085", fontWeight: 600, width: "80px" }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const actualIndex = editedExpense?.charges?.findIndex(c => c === item) ?? -1;
                      const voucherNo = item.voucherNo || (item as any).voucherNumber;
                      const isLinked = hasVoucherLinked(item);
                      const linkedInfo = isLinked ? getLinkedVoucherInfo(item) : null;
                      const tooltip = linkedInfo ? `Voucher #: ${linkedInfo.voucherNumber}\nOriginal Item: ${linkedInfo.description}` : undefined;

                      return (
                        <tr key={index} style={{ borderBottom: index < items.length - 1 ? "1px solid #E5E9F0" : "none" }}>
                          <td style={{ padding: "12px 16px", fontSize: "14px", color: "#0A1D4D" }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={item.description || ""}
                                onChange={(e) => {
                                  if (editedExpense?.charges && actualIndex !== -1) {
                                    const updatedCharges = [...editedExpense.charges];
                                    updatedCharges[actualIndex] = { ...updatedCharges[actualIndex], description: e.target.value };
                                    setEditedExpense({ ...editedExpense, charges: updatedCharges });
                                  }
                                }}
                                placeholder="Enter particulars..."
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  fontSize: "14px",
                                  border: "1px solid #E5E9F0",
                                  borderRadius: "4px",
                                  background: "white"
                                }}
                              />
                            ) : (
                              item.description || "—"
                            )}
                          </td>
                          <td 
                            onClick={() => isEditing && setLinkingLineItem(item)}
                            style={{ 
                              padding: "12px 16px", 
                              fontSize: "14px", 
                              color: voucherNo ? "#0F766E" : (isEditing ? "#9CA3AF" : "#667085"), 
                              textAlign: "center", 
                              fontWeight: voucherNo ? 500 : 400, 
                              cursor: isEditing ? "pointer" : (tooltip ? "help" : "default"),
                              transition: "all 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                              if (isEditing) {
                                e.currentTarget.style.background = "#F9FAFB";
                                e.currentTarget.style.color = "#0F766E";
                              } else if (tooltip) {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setHoveredTooltip({
                                  text: tooltip,
                                  x: rect.left + window.scrollX,
                                  y: rect.top + window.scrollY - 10
                                });
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (isEditing) {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = voucherNo ? "#0F766E" : "#9CA3AF";
                              }
                              setHoveredTooltip(null);
                            }}
                          >
                            {voucherNo || (isEditing ? "+ Link" : "—")}
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: "14px", color: "#0A1D4D", textAlign: "right" }}>
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.01"
                                value={item.amount}
                                disabled={isLinked}
                                onChange={(e) => {
                                  if (editedExpense?.charges && actualIndex !== -1) {
                                    const val = e.target.value;
                                    const updatedCharges = [...editedExpense.charges];
                                    updatedCharges[actualIndex] = { 
                                      ...updatedCharges[actualIndex], 
                                      amount: val,
                                      unitPrice: val,
                                      per: "BL"
                                    };
                                    setEditedExpense({ ...editedExpense, charges: updatedCharges });
                                  }
                                }}
                                style={{
                                  width: "100px",
                                  padding: "6px 8px",
                                  fontSize: "14px",
                                  border: "1px solid #E5E9F0",
                                  borderRadius: "4px",
                                  background: isLinked ? "#F3F4F6" : "white",
                                  textAlign: "right",
                                  color: isLinked ? "#6B7280" : "#0A1D4D",
                                  cursor: isLinked ? "not-allowed" : "text"
                                }}
                              />
                            ) : (
                              <>₱{formatAmount(typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount || 0)))}</>
                            )}
                          </td>
                          {(isRefundCategory && !isEditing) && (
                            <>
                                <td style={{ padding: "12px 16px", textAlign: "center", fontSize: "13px", color: "#EF4444", fontWeight: 600 }}>
                                    {(() => {
                                        // Only show deduction if Refunded (refundDateRefunded exists)
                                        if (item.refundDateRefunded) {
                                            const depositVal = typeof item.amount === 'number' ? item.amount : (parseFloat(String(item.amount || 0)) || 0);
                                            const refundVal = typeof item.refundAmount === 'number' ? item.refundAmount : (parseFloat(String(item.refundAmount || 0)) || 0);
                                            const deduction = Math.max(0, depositVal - refundVal);
                                            
                                            // Only show if deduction > 0
                                            if (deduction > 0) {
                                                return `₱${formatAmount(deduction)}`;
                                            }
                                        }
                                        return <span style={{ color: "#9CA3AF" }}>—</span>;
                                    })()}
                                </td>
                                <td style={{ padding: "12px 24px 12px 16px", textAlign: "center" }}>
                                    {(() => {
                                        const status = item.refundDateRefunded 
                                            ? { label: `REFUNDED (${formatDateForDisplay(item.refundDateRefunded)})`, color: "#03543F", bg: "#DEF7EC", border: "1px solid #03543F" }
                                            : item.refundDateSubmitted 
                                                ? { label: "Waiting for Approval", color: "#92400E", bg: "#FFF8F1", border: "1px solid #92400E" }
                                                : { label: "Not Refunded", color: "#344054", bg: "#F3F4F6", border: "1px solid #E5E9F0" };
                                        
                                        return (
                                            <span style={{ 
                                                fontSize: "13px", 
                                                fontWeight: 500, 
                                                color: status.color, 
                                                background: status.bg,
                                                border: status.border,
                                                padding: "4px 12px",
                                                borderRadius: "6px",
                                                whiteSpace: "nowrap",
                                                letterSpacing: "0.2px"
                                            }}>
                                                {status.label}
                                            </span>
                                        );
                                    })()}
                                </td>
                                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                                    <div 
                                      className="group"
                                      data-tooltip="Edit Refund"
                                      onClick={(e) => {
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          // Small hack to ensure tooltip doesn't stick
                                          setHoveredTooltip(null); 
                                          handleOpenRefundPopover(e, item);
                                      }}
                                      onMouseEnter={(e) => {
                                          e.currentTarget.style.backgroundColor = "#F3F4F6";
                                          // Find the icon SVG inside and change its color
                                          const svg = e.currentTarget.querySelector("svg");
                                          if (svg) svg.style.color = "#0F766E";
                                          
                                          // Show tooltip logic (reusing existing tooltip state if simple)
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          setHoveredTooltip({
                                            text: "Edit Refund",
                                            x: rect.left + window.scrollX - 40,
                                            y: rect.top + window.scrollY - 30
                                          });
                                      }}
                                      onMouseLeave={(e) => {
                                          e.currentTarget.style.backgroundColor = "transparent";
                                          const svg = e.currentTarget.querySelector("svg");
                                          if (svg) svg.style.color = "#6B7280";
                                          setHoveredTooltip(null);
                                      }}
                                      style={{
                                          width: "28px",
                                          height: "28px",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          borderRadius: "6px",
                                          cursor: "pointer",
                                          transition: "all 0.2s ease",
                                          marginLeft: "auto"
                                      }}
                                    >
                                        <Pencil size={16} color="#6B7280" style={{ transition: "color 0.2s ease" }} />
                                    </div>
                                </td>
                            </>
                          )}
                          {isEditing && (
                            <td style={{ padding: "12px 16px", textAlign: "center" }}>
                              <button
                                onClick={() => handleRemoveLineItem(categoryName, index)}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  cursor: "pointer",
                                  color: "#EF4444",
                                  padding: "4px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: "4px"
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "#FEE2E2";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "transparent";
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </>
              ) : (
                <>
                  <thead>
                    <tr style={{ background: "#FAFAFA", borderBottom: "1px solid #E5E9F0" }}>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, width: "35%" }}>Particulars</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", color: "#667085", fontWeight: 600 }}>Unit Price</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", color: "#667085", fontWeight: 600, width: "130px" }}>{containerCount}X40'HC</th>
                      <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", color: "#667085", fontWeight: 600, width: "130px" }}>Voucher No</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", color: "#667085", fontWeight: 600, width: "130px" }}>Voucher Amount</th>
                      {isEditing && <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", color: "#667085", fontWeight: 600, width: "80px" }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={isEditing ? 6 : 5} style={{ padding: "16px", textAlign: "center", fontSize: "13px", color: "#667085" }}>
                          No items. Use <span style={{ color: "#0F766E", fontWeight: 500 }}>+ Add Item</span> above to add line items.
                        </td>
                      </tr>
                    )}
                    {items.map((item, index) => {
                      const volumeAmount = computeVolumeAmount(item.unitPrice || 0, item.per, item.currency);
                      const actualIndex = editedExpense?.charges?.findIndex(c => c === item) ?? -1;
                      const voucherNo = item.voucherNo || (item as any).voucherNumber;
                      const isLinked = hasVoucherLinked(item);
                      const linkedInfo = isLinked ? getLinkedVoucherInfo(item) : null;
                      const tooltip = linkedInfo ? `Voucher #: ${linkedInfo.voucherNumber}\nOriginal Item: ${linkedInfo.description}` : undefined;
                      
                      return (
                      <tr key={index} style={{ borderBottom: index < items.length - 1 ? "1px solid #E5E9F0" : "none" }}>
                        {/* Particulars */}
                        <td style={{ padding: "12px 16px", fontSize: "14px", color: "#0A1D4D" }}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={item.description || ""}
                              onChange={(e) => {
                                if (editedExpense?.charges && actualIndex !== -1) {
                                  const updatedCharges = [...editedExpense.charges];
                                  updatedCharges[actualIndex] = { ...updatedCharges[actualIndex], description: e.target.value };
                                  setEditedExpense({ ...editedExpense, charges: updatedCharges });
                                }
                              }}
                              placeholder="Enter particulars..."
                              style={{
                                width: "100%",
                                padding: "6px 8px",
                                fontSize: "14px",
                                border: "1px solid #E5E9F0",
                                borderRadius: "4px",
                                background: "white"
                              }}
                            />
                          ) : (
                            item.description || "—"
                          )}
                        </td>
                        {/* Unit Price (number input + currency dropdown + per selector — all inline) */}
                        <td style={{ padding: "12px 16px", fontSize: "14px", color: "#0A1D4D", textAlign: "right" }}>
                          {isEditing ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", justifyContent: "flex-end" }}>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.unitPrice}
                                  disabled={isLinked}
                                  onChange={(e) => {
                                    if (editedExpense?.charges && actualIndex !== -1) {
                                      const val = e.target.value;
                                      const updatedCharges = [...editedExpense.charges];
                                      const newAmount = computeVolumeAmount(val, updatedCharges[actualIndex].per, updatedCharges[actualIndex].currency);
                                      updatedCharges[actualIndex] = { 
                                        ...updatedCharges[actualIndex], 
                                        unitPrice: val,
                                        amount: newAmount
                                      };
                                      setEditedExpense({ ...editedExpense, charges: updatedCharges });
                                    }
                                  }}
                                  style={{
                                    flex: 1,
                                    minWidth: 0,
                                    padding: "6px 6px",
                                    fontSize: "13px",
                                    border: "1px solid #E5E9F0",
                                    borderRadius: "4px",
                                    background: isLinked ? "#F3F4F6" : "white",
                                    textAlign: "right",
                                    color: isLinked ? "#6B7280" : "#0A1D4D",
                                    cursor: isLinked ? "not-allowed" : "text"
                                  }}
                                />
                                <select
                                  value={item.currency || "PHP"}
                                  onChange={(e) => {
                                    if (editedExpense?.charges && actualIndex !== -1) {
                                      const updatedCharges = [...editedExpense.charges];
                                      const newCurrency = e.target.value;
                                      const newAmount = computeVolumeAmount(updatedCharges[actualIndex].unitPrice || 0, updatedCharges[actualIndex].per, newCurrency);
                                      updatedCharges[actualIndex] = { 
                                        ...updatedCharges[actualIndex], 
                                        currency: newCurrency,
                                        amount: newAmount
                                      };
                                      setEditedExpense({ ...editedExpense, charges: updatedCharges });
                                    }
                                  }}
                                  style={{
                                    width: "62px",
                                    padding: "6px 2px",
                                    fontSize: "11px",
                                    border: "1px solid #E5E9F0",
                                    borderRadius: "4px",
                                    background: "white",
                                    color: "#0A1D4D",
                                    cursor: "pointer"
                                  }}
                                >
                                  <option value="PHP">PHP</option>
                                  <option value="USD">USD</option>
                                  <option value="RMB">RMB</option>
                                </select>
                                <select
                                  value={item.per || "40"}
                                  disabled={isLinked}
                                  onChange={(e) => {
                                    if (editedExpense?.charges && actualIndex !== -1) {
                                      const updatedCharges = [...editedExpense.charges];
                                      const newPer = e.target.value;
                                      const newAmount = computeVolumeAmount(updatedCharges[actualIndex].unitPrice || 0, newPer, updatedCharges[actualIndex].currency);
                                      updatedCharges[actualIndex] = { 
                                        ...updatedCharges[actualIndex], 
                                        per: newPer,
                                        amount: newAmount
                                      };
                                      setEditedExpense({ ...editedExpense, charges: updatedCharges });
                                    }
                                  }}
                                  style={{
                                    width: "72px",
                                    padding: "6px 2px",
                                    fontSize: "11px",
                                    border: "1px solid #E5E9F0",
                                    borderRadius: "4px",
                                    background: isLinked ? "#F3F4F6" : "white",
                                    color: isLinked ? "#6B7280" : "#667085",
                                    cursor: isLinked ? "not-allowed" : "pointer"
                                  }}
                                >
                                  <option value="40">PER 40</option>
                                  <option value="20">PER 20</option>
                                  <option value="BL">PER BL</option>
                                </select>
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: "8px" }}>
                              <span style={{ fontSize: "14px" }}>{item.currency === "USD" ? "$" : item.currency === "RMB" ? "¥" : "₱"}{formatAmount(typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(String(item.unitPrice || 0)))}</span>
                              <span style={{ fontSize: "11px", color: "#667085", fontWeight: 500, whiteSpace: "nowrap" }}>
                                {item.per === "40" ? "PER 40" : item.per === "20" ? "PER 20" : item.per === "BL" ? "PER BL" : "PER 40"}
                              </span>
                            </div>
                          )}
                        </td>
                        {/* Volume (read-only computed) */}
                        <td style={{ 
                          padding: "12px 16px", 
                          fontSize: "14px", 
                          color: "#0A1D4D", 
                          textAlign: "right",
                          background: "#FAFBFC",
                          fontWeight: 500,
                          width: "130px"
                        }}>
                          ₱{formatAmount(volumeAmount)}
                        </td>
                        {/* Voucher No */}
                        <td 
                          onClick={() => isEditing && setLinkingLineItem(item)}
                          style={{ 
                            padding: "12px 16px", 
                            fontSize: "14px", 
                            color: voucherNo ? "#0F766E" : (isEditing ? "#9CA3AF" : "#667085"), 
                            textAlign: "center",
                            background: "#FAFBFC",
                            fontWeight: voucherNo ? 500 : 400,
                            cursor: isEditing ? "pointer" : (tooltip ? "help" : "default"),
                            transition: "all 0.2s ease"
                          }}
                          onMouseEnter={(e) => {
                            if (isEditing) {
                              e.currentTarget.style.background = "#F3F4F6";
                              e.currentTarget.style.color = "#0F766E";
                            } else if (tooltip) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredTooltip({
                                text: tooltip,
                                x: rect.left + window.scrollX,
                                y: rect.top + window.scrollY - 10
                              });
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (isEditing) {
                              e.currentTarget.style.background = "#FAFBFC";
                              e.currentTarget.style.color = voucherNo ? "#0F766E" : "#9CA3AF";
                            }
                            setHoveredTooltip(null);
                          }}
                        >
                          {voucherNo || (isEditing ? "+ Link" : "—")}
                        </td>
                        {/* Voucher Amount */}
                        <td style={{ 
                          padding: "12px 16px", 
                          fontSize: "14px", 
                          color: "#0A1D4D", 
                          textAlign: "right", 
                          fontWeight: voucherNo ? 600 : 400,
                          width: "130px"
                        }}>
                          ₱{formatAmount(parseFloat(String(item.amount)) || 0)}
                        </td>
                        {isEditing && (
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <button
                              onClick={() => handleRemoveLineItem(categoryName, index)}
                              style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: "#EF4444",
                                padding: "4px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: "4px"
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#FEE2E2";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        )}
                      </tr>
                      );
                    })}
                  </tbody>
                </>
              )}
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ 
      background: "#F9FAFB",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflow: "hidden"
    }}>
      <RefundPopover
        referenceElement={refundPopoverState.referenceElement}
        isOpen={refundPopoverState.isOpen}
        onClose={handleCloseRefundPopover}
        onSave={handleSaveRefund}
        initialData={refundPopoverState.initialData}
        depositAmount={refundPopoverState.depositAmount}
      />
      {/* Header */}
      <div style={{
        background: "white",
        borderBottom: "1px solid var(--neuron-ui-border)",
        padding: "20px 48px",
        flexShrink: 0,
        ...(embedded ? { position: "sticky" as const, top: 0, zIndex: 10 } : {})
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Arrow Button — hidden in embedded mode */}
            {!embedded && (<button
              onClick={onBack}
              style={{
                background: "transparent",
                border: "none",
                padding: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                color: "#6B7280",
                borderRadius: "6px"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#F3F4F6"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <ArrowLeft size={20} />
            </button>)}
            
            {/* Title Block */}
            <div>
              <h1 style={{
                fontSize: "20px",
                fontWeight: 600,
                color: "var(--neuron-ink-primary)",
                marginBottom: "0"
              }}>
                {expense.expenseNumber}
              </h1>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                backgroundColor: showTimeline ? "#E8F5F3" : "white",
                border: `1.5px solid ${showTimeline ? "#0F766E" : "#E5E9F0"}`,
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                color: showTimeline ? "#0F766E" : "#667085",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                if (!showTimeline) {
                  e.currentTarget.style.backgroundColor = "#F9FAFB";
                }
              }}
              onMouseLeave={(e) => {
                if (!showTimeline) {
                  e.currentTarget.style.backgroundColor = "white";
                }
              }}
            >
              <Clock size={16} />
              Activity
            </button>

            {!isEditing && (
              <>
                <StandardButton
                  variant="secondary"
                  icon={<Edit3 size={16} />}
                  onClick={() => setIsEditing(true)}
                >
                  Edit Expense
                </StandardButton>

                <ActionsDropdown
                  onDownloadPDF={() => {
                    toast.success("PDF download starting...");
                    // TODO: Implement PDF generation
                  }}
                  onDownloadWord={() => {
                    toast.success("Word download starting...");
                    // TODO: Implement Word generation
                  }}
                  onDelete={() => setShowDeleteConfirm(true)}
                />
              </>
            )}

            {isEditing && (
              <>
                <StandardButton
                  variant="secondary"
                  onClick={handleCancel}
                >
                  Cancel
                </StandardButton>
                <StandardButton
                  variant="primary"
                  onClick={handleSave}
                >
                  Save Changes
                </StandardButton>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Metadata/Summary Bar */}
      {!embedded && (<div style={{
        background: (() => {
          switch (expense.status) {
            case "Draft": return "linear-gradient(135deg, #F3F4F6 0%, #E5E9F0 100%)";
            case "For Approval": return "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)";
            case "Approved": return "linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)";
            case "Paid": return "linear-gradient(135deg, #E8F5E9 0%, #E0F2F1 100%)";
            case "Partially Paid": return "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)";
            case "Rejected": return "linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)";
            default: return "linear-gradient(135deg, #F3F4F6 0%, #E5E9F0 100%)";
          }
        })(),
        borderBottom: "1.5px solid #0F766E",
        padding: "16px 48px",
        display: "flex",
        alignItems: "center",
        gap: "32px",
        flexShrink: 0
      }}>
        {/* Total Amount */}
        <div>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
            Total Amount
          </div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#0A1D4D" }}>
            ₱{formatAmount(grandTotal)}
          </div>
        </div>

        {/* Separator */}
        <div style={{ width: "1px", height: "40px", background: "#0F766E", opacity: 0.2 }} />

        {/* Status - Editable Dropdown */}
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
            Status
          </div>
          
          {/* Status Dropdown Trigger */}
          <div
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            onBlur={() => setTimeout(() => setShowStatusDropdown(false), 200)}
            tabIndex={0}
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: expense.status === "Draft" ? "#6B7280" :
                     expense.status === "Approved" ? "#3B82F6" :
                     expense.status === "Paid" ? "#10B981" :
                     expense.status === "Partially Paid" ? "#F97316" :
                     expense.status === "For Approval" ? "#F59E0B" : 
                     expense.status === "Rejected" ? "#EF4444" : "#667085",
              cursor: "pointer",
              padding: "4px 24px 4px 8px",
              borderRadius: "6px",
              border: "1.5px solid transparent",
              position: "relative",
              transition: "all 0.2s ease",
              background: showStatusDropdown ? "#FFFFFF" : "transparent"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#FFFFFF";
              e.currentTarget.style.borderColor = "#0F766E";
            }}
            onMouseLeave={(e) => {
              if (!showStatusDropdown) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "transparent";
              }
            }}
          >
            {expense.status}
            
            {/* Dropdown Arrow */}
            <div style={{
              position: "absolute",
              right: "6px",
              top: "50%",
              transform: `translateY(-50%) ${showStatusDropdown ? "rotate(180deg)" : "rotate(0deg)"}`,
              transition: "transform 0.2s ease",
              pointerEvents: "none",
              color: "#0F766E"
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Status Dropdown Menu */}
          {showStatusDropdown && (
            <div style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              background: "white",
              border: "1.5px solid #E5E9F0",
              borderRadius: "8px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              zIndex: 50,
              minWidth: "160px",
              overflow: "hidden"
            }}>
              {["Draft", "For Approval", "Approved", "Paid", "Partially Paid", "Rejected"].map((status, index) => (
                <div
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  style={{
                    padding: "10px 14px",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                    borderBottom: index < 5 ? "1px solid #E5E9F0" : "none",
                    background: expense.status === status ? "#F0FDF4" : "white",
                    color: status === "Draft" ? "#6B7280" :
                           status === "Approved" ? "#3B82F6" :
                           status === "Paid" ? "#10B981" :
                           status === "Partially Paid" ? "#F97316" :
                           status === "For Approval" ? "#F59E0B" :
                           status === "Rejected" ? "#EF4444" : "#667085",
                    transition: "background 0.15s ease"
                  }}
                  onMouseEnter={(e) => {
                    if (expense.status !== status) {
                      e.currentTarget.style.background = "#F9FAFB";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = expense.status === status ? "#F0FDF4" : "white";
                  }}
                >
                  {status}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Separator */}
        <div style={{ width: "1px", height: "40px", background: "#0F766E", opacity: 0.2 }} />

        {/* Date Created */}
        <div>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
            Date Created
          </div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D" }}>
            {formatDate(expense.expenseDate)}
          </div>
        </div>
      </div>)}

      {/* Tabs */}
      {!embedded && (
        <StandardTabs
          tabs={[
            { id: "overview", label: "Expenses Overview", icon: <FileText size={18} /> },
            { id: "vouchers", label: "Vouchers", icon: <Receipt size={18} /> },
            { id: "attachments", label: "Attachments", icon: <Paperclip size={18} /> },
          ]}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId as "overview" | "vouchers" | "attachments")}
        />
      )}

      {/* Content */}
      <div style={{ 
        background: "#F9FAFB",
        flex: 1,
        overflow: "auto"
      }}>
        {(embedded || activeTab === "overview") && (
          <div style={{ padding: "32px 48px" }}>
            <div>
          {/* ── Booking Details (unified summary card) ── */}
          <div style={{
            background: "white",
            borderRadius: "12px",
            border: "1px solid #E5E9F0",
            overflow: "hidden",
            marginBottom: "24px",
          }}>
            <div style={{
              padding: "16px 24px",
              borderBottom: "1px solid #E5E9F0",
              background: "#F9FAFB",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>
                Booking Details
              </h3>
            </div>

            <div style={{ padding: "20px 24px" }}>
              {/* BookingSelector — only in edit mode */}
              {isEditing && (
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "6px" }}>Link to Booking</div>
                  <BookingSelector
                    value={getBookingIds(editedExpense)[0] || ""}
                    onSelect={(booking) => {
                      if (!booking) {
                        setEditedExpense(prev => {
                          if (!prev) return prev;
                          return { ...prev, bookingIds: [], linkedBookingIds: [] };
                        });
                        setBookings([]);
                        return;
                      }
                      let updatedWeight = editedExpense?.weight;
                      if (editedExpense?.documentTemplate === "IMPORT" && !updatedWeight) {
                        updatedWeight = (booking as any).weight || (booking as any).grossWeight || (booking as any).gross_weight || "";
                      }
                      setEditedExpense(prev => {
                        if (!prev) return prev;
                        return { ...prev, bookingIds: [booking.id], linkedBookingIds: [booking.id], weight: updatedWeight };
                      });
                      setBookings([booking as any]);
                    }}
                    placeholder="Search by Booking Ref, BL No, or Client..."
                  />
                  {bookings.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 16px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        backgroundColor: "#F0FDF4",
                        color: "#15803D",
                        border: "1px solid #BBF7D0",
                        marginTop: "8px",
                      }}
                    >
                      <Link2 size={14} />
                      Booking linked — fields auto-filled
                    </div>
                  )}
                </div>
              )}

              {/* Read-only summary fields */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Linked Booking */}
                <div>
                  <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>
                    Linked Booking
                  </div>
                  <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>
                    {bookings.length > 0
                      ? (bookings[0].bookingId || bookings[0].bookingNumber || bookings[0].booking_number || "—")
                      : "—"}
                  </div>
                </div>

                {/* Divider */}
                

                {/* IMPORT template fields */}
                {expense.documentTemplate === "IMPORT" && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Consignee</div>
                        <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{expense.shipperConsignee || (bookings.length > 0 ? ((bookings[0] as any).companyName || (bookings[0] as any).company_name || (bookings[0] as any).customerName || (bookings[0] as any).customer_name || "") : "") || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Client</div>
                        <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{expense.client || (bookings.length > 0 ? ((bookings[0] as any).contactPersonName || (bookings[0] as any).contact_person_name || (bookings[0] as any).customerName || (bookings[0] as any).customer_name || "") : "") || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Port of Destination (POD)</div>
                        <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{expense.pod || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Commodity</div>
                        <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{expense.commodity || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>BL Number</div>
                        <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{expense.blNumber || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Container No</div>
                        <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>
                          {(() => {
                            const raw = expense?.containerNumbers;
                            let containers: string[] = [];
                            if (raw) {
                              if (Array.isArray(raw)) containers = raw;
                              else if (typeof raw === 'string') containers = (raw as string).split(',').map(s => s.trim()).filter(Boolean);
                            } else if (expense?.containerNo) {
                              containers = [expense.containerNo];
                            }
                            return containers.length > 0 ? containers.join(", ") : "—";
                          })()}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Weight</div>
                        <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>
                          {expense.weight || (bookings.length > 0 ? (bookings[0] as any).weight || (bookings[0] as any).grossWeight || (bookings[0] as any).gross_weight || "—" : "—")}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Vessel/Voyage</div>
                        <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{expense.vesselVoyage || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Origin</div>
                        <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{expense.origin || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Releasing Date</div>
                        <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{formatDate(expense.releasingDate) || "—"}</div>
                      </div>
                    </div>
                  </>
                )}

                {/* EXPORT template fields */}
                {expense.documentTemplate === "EXPORT" && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Shipper</div>
                        <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{expense.shipperConsignee || (bookings.length > 0 ? ((bookings[0] as any).companyName || (bookings[0] as any).company_name || (bookings[0] as any).customerName || (bookings[0] as any).customer_name || "") : "") || expense.clientShipper || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Client</div>
                        <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{expense.client || (bookings.length > 0 ? ((bookings[0] as any).contactPersonName || (bookings[0] as any).contact_person_name || (bookings[0] as any).customerName || (bookings[0] as any).customer_name || "") : "") || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Vessel/Voyage</div>
                        <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{expense.vesselVoyage || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Destination</div>
                        <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{expense.destination || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Commodity</div>
                        <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{expense.commodity || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>B/L Number</div>
                        <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{expense.blNumber || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Container No</div>
                        <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>
                          {(() => {
                            const raw = expense?.containerNumbers;
                            let containers: string[] = [];
                            if (raw) {
                              if (Array.isArray(raw)) containers = raw;
                              else if (typeof raw === 'string') containers = (raw as string).split(',').map(s => s.trim()).filter(Boolean);
                            } else if (expense?.containerNo) {
                              containers = [expense.containerNo];
                            }
                            return containers.length > 0 ? containers.join(", ") : "—";
                          })()}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Loading Address</div>
                      <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{truckingLoadingAddress || expense.loadingAddress || "—"}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── EXCHANGE RATE (separate section, shown for EXPORT expenses) ── */}
          {expense.documentTemplate === "EXPORT" && (
            <div style={{
              background: "white",
              borderRadius: "12px",
              overflow: "hidden",
              marginBottom: "24px",
              border: "1px solid #E5E9F0",
            }}>
              <div style={{
                padding: "16px 24px",
                borderBottom: "1px solid #E5E9F0",
                background: "#F9FAFB",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>
                  Exchange Rate
                </h3>
              </div>
              <div style={{ padding: "20px 24px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "2px" }}>Exchange Rate</div>
                  <div style={{ fontSize: "13px", color: "#0A1D4D", fontWeight: 500 }}>{expense.exchangeRate || "—"}</div>
                </div>
              </div>
            </div>
          )}

          {/* Unreconciled Voucher Items Table - Show in Edit Mode OR View Mode if items exist */}
          {(isEditing || unreconciledItems.length > 0) && unreconciledItems.length > 0 && (
            <div style={{
              background: "white",
              borderRadius: "12px",
              overflow: "hidden",
              marginBottom: "24px",
              border: "1px solid #F59E0B" // Amber border to highlight attention
            }}>
            <div style={{ padding: "24px" }}>
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#92400E", margin: 0 }}>
                  Unreconciled Voucher Items
                </h3>
                <p style={{ fontSize: "13px", color: "#B45309", margin: "2px 0 0 0" }}>
                  These items exist in linked vouchers but are missing from this expense.
                </p>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #E5E9F0" }}>
                    <th style={{ textAlign: "left", padding: "12px", fontSize: "12px", fontWeight: 600, color: "#667085", textTransform: "uppercase" }}>Particulars</th>
                    <th style={{ textAlign: "left", padding: "12px", fontSize: "12px", fontWeight: 600, color: "#667085", textTransform: "uppercase" }}>Voucher No</th>
                    <th style={{ textAlign: "right", padding: "12px", fontSize: "12px", fontWeight: 600, color: "#667085", textTransform: "uppercase" }}>Amount</th>
                    <th style={{ textAlign: "right", padding: "12px", fontSize: "12px", fontWeight: 600, color: "#667085", textTransform: "uppercase" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {unreconciledItems.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #E5E9F0" }}>
                      <td style={{ padding: "12px", fontSize: "14px", color: "#0A1D4D", fontWeight: 500 }}>
                        {item.description}
                      </td>
                      <td style={{ padding: "12px", fontSize: "14px", color: "#0F766E", fontWeight: 500 }}>
                        {item.voucherNumber}
                      </td>
                      <td style={{ padding: "12px", fontSize: "14px", color: "#0A1D4D", fontWeight: 600, textAlign: "right" }}>
                        ₱{formatAmount(item.amount || 0)}
                      </td>
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => handleAddUnreconciledItem(item, "Particulars")}
                              title="Add to Particulars"
                              style={{
                                padding: "6px 10px",
                                fontSize: "11px",
                                fontWeight: 500,
                                color: "#0F766E",
                                background: "#F0FDFA",
                                border: "1px solid #0F766E",
                                borderRadius: "6px",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                whiteSpace: "nowrap"
                              }}
                            >
                              + Particulars
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddUnreconciledItem(item, "Additional Charges")}
                              title="Add to Additional Charges"
                              style={{
                                padding: "6px 10px",
                                fontSize: "11px",
                                fontWeight: 500,
                                color: "#1F2937",
                                background: "white",
                                border: "1px solid #E5E9F0",
                                borderRadius: "6px",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                whiteSpace: "nowrap"
                              }}
                            >
                              + Add. Charges
                            </button>
                            {expense.documentTemplate === "IMPORT" && (
                            <button
                              type="button"
                              onClick={() => handleAddUnreconciledItem(item, "Refundable Deposits")}
                              title="Add to Refundable Deposits"
                              style={{
                                padding: "6px 10px",
                                fontSize: "11px",
                                fontWeight: 500,
                                color: "#B45309",
                                background: "#FFFBEB",
                                border: "1px solid #FCD34D",
                                borderRadius: "6px",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                whiteSpace: "nowrap"
                              }}
                            >
                              + Refundable
                            </button>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: "13px", color: "#9CA3AF", fontStyle: "italic" }}>
                            Edit to add
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          )}

          {/* Charge Categories & Line Items */}
          {((displayedExpense.charges && displayedExpense.charges.length > 0) || isEditing) && (
            <div style={{
              background: "white",
              borderRadius: "8px",
              border: "1px solid #E5E9F0",
              overflow: "hidden",
              marginBottom: "24px"
            }}>
              <div style={{
                padding: "12px 16px",
                borderBottom: "1px solid #E5E9F0",
                background: "#FAFBFC",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>
                  Charge Categories & Line Items
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {isEditing && expense.documentTemplate !== "IMPORT" && (
                    <>
                      <span style={{ fontSize: "12px", color: "#667085", fontWeight: 500 }}>Set all currencies:</span>
                      {["PHP", "USD", "RMB"].map((cur) => (
                        <button
                          key={cur}
                          type="button"
                          onClick={() => handleMainCurrencyChange(cur)}
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
                  {isEditing && getAvailableCategoriesToAdd().length > 0 && (
                        <div ref={addCategoryDropdownRef} style={{ position: "relative" }}>
                          <button
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
                          {showAddCategoryDropdown && (
                            <div style={{
                              position: "absolute",
                              top: "calc(100% + 4px)",
                              right: 0,
                              background: "white",
                              border: "1px solid #E5E9F0",
                              borderRadius: "8px",
                              boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                              zIndex: 50,
                              minWidth: "260px",
                              overflow: "hidden"
                            }}>
                              <div style={{ padding: "6px 12px 4px", fontSize: "11px", fontWeight: 600, color: "#667085", textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
                                Removed Categories
                              </div>
                              {getAvailableCategoriesToAdd().map((categoryName) => (
                                <button
                                  key={categoryName}
                                  onClick={() => {
                                    handleAddCategory(categoryName);
                                    setShowAddCategoryDropdown(false);
                                  }}
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
                                  {formatCategoryName(categoryName)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                  {!isEditing && expense.documentTemplate !== "IMPORT" && (
                    <div style={{ fontSize: "14px", color: "#667085" }}>
                      {displayedExpense.charges?.[0]?.currency || "PHP"}
                    </div>
                  )}
                </div>
              </div>

              <div>
              {/* Voucher Link Filter - Only show in view mode */}
              {!isEditing && (
                <div style={{ padding: "16px 16px 16px", marginBottom: "0" }}>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "#667085", marginBottom: "8px" }}>
                    Filter by Voucher Status:
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => setVoucherLinkFilter("ALL")}
                      style={{
                        padding: "8px 20px",
                        fontSize: "13px",
                        fontWeight: voucherLinkFilter === "ALL" ? 600 : 500,
                        border: voucherLinkFilter === "ALL" ? "none" : "1px solid #E5E9F0",
                        borderRadius: "999px",
                        background: voucherLinkFilter === "ALL" ? "#0F766E" : "#FFFFFF",
                        color: voucherLinkFilter === "ALL" ? "#FFFFFF" : "#0A1D4D",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      ALL
                    </button>
                    <button
                      onClick={() => setVoucherLinkFilter("LINKED")}
                      style={{
                        padding: "8px 20px",
                        fontSize: "13px",
                        fontWeight: voucherLinkFilter === "LINKED" ? 600 : 500,
                        border: voucherLinkFilter === "LINKED" ? "none" : "1px solid #E5E9F0",
                        borderRadius: "999px",
                        background: voucherLinkFilter === "LINKED" ? "#0F766E" : "#FFFFFF",
                        color: voucherLinkFilter === "LINKED" ? "#FFFFFF" : "#0A1D4D",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      LINKED
                    </button>
                    <button
                      onClick={() => setVoucherLinkFilter("UNLINKED")}
                      style={{
                        padding: "8px 20px",
                        fontSize: "13px",
                        fontWeight: voucherLinkFilter === "UNLINKED" ? 600 : 500,
                        border: voucherLinkFilter === "UNLINKED" ? "none" : "1px solid #E5E9F0",
                        borderRadius: "999px",
                        background: voucherLinkFilter === "UNLINKED" ? "#0F766E" : "#FFFFFF",
                        color: voucherLinkFilter === "UNLINKED" ? "#FFFFFF" : "#0A1D4D",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      UNLINKED
                    </button>
                  </div>
                </div>
              )}

              {expense.documentTemplate !== "IMPORT"
                ? /* EXPORT: Render categories in fixed order, then any extras */
                  (() => {
                    const fixedOrder = isEditing
                      ? EXPORT_AVAILABLE_CATEGORIES.filter(cat => !removedExportCategories.includes(cat))
                      : EXPORT_AVAILABLE_CATEGORIES.filter(cat => filteredChargesByCategory[cat] && filteredChargesByCategory[cat].length > 0);
                    const extraCategories = Object.keys(filteredChargesByCategory)
                      .filter(cat => cat !== "Refundable Deposits" && !EXPORT_AVAILABLE_CATEGORIES.includes(cat));
                    return [...fixedOrder, ...extraCategories].map(cat =>
                      renderCategoryTable(cat, filteredChargesByCategory[cat] || [])
                    );
                  })()
                : /* IMPORT: Render categories as-is, excluding Refundable Deposits */
                  Object.entries(filteredChargesByCategory)
                    .filter(([categoryName]) => categoryName !== "Refundable Deposits")
                    .map(([categoryName, items]) => renderCategoryTable(categoryName, items))
              }

              {/* Grand Total — integrated footer */}
              <div style={{
                padding: "14px 16px",
                background: "#FAFBFC",
                borderTop: "2px solid #E5E9F0",
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}>
                  <div>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#0A1D4D", textTransform: "uppercase" as const, letterSpacing: "0.03em" }}>Total</span>
                    {expense.documentTemplate === "IMPORT" && (
                      <div style={{ fontSize: "11px", fontWeight: 400, color: "#667085", marginTop: "2px" }}>(Excludes Refundable Deposits)</div>
                    )}
                  </div>
                  <span style={{ fontSize: "18px", fontWeight: 700, color: "#0A1D4D" }}>
                    ₱{formatAmount(grandTotal)}
                  </span>
                </div>
                
                {/* Billing Amount Display */}
                {displayedExpense.billing_amount !== undefined && displayedExpense.billing_amount !== null && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "8px",
                    paddingTop: "8px",
                    borderTop: "1px solid #E5E9F0"
                  }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#0F766E" }}>
                      Amount for Billing
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "16px", fontWeight: 700, color: "#0F766E" }}>
                        ₱{formatAmount(displayedExpense.billing_amount || 0)}
                      </span>
                      {isEditing && (
                        <button
                          onClick={() => {
                            const currentBilling = displayedExpense.billing_amount || 0;
                            const currentMargin = currentBilling - grandTotal;
                            
                            setShowBillingCalculator(true);
                            setTotalInput(currentBilling.toFixed(2));
                            setMarginInput(currentMargin.toFixed(2));
                            setPercentInput(grandTotal > 0 ? ((currentMargin / grandTotal) * 100).toFixed(2) : "0.00");
                            setBillingCalcMode("total");
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "#0F766E",
                            padding: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "4px"
                          }}
                          title="Edit Amount for Billing"
                        >
                          <Edit3 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Create Amount for Billing Link - Only show if NO billing amount exists */}
              {!showBillingCalculator && !displayedExpense.billing_amount && (
                <div style={{ padding: "14px 16px", textAlign: "center", background: "#FAFBFC", borderTop: "1px solid #E5E9F0" }}>
                  <button
                    onClick={() => {
                      setShowBillingCalculator(true);
                      setTotalInput(grandTotal.toFixed(2));
                      setMarginInput("0.00");
                      setPercentInput("0.00");
                      setBillingCalcMode("margin");
                    }}
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#0F766E",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textDecoration: "underline"
                    }}
                  >
                    Create Amount for Billing
                  </button>
                </div>
              )}

              {/* Billing Calculator Panel */}
              {showBillingCalculator && (
                <div style={{
                  margin: "16px",
                  padding: "20px",
                  backgroundColor: "#F0FDFA", // Light teal bg
                  border: "1px solid #0F766E",
                  borderRadius: "8px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", alignItems: "center" }}>
                    <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#0A1D4D", textTransform: "uppercase", margin: 0 }}>
                      Billing Calculator
                    </h4>
                    <button 
                      onClick={() => setShowBillingCalculator(false)}
                      style={{ color: "#667085", background: "none", border: "none", cursor: "pointer", padding: "4px" }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                    {/* Margin Amount */}
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#667085", marginBottom: "4px" }}>
                        Margin Amount
                      </label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: "10px", top: "9px", fontSize: "14px", color: "#667085" }}>
                          {displayedExpense.charges?.[0]?.currency || "PHP"}
                        </span>
                        <input
                          type="number"
                          value={marginInput}
                          placeholder="0.00"
                          onChange={(e) => {
                            const val = e.target.value;
                            setMarginInput(val);
                            setBillingCalcMode("margin");
                            
                            const numVal = parseFloat(val);
                            if (!isNaN(numVal)) {
                              const newTotal = grandTotal + numVal;
                              setTotalInput(newTotal.toFixed(2));
                              setPercentInput(grandTotal > 0 ? ((numVal / grandTotal) * 100).toFixed(2) : "0.00");
                            } else {
                                // If margin is cleared, total resets to base, percent to 0
                                // But we only reset the OTHER fields, not the one being typed in
                                setTotalInput(grandTotal.toFixed(2));
                                setPercentInput("0.00");
                            }
                          }}
                          style={{
                            width: "100%",
                            padding: "8px 12px 8px 45px",
                            border: billingCalcMode === "margin" ? "2px solid #0F766E" : "1px solid #E5E9F0",
                            borderRadius: "6px",
                            outline: "none",
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "#0A1D4D",
                            backgroundColor: "white"
                          }}
                        />
                      </div>
                    </div>

                    {/* % Margin */}
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#667085", marginBottom: "4px" }}>
                        % Margin
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type="number"
                          value={percentInput}
                          placeholder="0.00"
                          onChange={(e) => {
                            const val = e.target.value;
                            setPercentInput(val);
                            setBillingCalcMode("percent");
                            
                            const numVal = parseFloat(val);
                            if (!isNaN(numVal)) {
                              const margin = grandTotal * (numVal / 100);
                              setMarginInput(margin.toFixed(2));
                              setTotalInput((grandTotal + margin).toFixed(2));
                            } else {
                              setMarginInput("0.00");
                              setTotalInput(grandTotal.toFixed(2));
                            }
                          }}
                          style={{
                            width: "100%",
                            padding: "8px 30px 8px 12px",
                            border: billingCalcMode === "percent" ? "2px solid #0F766E" : "1px solid #E5E9F0",
                            borderRadius: "6px",
                            outline: "none",
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "#0A1D4D",
                            backgroundColor: "white"
                          }}
                        />
                        <span style={{ position: "absolute", right: "10px", top: "9px", fontSize: "14px", color: "#667085" }}>
                          %
                        </span>
                      </div>
                    </div>

                    {/* Total Amount */}
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#667085", marginBottom: "4px" }}>
                        Total Amount
                      </label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: "10px", top: "9px", fontSize: "14px", color: "#667085" }}>
                          {displayedExpense.charges?.[0]?.currency || "PHP"}
                        </span>
                        <input
                          type="number"
                          value={totalInput}
                          placeholder="0.00"
                          onChange={(e) => {
                            const val = e.target.value;
                            setTotalInput(val);
                            setBillingCalcMode("total");
                            
                            const numVal = parseFloat(val);
                            if (!isNaN(numVal)) {
                              const margin = numVal - grandTotal;
                              setMarginInput(margin.toFixed(2));
                              setPercentInput(grandTotal > 0 ? ((margin / grandTotal) * 100).toFixed(2) : "0.00");
                            } else {
                              setMarginInput("0.00");
                              setPercentInput("0.00");
                            }
                          }}
                          style={{
                            width: "100%",
                            padding: "8px 12px 8px 45px",
                            border: billingCalcMode === "total" ? "2px solid #0F766E" : "1px solid #E5E9F0",
                            borderRadius: "6px",
                            outline: "none",
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "#0A1D4D",
                            backgroundColor: "white"
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Save Button */}
                  <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={handleSaveBillingAmount}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        backgroundColor: "#0F766E",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        padding: "8px 16px",
                        fontSize: "14px",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#115E59"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#0F766E"}
                    >
                      <Save size={16} />
                      Save as Amount for Billing
                    </button>
                  </div>
                </div>
              )}

            </div>
            </div>
          )}

          {/* Refundable Deposits — separate standalone section below (Import only) */}
          {expense.documentTemplate === "IMPORT" &&
            ((displayedExpense.charges && displayedExpense.charges.length > 0) || isEditing) &&
            filteredChargesByCategory["Refundable Deposits"] && filteredChargesByCategory["Refundable Deposits"].filter(item => parseFloat(String(item.amount)) !== 0).length > 0 && (
            <div style={{
              background: "white",
              borderRadius: "8px",
              border: "1px solid #E5E9F0",
              overflow: "hidden",
              marginBottom: "24px"
            }}>
              {renderCategoryTable("Refundable Deposits", filteredChargesByCategory["Refundable Deposits"].filter(item => parseFloat(String(item.amount)) !== 0))}
            </div>
          )}

            {/* Notes Section */}
            <NotesSection
              value={(displayedExpense as any).notes || ""}
              onChange={(val) => editedExpense && setEditedExpense({ ...editedExpense, notes: val } as any)}
              disabled={!isEditing}
            />

            </div>
          </div>
        )}

        {!embedded && activeTab === "vouchers" && expense && (
          <VouchersTab
            expenseId={expenseId}
            expenseNumber={expense.expenseNumber}
            totalAmount={grandTotal}
            currency={displayedExpense.charges?.[0]?.currency || "PHP"}
            vouchers={vouchers}
            onUpdate={fetchExpenseDetails}
          />
        )}

        {!embedded && activeTab === "attachments" && expense && (
          <AttachmentsTab
            entityType="expense"
            entityId={expenseId}
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "32px",
              maxWidth: "480px",
              width: "90%",
              border: "1px solid #E5E9F0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#0A1D4D",
              marginBottom: "12px",
            }}>
              Delete Expense
            </h3>
            <p style={{
              fontSize: "14px",
              color: "#667085",
              marginBottom: "24px",
              lineHeight: "1.5",
            }}>
              Are you sure you want to delete this expense ({expense?.expenseNumber})? This action cannot be undone.
            </p>
            <div style={{
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end",
            }}>
              <StandardButton
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </StandardButton>
              <StandardButton
                variant="danger"
                onClick={handleDeleteExpense}
              >
                Delete Expense
              </StandardButton>
            </div>
          </div>
        </div>
      )}

      {/* Voucher Selection Modal */}
      {linkingLineItem && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }} 
          onClick={() => setLinkingLineItem(null)}
        >
          <div 
            style={{
              background: "white",
              borderRadius: "12px",
              width: "500px",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
            }} 
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: "16px", borderBottom: "1px solid #E5E9F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0A1D4D", margin: 0 }}>Select Voucher Item</h3>
              <button 
                onClick={() => setLinkingLineItem(null)} 
                style={{ background: "none", border: "none", cursor: "pointer", color: "#667085", display: "flex", alignItems: "center" }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: "16px", overflowY: "auto" }}>
              {hasVoucherLinked(linkingLineItem) && (
                <div style={{ marginBottom: "16px", padding: "12px", background: "#F3F4F6", borderRadius: "8px", border: "1px solid #E5E9F0" }}>
                  <div style={{ fontSize: "13px", color: "#667085", marginBottom: "4px" }}>Currently Linked:</div>
                  <div style={{ fontWeight: 600, color: "#0F766E" }}>
                     {linkingLineItem.voucherNo || getLinkedVoucherInfo(linkingLineItem)?.voucherNumber}
                  </div>
                  <button 
                    onClick={handleUnlinkVoucherItem}
                    style={{
                      marginTop: "8px",
                      width: "100%",
                      padding: "8px",
                      background: "white",
                      border: "1px solid #EF4444",
                      color: "#EF4444",
                      borderRadius: "6px",
                      fontWeight: 500,
                      fontSize: "13px",
                      cursor: "pointer"
                    }}
                  >
                    Unlink / Remove Connection
                  </button>
                </div>
              )}

              <div style={{ fontSize: "13px", fontWeight: 600, color: "#667085", marginBottom: "8px", textTransform: "uppercase" }}>Available Items</div>
              
              {unreconciledItems.length === 0 ? (
                <div style={{ padding: "24px", textAlign: "center", color: "#667085", fontSize: "14px", background: "#F9FAFB", borderRadius: "8px" }}>
                  No available voucher items found.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {unreconciledItems.map(item => (
                     <button
                       key={item.id}
                       onClick={() => handleLinkVoucherItem(item)}
                       style={{
                         display: "flex",
                         justifyContent: "space-between",
                         alignItems: "center",
                         padding: "12px",
                         background: "white",
                         border: "1px solid #E5E9F0",
                         borderRadius: "8px",
                         cursor: "pointer",
                         textAlign: "left",
                         transition: "all 0.2s ease"
                       }}
                       onMouseEnter={e => { e.currentTarget.style.borderColor = "#0F766E"; e.currentTarget.style.background = "#F0FDFA"; }}
                       onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E9F0"; e.currentTarget.style.background = "white"; }}
                     >
                       <div>
                         <div style={{ fontSize: "14px", fontWeight: 500, color: "#0A1D4D" }}>{item.description}</div>
                         <div style={{ fontSize: "12px", color: "#667085", marginTop: "2px" }}>
                           <span style={{ background: "#F3F4F6", padding: "2px 6px", borderRadius: "4px", marginRight: "6px" }}>{item.voucherNumber}</span>
                         </div>
                       </div>
                       <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F766E" }}>
                         ₱{formatAmount(item.amount || 0)}
                       </div>
                     </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Tooltip */}
      {hoveredTooltip && (
        <div style={{
          position: "absolute", // Changed to absolute if parent is relative, but fixed is safer for coordinates relative to window
          left: hoveredTooltip.x,
          top: hoveredTooltip.y,
          transform: "translate(-50%, -100%)",
          background: "#1F2937",
          color: "white",
          padding: "8px 12px",
          borderRadius: "6px",
          fontSize: "12px",
          pointerEvents: "none",
          whiteSpace: "pre-line",
          zIndex: 9999,
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
          maxWidth: "300px"
        }}>
          {hoveredTooltip.text}
          {/* Arrow */}
          <div style={{
            position: "absolute",
            bottom: "-4px",
            left: "50%",
            transform: "translateX(-50%) rotate(45deg)",
            width: "8px",
            height: "8px",
            background: "#1F2937"
          }} />
        </div>
      )}
    </div>
  );
}
