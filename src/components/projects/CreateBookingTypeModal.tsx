import { X, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import type { Project } from "../../types/pricing";

interface CreateBookingTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  currentUser?: {
    id: string;
    name: string;
    email: string;
    department: string;
  } | null;
  onBookingCreated: () => void;
}

export function CreateBookingTypeModal({
  isOpen,
  onClose,
  project,
  currentUser,
  onBookingCreated,
}: CreateBookingTypeModalProps) {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<"Export" | "Import" | null>(null);

  if (!isOpen) return null;

  const handleContinue = () => {
    if (!selectedType) return;
    
    const route = selectedType === "Export" ? "/operations/forwarding" : "/operations/brokerage";
    
    // Extract service details for the selected type
    const serviceDetails = selectedType === "Export" 
      ? project.services_metadata?.find(s => s.service_type === "Forwarding")?.service_details
      : project.services_metadata?.find(s => s.service_type === "Brokerage")?.service_details;
    
    // Navigate with state to pre-fill project and client info
    navigate(route, {
      state: {
        createFromProject: true,
        projectId: project.id,
        projectNumber: project.project_number,
        projectName: project.project_name || project.quotation_name,
        clientId: project.client_id,
        clientName: project.client_name || project.customer_name,
        // Add shipping/logistics details from project
        commodity: (serviceDetails as any)?.commodity || project.commodity || "",
        volume_containers: project.volume_containers || "",
        shipping_line: (serviceDetails as any)?.carrierAirline || 
                      (serviceDetails as any)?.carrier_airline || 
                      (serviceDetails as any)?.carrier || 
                      project.carrier || "",
        vessel_voyage: (serviceDetails as any)?.vessel_voyage || "",
        trucker: (serviceDetails as any)?.trucker || "",
        destination: (serviceDetails as any)?.pod || project.pod_aod || "",
        loading_address: (serviceDetails as any)?.delivery_address || project.collection_address || "",
        loading_schedule: project.shipment_ready_date || project.requested_etd || "",
        origin: (serviceDetails as any)?.pol || project.pol_aol || "",
        pod: (serviceDetails as any)?.pod || project.pod_aod || "",
      },
    });
    
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black z-50"
        onClick={onClose}
        style={{
          backdropFilter: "blur(2px)",
          backgroundColor: "rgba(18, 51, 43, 0.25)",
        }}
      />

      {/* Modal */}
      <div
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white z-50 rounded-xl shadow-2xl"
        style={{
          width: "480px",
          border: "1px solid var(--neuron-ui-border)",
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 border-b flex items-center justify-between"
          style={{ borderColor: "var(--neuron-ui-border)" }}
        >
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#12332B" }}>
            Create Booking
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{
              color: "var(--neuron-ink-muted)",
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--neuron-state-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p style={{ fontSize: "14px", color: "var(--neuron-ink-muted)", marginBottom: "24px" }}>
            Select the type of booking you want to create
          </p>

          <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
            {/* Export Option */}
            <button
              onClick={() => setSelectedType("Export")}
              style={{
                flex: 1,
                padding: "32px 24px",
                border: selectedType === "Export" ? "2px solid #0F766E" : "2px solid #E5E7EB",
                borderRadius: "12px",
                backgroundColor: selectedType === "Export" ? "#F0FDF4" : "white",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px",
              }}
              onMouseEnter={(e) => {
                if (selectedType !== "Export") {
                  e.currentTarget.style.borderColor = "#D1D5DB";
                  e.currentTarget.style.backgroundColor = "#F9FAFB";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedType !== "Export") {
                  e.currentTarget.style.borderColor = "#E5E7EB";
                  e.currentTarget.style.backgroundColor = "white";
                }
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  backgroundColor: "#E0F2F1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ArrowUp size={28} style={{ color: "#0F766E", strokeWidth: 2.5 }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "18px", fontWeight: 600, color: "#12332B", marginBottom: "4px" }}>
                  Export
                </div>
                <div style={{ fontSize: "14px", color: "#6B7280" }}>
                  Create an export project
                </div>
              </div>
            </button>

            {/* Import Option */}
            <button
              onClick={() => setSelectedType("Import")}
              style={{
                flex: 1,
                padding: "32px 24px",
                border: selectedType === "Import" ? "2px solid #0F766E" : "2px solid #E5E7EB",
                borderRadius: "12px",
                backgroundColor: selectedType === "Import" ? "#F0FDF4" : "white",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px",
              }}
              onMouseEnter={(e) => {
                if (selectedType !== "Import") {
                  e.currentTarget.style.borderColor = "#D1D5DB";
                  e.currentTarget.style.backgroundColor = "#F9FAFB";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedType !== "Import") {
                  e.currentTarget.style.borderColor = "#E5E7EB";
                  e.currentTarget.style.backgroundColor = "white";
                }
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  backgroundColor: "#FFF4E6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ArrowDown size={28} style={{ color: "#F59E0B", strokeWidth: 2.5 }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "18px", fontWeight: 600, color: "#12332B", marginBottom: "4px" }}>
                  Import
                </div>
                <div style={{ fontSize: "14px", color: "#6B7280" }}>
                  Create an import project
                </div>
              </div>
            </button>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!selectedType}
            style={{
              width: "100%",
              padding: "14px 24px",
              borderRadius: "8px",
              backgroundColor: selectedType ? "#0F766E" : "#E5E7EB",
              color: selectedType ? "white" : "#9CA3AF",
              fontSize: "15px",
              fontWeight: 600,
              cursor: selectedType ? "pointer" : "not-allowed",
              border: "none",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (selectedType) {
                e.currentTarget.style.backgroundColor = "#0D6A63";
              }
            }}
            onMouseLeave={(e) => {
              if (selectedType) {
                e.currentTarget.style.backgroundColor = "#0F766E";
              }
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
}