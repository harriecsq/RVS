import { useState, useEffect } from "react";
import { Plus, Search, DollarSign, Clock, CheckCircle, XCircle } from "lucide-react";
import { formatAmount } from "../../utils/formatAmount";
import { NeuronStatusPill } from "../NeuronStatusPill";
import { CreateCollectionPanel } from "./CreateCollectionPanel";
import { ViewCollectionScreen } from "./ViewCollectionScreen";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "../ui/toast-utils";
import { UnifiedDateRangeFilter } from "../shared/UnifiedDateRangeFilter";
import { API_BASE_URL } from '@/utils/api-config';

interface CollectionsScreenProps {
  currentUser?: { name: string; email: string; department: string } | null;
}

type CollectionStatus = "Draft" | "For Approval" | "Approved" | "Collected" | "Cancelled";

interface Collection {
  id: string;
  collectionNumber: string;
  customerName: string;
  billingNumber?: string;
  projectNumber?: string;
  amount: number;
  collectionDate: string;
  paymentMethod?: string;
  referenceNumber?: string;  // Payment Details
  notes?: string;            // Payment Details
  bankName?: string;         // Payment Details (Bank Transfer)
  checkNumber?: string;      // Payment Details (Check)
  status: CollectionStatus;
  createdAt: string;
  allocations?: any[];       // New field
}

function TabButton({ 
  icon, 
  label, 
  count, 
  isActive, 
  color, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  count: number; 
  isActive: boolean; 
  color: string; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "12px 20px",
        border: "none",
        borderBottom: isActive ? `2px solid ${color}` : "2px solid transparent",
        background: "transparent",
        color: isActive ? color : "#667085",
        fontWeight: isActive ? 600 : 500,
        fontSize: "14px",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      {icon}
      <span>{label}</span>
      <span
        style={{
          padding: "2px 8px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: 600,
          backgroundColor: isActive ? `${color}15` : "#F3F4F6",
          color: isActive ? color : "#667085",
        }}
      >
        {count}
      </span>
    </button>
  );
}

