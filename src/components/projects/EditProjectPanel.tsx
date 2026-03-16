import { ArrowLeft, Briefcase, Building2, Ship, Package, Calendar, FileText, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { ClientSelector } from "../selectors/ClientSelector";
import type { Project } from "../../types/pricing";

interface EditProjectPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectData: any) => Promise<void>;
  project: Project;
}

const MOVEMENT_OPTIONS = ["Export", "Import"];
const CATEGORY_OPTIONS = ["Air", "Ocean"];
const SHIPMENT_TYPE_OPTIONS = ["FCL", "LCL", "Break Bulk"];
const CARGO_TYPE_OPTIONS = ["General Cargo", "Dangerous Goods", "Perishable", "Fragile"];
const STACKABILITY_OPTIONS = ["Stackable", "Non-Stackable"];
const INCOTERM_OPTIONS = ["EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"];

export function EditProjectPanel({ isOpen, onClose, onSave, project }: EditProjectPanelProps) {
  const [formData, setFormData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  // Populate form with existing project data when panel opens
  useEffect(() => {
    if (isOpen && project) {
      setFormData({
        // General Information
        customer_id: project.customer_id || "",
        customer_name: project.customer_name || "",
        contact_person_name: project.contact_person_name || "",
        
        // Shipment Details
        movement: project.movement || "",
        category: project.category || "",
        shipment_type: project.shipment_type || "",
        pol_aol: project.pol_aol || "",
        pod_aod: project.pod_aod || "",
        carrier: project.carrier || "",
        transit_days: project.transit_days || "",
        incoterm: project.incoterm || "",
        services: project.services || [],
        
        // Cargo Details
        commodity: project.commodity || "",
        cargo_type: project.cargo_type || "",
        stackability: project.stackability || "",
        volume_cbm: project.volume_cbm || "",
        volume_containers: project.volume_containers || "",
        volume_packages: project.volume_packages || "",
        gross_weight: project.gross_weight || "",
        chargeable_weight: project.chargeable_weight || "",
        dimensions: project.dimensions || "",
        
        // Project Timeline
        client_po_number: project.client_po_number || "",
        client_po_date: project.client_po_date || "",
        shipment_ready_date: project.shipment_ready_date || "",
        requested_etd: project.requested_etd || "",
        actual_etd: project.actual_etd || "",
        eta: project.eta || "",
        actual_delivery_date: project.actual_delivery_date || "",
        collection_address: project.collection_address || "",
        
        // Special Instructions
        special_instructions: project.special_instructions || "",
      });
    }
  }, [isOpen, project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await onSave({
        ...formData,
        id: project.id,
      });
      
      onClose();
    } catch (error) {
      console.error('Error updating project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleClientSelect = (client: any) => {
    if (client) {
      setFormData((prev: any) => ({
        ...prev,
        customer_id: client.id,
        customer_name: client.name || client.company_name
      }));
    } else {
      setFormData((prev: any) => ({
        ...prev,
        customer_id: "",
        customer_name: ""
      }));
    }
  };

  const handleDateChange = (field: string, value: string) => {
    let formatted = value.replace(/[^\d/]/g, '');
    if (formatted.length === 2 && !formatted.includes('/')) {
      formatted = formatted + '/';
    } else if (formatted.length === 5 && formatted.split('/').length === 2) {
      formatted = formatted + '/';
    }
    if (formatted.length <= 10) {
      handleChange(field, formatted);
    }
  };

  if (!isOpen) return null;

  const isFormValid = formData.customer_id !== "";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black z-40"
        onClick={onClose}
        style={{ 
          backdropFilter: "blur(2px)",
          backgroundColor: "rgba(18, 51, 43, 0.15)"
        }}
      />

      {/* Slide-out Panel */}
      <div
        className="fixed right-0 top-0 h-full w-[800px] bg-white shadow-2xl z-50 flex flex-col animate-slide-in"
        style={{
          borderLeft: "1px solid var(--neuron-ui-border)",
        }}
      >
        {/* Header */}
        <div
          className="px-12 py-8 border-b"
          style={{
            borderColor: "var(--neuron-ui-border)",
            backgroundColor: "#FFFFFF",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "#E8F2EE" }}
              >
                <Briefcase size={20} style={{ color: "#0F766E" }} />
              </div>
              <h2 style={{ fontSize: "24px", fontWeight: 600, color: "#12332B" }}>
                Edit Project
              </h2>
            </div>
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
              <ArrowLeft size={20} />
            </button>
          </div>
          <p style={{ fontSize: "14px", color: "#667085" }}>
            Update project information and details
          </p>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-auto px-12 py-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* General Information Section */}
            <div>
              <h3 style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--neuron-brand-green)",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <Building2 size={18} />
                General Information
              </h3>
              
              <div className="space-y-4">
                {/* Client Name */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                    Client Name <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <ClientSelector
                    onSelect={handleClientSelect}
                    initialClientId={formData.customer_id}
                    initialClientName={formData.customer_name}
                  />
                </div>

                {/* Contact Person */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person_name || ""}
                    onChange={(e) => handleChange("contact_person_name", e.target.value)}
                    placeholder="Enter contact person name"
                    className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                    style={{
                      borderColor: "var(--neuron-ui-border)",
                      fontSize: "14px",
                      color: "var(--neuron-ink-primary)"
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#0F766E";
                      e.currentTarget.style.outline = "none";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Shipment Details Section */}
            <div>
              <h3 style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--neuron-brand-green)",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <Ship size={18} />
                Shipment Details
              </h3>
              
              <div className="space-y-4">
                {/* Row 1: Movement, Category, Shipment Type */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                      Movement
                    </label>
                    <select
                      value={formData.movement || ""}
                      onChange={(e) => handleChange("movement", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--neuron-ui-border)",
                        fontSize: "14px",
                        color: "var(--neuron-ink-primary)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#0F766E";
                        e.currentTarget.style.outline = "none";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                      }}
                    >
                      <option value="">Select...</option>
                      {MOVEMENT_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                      Category
                    </label>
                    <select
                      value={formData.category || ""}
                      onChange={(e) => handleChange("category", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--neuron-ui-border)",
                        fontSize: "14px",
                        color: "var(--neuron-ink-primary)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#0F766E";
                        e.currentTarget.style.outline = "none";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                      }}
                    >
                      <option value="">Select...</option>
                      {CATEGORY_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                      Shipment Type
                    </label>
                    <select
                      value={formData.shipment_type || ""}
                      onChange={(e) => handleChange("shipment_type", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--neuron-ui-border)",
                        fontSize: "14px",
                        color: "var(--neuron-ink-primary)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#0F766E";
                        e.currentTarget.style.outline = "none";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                      }}
                    >
                      <option value="">Select...</option>
                      {SHIPMENT_TYPE_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: POL/AOL and POD/AOD */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                      POL/AOL
                    </label>
                    <input
                      type="text"
                      value={formData.pol_aol || ""}
                      onChange={(e) => handleChange("pol_aol", e.target.value)}
                      placeholder="Port/Airport of Loading"
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--neuron-ui-border)",
                        fontSize: "14px",
                        color: "var(--neuron-ink-primary)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#0F766E";
                        e.currentTarget.style.outline = "none";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                      POD/AOD
                    </label>
                    <input
                      type="text"
                      value={formData.pod_aod || ""}
                      onChange={(e) => handleChange("pod_aod", e.target.value)}
                      placeholder="Port/Airport of Discharge"
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--neuron-ui-border)",
                        fontSize: "14px",
                        color: "var(--neuron-ink-primary)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#0F766E";
                        e.currentTarget.style.outline = "none";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                      }}
                    />
                  </div>
                </div>

                {/* Row 3: Carrier, Transit Days, Incoterm */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                      Carrier
                    </label>
                    <input
                      type="text"
                      value={formData.carrier || ""}
                      onChange={(e) => handleChange("carrier", e.target.value)}
                      placeholder="Carrier name"
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--neuron-ui-border)",
                        fontSize: "14px",
                        color: "var(--neuron-ink-primary)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#0F766E";
                        e.currentTarget.style.outline = "none";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                      Transit Days
                    </label>
                    <input
                      type="text"
                      value={formData.transit_days || ""}
                      onChange={(e) => handleChange("transit_days", e.target.value)}
                      placeholder="Number of days"
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--neuron-ui-border)",
                        fontSize: "14px",
                        color: "var(--neuron-ink-primary)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#0F766E";
                        e.currentTarget.style.outline = "none";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                      Incoterm
                    </label>
                    <select
                      value={formData.incoterm || ""}
                      onChange={(e) => handleChange("incoterm", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--neuron-ui-border)",
                        fontSize: "14px",
                        color: "var(--neuron-ink-primary)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#0F766E";
                        e.currentTarget.style.outline = "none";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                      }}
                    >
                      <option value="">Select...</option>
                      {INCOTERM_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Cargo Details Section */}
            <div>
              <h3 style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--neuron-brand-green)",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <Package size={18} />
                Cargo Details
              </h3>
              
              <div className="space-y-4">
                {/* Row 1: Commodity, Cargo Type, Stackability */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                      Commodity
                    </label>
                    <input
                      type="text"
                      value={formData.commodity || ""}
                      onChange={(e) => handleChange("commodity", e.target.value)}
                      placeholder="e.g., Electronics"
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--neuron-ui-border)",
                        fontSize: "14px",
                        color: "var(--neuron-ink-primary)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#0F766E";
                        e.currentTarget.style.outline = "none";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                      Cargo Type
                    </label>
                    <select
                      value={formData.cargo_type || ""}
                      onChange={(e) => handleChange("cargo_type", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--neuron-ui-border)",
                        fontSize: "14px",
                        color: "var(--neuron-ink-primary)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#0F766E";
                        e.currentTarget.style.outline = "none";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                      }}
                    >
                      <option value="">Select...</option>
                      {CARGO_TYPE_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                      Stackability
                    </label>
                    <select
                      value={formData.stackability || ""}
                      onChange={(e) => handleChange("stackability", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--neuron-ui-border)",
                        fontSize: "14px",
                        color: "var(--neuron-ink-primary)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#0F766E";
                        e.currentTarget.style.outline = "none";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                      }}
                    >
                      <option value="">Select...</option>
                      {STACKABILITY_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Volume Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                      Volume (CBM)
                    </label>
                    <input
                      type="text"
                      value={formData.volume_cbm || ""}
                      onChange={(e) => handleChange("volume_cbm", e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--neuron-ui-border)",
                        fontSize: "14px",
                        color: "var(--neuron-ink-primary)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#0F766E";
                        e.currentTarget.style.outline = "none";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                      Volume (Containers)
                    </label>
                    <input
                      type="text"
                      value={formData.volume_containers || ""}
                      onChange={(e) => handleChange("volume_containers", e.target.value)}
                      placeholder="e.g., 2x40HC"
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--neuron-ui-border)",
                        fontSize: "14px",
                        color: "var(--neuron-ink-primary)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#0F766E";
                        e.currentTarget.style.outline = "none";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                      Volume (Packages)
                    </label>
                    <input
                      type="text"
                      value={formData.volume_packages || ""}
                      onChange={(e) => handleChange("volume_packages", e.target.value)}
                      placeholder="Number of packages"
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--neuron-ui-border)",
                        fontSize: "14px",
                        color: "var(--neuron-ink-primary)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#0F766E";
                        e.currentTarget.style.outline = "none";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                      }}
                    />
                  </div>
                </div>

                {/* Row 3: Weight and Dimensions */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                      Gross Weight (kg)
                    </label>
                    <input
                      type="text"
                      value={formData.gross_weight || ""}
                      onChange={(e) => handleChange("gross_weight", e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--neuron-ui-border)",
                        fontSize: "14px",
                        color: "var(--neuron-ink-primary)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#0F766E";
                        e.currentTarget.style.outline = "none";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                      Chargeable Weight (kg)
                    </label>
                    <input
                      type="text"
                      value={formData.chargeable_weight || ""}
                      onChange={(e) => handleChange("chargeable_weight", e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--neuron-ui-border)",
                        fontSize: "14px",
                        color: "var(--neuron-ink-primary)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#0F766E";
                        e.currentTarget.style.outline = "none";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                      Dimensions
                    </label>
                    <input
                      type="text"
                      value={formData.dimensions || ""}
                      onChange={(e) => handleChange("dimensions", e.target.value)}
                      placeholder="L x W x H"
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--neuron-ui-border)",
                        fontSize: "14px",
                        color: "var(--neuron-ink-primary)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#0F766E";
                        e.currentTarget.style.outline = "none";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Project Timeline Section */}
            <div>
              <h3 style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--neuron-brand-green)",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <Calendar size={18} />
                Project Timeline
              </h3>
              
              <div className="space-y-4">
                {/* Row 1: Client PO Number and PO Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                      Client PO Number
                    </label>
                    <input
                      type="text"
                      value={formData.client_po_number || ""}
                      onChange={(e) => handleChange("client_po_number", e.target.value)}
                      placeholder="PO number"
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--neuron-ui-border)",
                        fontSize: "14px",
                        color: "var(--neuron-ink-primary)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#0F766E";
                        e.currentTarget.style.outline = "none";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                      PO Date
                    </label>
                    <input
                      type="text"
                      value={formData.client_po_date || ""}
                      onChange={(e) => handleDateChange("client_po_date", e.target.value)}
                      placeholder="MM/DD/YYYY"
                      maxLength={10}
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--neuron-ui-border)",
                        fontSize: "14px",
                        color: "var(--neuron-ink-primary)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#0F766E";
                        e.currentTarget.style.outline = "none";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                      }}
                    />
                  </div>
                </div>

                {/* Row 2: Project Date and Requested ETD */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                      Project Date
                    </label>
                    <input
                      type="text"
                      value={formData.shipment_ready_date || ""}
                      onChange={(e) => handleDateChange("shipment_ready_date", e.target.value)}
                      placeholder="MM/DD/YYYY"
                      maxLength={10}
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--neuron-ui-border)",
                        fontSize: "14px",
                        color: "var(--neuron-ink-primary)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#0F766E";
                        e.currentTarget.style.outline = "none";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                      Requested ETD
                    </label>
                    <input
                      type="text"
                      value={formData.requested_etd || ""}
                      onChange={(e) => handleDateChange("requested_etd", e.target.value)}
                      placeholder="MM/DD/YYYY"
                      maxLength={10}
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--neuron-ui-border)",
                        fontSize: "14px",
                        color: "var(--neuron-ink-primary)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#0F766E";
                        e.currentTarget.style.outline = "none";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                      }}
                    />
                  </div>
                </div>

                {/* Row 3: Actual ETD and ETA */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                      Actual ETD
                    </label>
                    <input
                      type="text"
                      value={formData.actual_etd || ""}
                      onChange={(e) => handleDateChange("actual_etd", e.target.value)}
                      placeholder="MM/DD/YYYY"
                      maxLength={10}
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--neuron-ui-border)",
                        fontSize: "14px",
                        color: "var(--neuron-ink-primary)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#0F766E";
                        e.currentTarget.style.outline = "none";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                      ETA
                    </label>
                    <input
                      type="text"
                      value={formData.eta || ""}
                      onChange={(e) => handleDateChange("eta", e.target.value)}
                      placeholder="MM/DD/YYYY"
                      maxLength={10}
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--neuron-ui-border)",
                        fontSize: "14px",
                        color: "var(--neuron-ink-primary)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#0F766E";
                        e.currentTarget.style.outline = "none";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                      }}
                    />
                  </div>
                </div>

                {/* Row 4: Actual Delivery Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                      Actual Delivery Date
                    </label>
                    <input
                      type="text"
                      value={formData.actual_delivery_date || ""}
                      onChange={(e) => handleDateChange("actual_delivery_date", e.target.value)}
                      placeholder="MM/DD/YYYY"
                      maxLength={10}
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--neuron-ui-border)",
                        fontSize: "14px",
                        color: "var(--neuron-ink-primary)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#0F766E";
                        e.currentTarget.style.outline = "none";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                      }}
                    />
                  </div>
                </div>

                {/* Row 5: Collection Address (Full Width) */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                    Collection Address
                  </label>
                  <input
                    type="text"
                    value={formData.collection_address || ""}
                    onChange={(e) => handleChange("collection_address", e.target.value)}
                    placeholder="Enter collection address"
                    className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                    style={{
                      borderColor: "var(--neuron-ui-border)",
                      fontSize: "14px",
                      color: "var(--neuron-ink-primary)"
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#0F766E";
                      e.currentTarget.style.outline = "none";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Special Instructions Section */}
            <div>
              <h3 style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--neuron-brand-green)",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <FileText size={18} />
                Special Instructions
              </h3>
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-base)" }}>
                  Instructions / Notes
                </label>
                <textarea
                  value={formData.special_instructions || ""}
                  onChange={(e) => handleChange("special_instructions", e.target.value)}
                  placeholder="Enter any special instructions or notes"
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-lg border transition-colors resize-none"
                  style={{
                    borderColor: "var(--neuron-ui-border)",
                    fontSize: "14px",
                    color: "var(--neuron-ink-primary)"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#0F766E";
                    e.currentTarget.style.outline = "none";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
                  }}
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div
          className="px-12 py-6 border-t flex gap-3 justify-end"
          style={{
            borderColor: "var(--neuron-ui-border)",
            backgroundColor: "#FAFBFC",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg font-medium transition-colors"
            style={{
              border: "1.5px solid var(--neuron-ui-border)",
              color: "var(--neuron-ink-base)",
              backgroundColor: "white",
              fontSize: "14px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#F9FAFB";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "white";
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isFormValid || isLoading}
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-lg font-medium transition-all"
            style={{
              backgroundColor: isFormValid && !isLoading ? "#0F766E" : "#D1D5DB",
              color: "white",
              fontSize: "14px",
              border: "none",
              cursor: isFormValid && !isLoading ? "pointer" : "not-allowed",
            }}
            onMouseEnter={(e) => {
              if (isFormValid && !isLoading) {
                e.currentTarget.style.backgroundColor = "#0D6559";
              }
            }}
            onMouseLeave={(e) => {
              if (isFormValid && !isLoading) {
                e.currentTarget.style.backgroundColor = "#0F766E";
              }
            }}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}