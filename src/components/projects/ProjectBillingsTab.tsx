import { useState, useEffect } from "react";
import { Plus, FileText, Receipt, Calendar } from "lucide-react";
import type { Project } from "../../types/pricing";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { CreateBillingSidePanel } from "../accounting/CreateBillingSidePanel";
import { BillingDetailPanel } from "../accounting/BillingDetailPanel";
import { NeuronStatusPill } from "../NeuronStatusPill";
import { StandardLoadingState } from "../design-system/StandardLoadingState";
import { StandardEmptyState } from "../design-system/StandardEmptyState";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8`;

interface Billing {
  id?: string;
  billingId?: string;
  billingNumber?: string;
  amount: number;
  currency?: string;
  status: string;
  dueDate?: string;
  createdAt?: string;
  created_at?: string;
  billing_type?: string;
  clientName?: string;
  voucherNumber?: string;
  pendingAmount?: number;
}

interface ProjectBillingsTabProps {
  project: Project;
  currentUser?: {
    id: string;
    name: string;
    email: string;
    department: string;
  } | null;
  onUpdate: () => void;
}

export function ProjectBillingsTab({ project, currentUser, onUpdate }: ProjectBillingsTabProps) {
  const [billings, setBillings] = useState<Billing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBillingId, setSelectedBillingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBillings();
  }, [project.id]);

  const fetchBillings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/billings?projectId=${project.id}`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setBillings(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching billings:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = "PHP") => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleViewBilling = (billingId: string) => {
    setSelectedBillingId(billingId);
  };

  const filteredBillings = statusFilter === "all" 
    ? billings 
    : billings.filter(b => b.status?.toLowerCase() === statusFilter.toLowerCase());

  // Use individual billing amounts for table, but project.balance for summary
  const totalBilled = project.totalBilled || filteredBillings.reduce((sum, billing) => sum + (billing.amount || 0), 0);
  const totalCollected = project.totalCollections || 0;
  const outstandingAmount = project.balance || (totalBilled - totalCollected);

  return (
    <div style={{ padding: "32px 48px" }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "flex-start",
        marginBottom: "32px",
        paddingBottom: "24px",
        borderBottom: "1px solid #E5E9F0"
      }}>
        <div>
          <h2 style={{ 
            fontSize: "20px", 
            fontWeight: 600, 
            color: "#12332B", 
            margin: "0 0 8px 0",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <FileText size={20} />
            Project Billings
          </h2>
          <p style={{ fontSize: "13px", color: "var(--neuron-ink-muted)", margin: 0 }}>
            All billings for {project.project_name} • {filteredBillings.length} billing{filteredBillings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            background: "#0F766E",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <Plus size={18} />
          Create Billing
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(2, 1fr)", 
        gap: "16px",
        marginBottom: "24px"
      }}>
        <div style={{
          padding: "20px",
          background: "white",
          border: "1px solid #E5E9F0",
          borderRadius: "12px"
        }}>
          <div style={{ fontSize: "13px", color: "#667085", marginBottom: "8px" }}>Total Billed</div>
          <div style={{ fontSize: "24px", fontWeight: 600, color: "#12332B" }}>
            {formatCurrency(totalBilled)}
          </div>
        </div>
        <div style={{
          padding: "20px",
          background: "white",
          border: "1px solid #E5E9F0",
          borderRadius: "12px"
        }}>
          <div style={{ fontSize: "13px", color: "#667085", marginBottom: "8px" }}>Collections Received</div>
          <div style={{ fontSize: "24px", fontWeight: 600, color: "#2E7D32" }}>
            {formatCurrency(totalCollected)}
          </div>
        </div>
      </div>

      {/* Status Filter */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "8px", alignItems: "center" }}>
        <span style={{ fontSize: "13px", color: "#667085", marginRight: "8px" }}>Filter:</span>
        {["all", "draft", "pending", "paid", "overdue"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            style={{
              padding: "6px 12px",
              background: statusFilter === status ? "#0F766E" : "white",
              color: statusFilter === status ? "white" : "#667085",
              border: statusFilter === status ? "1px solid #0F766E" : "1px solid #E5E9F0",
              borderRadius: "6px",
              fontSize: "13px",
              cursor: "pointer",
              textTransform: "capitalize",
              transition: "all 0.2s"
            }}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Billings Table */}
      {loading ? (
        <StandardLoadingState message="Loading billings..." />
      ) : filteredBillings.length === 0 ? (
        <StandardEmptyState
          icon={<Receipt size={48} />}
          title={statusFilter === "all" ? "No billings yet" : `No ${statusFilter} billings`}
          description="Billings will appear here once generated for bookings in this project"
          action={{
            label: "Create Billing",
            onClick: () => setIsCreateModalOpen(true)
          }}
        />
      ) : (
        <div style={{ border: "1px solid #E5E9F0", borderRadius: "12px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E9F0" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Billing Number
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Client
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Voucher
                </th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Amount
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Date
                </th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", color: "#667085", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredBillings.map((billing, index) => {
                const billingNumber = billing.billingNumber || billing.billingId || billing.id || "—";
                
                return (
                  <tr 
                    key={billing.id || index}
                    onClick={() => handleViewBilling(billing.id || billing.billingId || "")}
                    className="border-b border-[#12332B]/5 hover:bg-[#0F766E]/5 transition-colors cursor-pointer"
                  >
                    <td style={{ padding: "16px", fontSize: "14px", fontWeight: 500, color: "#0F766E" }}>
                      {billingNumber}
                    </td>
                    <td style={{ padding: "16px", fontSize: "14px", color: "#12332B" }}>
                      {billing.clientName || "—"}
                    </td>
                    <td style={{ padding: "16px", fontSize: "14px", color: "#667085" }}>
                      {billing.voucherNumber || "—"}
                    </td>
                    <td style={{ padding: "16px", fontSize: "14px", fontWeight: 600, color: "#12332B", textAlign: "right" }}>
                      <div>{formatCurrency(billing.amount, billing.currency)}</div>
                    </td>
                    <td style={{ padding: "16px", fontSize: "14px", color: "#667085" }}>
                      {formatDate(billing.createdAt || billing.created_at)}
                    </td>
                    <td style={{ padding: "16px", textAlign: "right" }}>
                      <NeuronStatusPill status={billing.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Billing Side Panel */}
      <CreateBillingSidePanel
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchBillings();
          onUpdate();
        }}
        prefillProjectId={project.id}
        prefillProjectNumber={project.project_number}
      />

      {/* Billing Detail Panel */}
      <BillingDetailPanel
        isOpen={selectedBillingId !== null}
        onClose={() => setSelectedBillingId(null)}
        billingId={selectedBillingId}
      />
    </div>
  );
}