export function CollectionsScreen({ currentUser }: CollectionsScreenProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<CollectionStatus | "all">("all");
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "collected" | "partial">("all");
  const [dateFilterStart, setDateFilterStart] = useState("");
  const [dateFilterEnd, setDateFilterEnd] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");

  useEffect(() => {
    // Fetch collections from backend
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/collections`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        setCollections(result.data);
      } else {
        setCollections([]);
      }
    } catch (error) {
      console.error("Error fetching collections:", error);
      setCollections([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewCollection = (collectionId: string) => {
    setSelectedCollectionId(collectionId);
  };

  const handleBackToList = () => {
    setSelectedCollectionId(null);
    fetchCollections();
  };

  // Get unique payment methods
  const uniquePaymentMethods = Array.from(new Set(collections.map(c => c.paymentMethod).filter(Boolean)));

  // Filter collections by tab first
  const getFilteredByTab = () => {
    let filtered = collections;

    if (activeTab === "pending") {
      filtered = collections.filter(c => c.status === "Pending");
    } else if (activeTab === "collected") {
      filtered = collections.filter(c => c.status === "Collected");
    } else if (activeTab === "partial") {
      filtered = collections.filter(c => c.status === "Partial");
    }

    return filtered;
  };

  // Apply all filters
  const filteredCollections = getFilteredByTab().filter(collection => {
    // Search filter
    const matchesSearch = 
      (collection.collectionNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (collection.customerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (collection.billingNumber && collection.billingNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (collection.projectNumber && collection.projectNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;

    // Time period filter
    if (dateFilterStart || dateFilterEnd) {
      const collectionDate = new Date(collection.collectionDate || collection.createdAt);
      const collectionISO = collectionDate.toISOString().split("T")[0];
      if (dateFilterStart && collectionISO < dateFilterStart) return false;
      if (dateFilterEnd && collectionISO > dateFilterEnd) return false;
    }

    // Status filter
    const matchesStatus = statusFilter === "all" || collection.status === statusFilter;
    if (!matchesStatus) return false;

    // Payment method filter
    if (paymentMethodFilter !== "all" && collection.paymentMethod !== paymentMethodFilter) return false;

    return true;
  });

  // Calculate counts for tabs
  const allCount = collections.length;
  const pendingCount = collections.filter(c => c.status === "Pending").length;
  const collectedCount = collections.filter(c => c.status === "Collected").length;
  const partialCount = collections.filter(c => c.status === "Partial").length;

  // Show view screen if a collection is selected
  if (selectedCollectionId) {
    const selectedCollection = collections.find(c => c.id === selectedCollectionId);
    if (selectedCollection) {
      return (
        <ViewCollectionScreen
          collection={selectedCollection}
          onBack={handleBackToList}
        />
      );
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
      {/* Header */}
      <div style={{ padding: "32px 48px 24px 48px" }}>
        <div style={{ 
          display: "flex", 
          alignItems: "start", 
          justifyContent: "space-between", 
          marginBottom: "24px" 
        }}>
          <div>
            <h1 style={{ 
              fontSize: "32px", 
              fontWeight: 600, 
              color: "#0A1D4D", 
              marginBottom: "4px",
              letterSpacing: "-1.2px"
            }}>
              Collections
            </h1>
            <p style={{ 
              fontSize: "14px", 
              color: "#667085"
            }}>
              Track customer payments and receipts
            </p>
          </div>
          
          {/* Action Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 600,
              border: "none",
              borderRadius: "8px",
              background: "#0F766E",
              color: "white",
              cursor: "pointer",
            }}
          >
            <Plus className="w-4 h-4" />
            New Collection
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ position: "relative", marginBottom: "24px" }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#667085",
            }}
          />
          <input
            type="text"
            placeholder="Search by Collection Number, Customer, Billing, or Project Number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px 10px 40px",
              border: "1px solid #E5E9F0",
              borderRadius: "8px",
              fontSize: "14px",
              outline: "none",
              color: "#0A1D4D",
              backgroundColor: "#FFFFFF",
            }}
          />
        </div>

        {/* Filter Row */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 
          gap: "12px",
          marginBottom: "24px"
        }}>
          {/* Time Period Filter */}
          <div style={{ gridColumn: "span 2" }}>
            <UnifiedDateRangeFilter
              startDate={dateFilterStart}
              endDate={dateFilterEnd}
              onStartDateChange={setDateFilterStart}
              onEndDateChange={setDateFilterEnd}
              compact
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CollectionStatus | "all")}
            style={{
              padding: "10px 12px",
              border: "1px solid #E5E9F0",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#0A1D4D",
              backgroundColor: "#FFFFFF",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="For Approval">For Approval</option>
            <option value="Approved">Approved</option>
            <option value="Collected">Collected</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Payment Method Filter */}
          <select
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            style={{
              padding: "10px 12px",
              border: "1px solid #E5E9F0",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#0A1D4D",
              backgroundColor: "#FFFFFF",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All Payment Methods</option>
            {uniquePaymentMethods.map(method => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        
      </div>

      {/* Table */}
      <div style={{ padding: "0 48px 48px 48px" }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-[#0A1D4D]/60">Loading collections...</div>
          </div>
        ) : filteredCollections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="text-[#0A1D4D]/60 mb-2">
              {searchTerm || statusFilter !== "all" 
                ? "No collections match your filters" 
                : "No collections yet"}
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-[#0F766E] hover:underline"
            >
              Record your first collection
            </button>
          </div>
        ) : (
          <div style={{
            border: "1px solid #E5E9F0",
            borderRadius: "12px",
            overflow: "hidden",
            backgroundColor: "#FFFFFF"
          }}>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#0A1D4D]/10">
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Collection Details
                  </th>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Payment Method
                  </th>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Linked Billing
                  </th>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-[#667085] font-semibold text-xs uppercase tracking-wide">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCollections.map((collection) => {
                  // Build linked billing IDs from allocations or legacy single billing
                  const linkedBillingNumbers: string[] = [];
                  if (collection.allocations && collection.allocations.length > 0) {
                    collection.allocations.forEach((a: any) => {
                      if (a.billingNumber) linkedBillingNumbers.push(a.billingNumber);
                    });
                  } else if (collection.billingNumber) {
                    linkedBillingNumbers.push(collection.billingNumber);
                  }

                  // Compute amount from allocations (auto-updated total)
                  const computedAmount = collection.allocations && collection.allocations.length > 0
                    ? collection.allocations.reduce((sum: number, a: any) => sum + (a.amount || 0), 0)
                    : collection.amount;

                  return (
                  <tr
                    key={collection.id}
                    className="border-b border-[#0A1D4D]/5 hover:bg-[#0F766E]/5 transition-colors cursor-pointer"
                    onClick={() => handleViewCollection(collection.id)}
                  >
                    <td className="py-4 px-4">
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        
                        <div>
                          <div style={{ 
                            fontSize: "14px", 
                            fontWeight: 600, 
                            color: "#0A1D4D",
                            marginBottom: "2px"
                          }}>
                            {collection.collectionNumber}
                          </div>
                          {collection.customerName && (
                            <div style={{ 
                              fontSize: "13px", 
                              color: "#667085"
                            }}>
                              {collection.customerName}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div style={{ fontSize: "14px", color: "#0A1D4D" }}>
                        {"\u20B1"}{formatAmount(computedAmount)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div style={{ fontSize: "14px", color: "#0A1D4D" }}>
                        {collection.paymentMethod || "\u2014"}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {linkedBillingNumbers.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {linkedBillingNumbers.map((bn, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: "13px",
                                fontWeight: 500,
                                color: "#0F766E",
                                display: "inline-block",
                                width: "fit-content",
                              }}
                            >
                              {bn}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: "14px", color: "#9CA3AF" }}>{"\u2014"}</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <NeuronStatusPill status={collection.status} />
                    </td>
                    <td className="py-4 px-4">
                      <div style={{ fontSize: "13px", color: "#0A1D4D" }}>
                        {collection.collectionDate ? new Date(collection.collectionDate).toLocaleDateString() : new Date(collection.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Collection Side Panel */}
      <CreateCollectionPanel
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          fetchCollections();
        }}
      />
    </div>
  );
}