import { ArrowLeft, Briefcase, Plus, X } from "lucide-react";
import { useState } from "react";
import { CompanyContactSelector } from "../selectors/CompanyContactSelector";
import { useUser } from "../../hooks/useUser";
import type { Client, Contact } from "../../types/operations";
import { PanelBackdrop } from "../shared/PanelBackdrop";

interface CreateProjectPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectData: any) => Promise<void>;
  movementType?: "Export" | "Import" | null;
}

export function CreateProjectPanel({ isOpen, onClose, onSave, movementType }: CreateProjectPanelProps) {
  const { user } = useUser();
  
  // Single client selection state
  const [selectedCompany, setSelectedCompany] = useState<Client | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  
  const [formData, setFormData] = useState({
    date: "",
    commodity: "",
    volume_containers: "",
    shipping_line: "", // NEW - Added shipping line field
    vessel_voyage: "",
    destination: "", // EXPORT only
    origin: "", // IMPORT only
    trucker: "",
    loading_address: "", // EXPORT only
    loading_schedule: "", // EXPORT only
    pod: "", // IMPORT only
    releasing_date: "", // IMPORT only
  });

  const [isLoading, setIsLoading] = useState(false);
  const [dateError, setDateError] = useState("");
  const [loadingScheduleError, setLoadingScheduleError] = useState("");
  const [releasingDateError, setReleasingDateError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await onSave({
        ...formData,
        movement: movementType,
        client_id: selectedCompany?.id,
        client_name: selectedCompany?.name || selectedCompany?.company_name,
        companyName: selectedCompany?.name || selectedCompany?.company_name || "",
        contact_id: selectedContact?.id || "",
        contact_name: selectedContact?.name || "",
        // Resolved customerName: contact if selected, else company
        customerName: selectedContact ? selectedContact.name : (selectedCompany?.name || selectedCompany?.company_name || ""),
        // Legacy support
        client_ids: selectedCompany ? [selectedCompany.id] : [],
        client_names: selectedCompany ? [selectedCompany.name || selectedCompany.company_name] : [],
        created_by: user?.id || "system",
        created_by_name: user?.name || "System",
      });
      
      handleClose();
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateDate = (dateStr: string): boolean => {
    if (dateStr.length !== 10) return false;
    
    const parts = dateStr.split('/');
    if (parts.length !== 3) return false;
    
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    if (isNaN(month) || isNaN(day) || isNaN(year)) return false;
    if (month < 1 || month > 12) return false;
    if (year < 1900 || year > 2100) return false;
    
    // Check days in month
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return false;
    
    return true;
  };

  const formatDateInput = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Limit to 8 digits (MMDDYYYY)
    const limited = digits.slice(0, 8);
    
    // Format as MM/DD/YYYY
    let formatted = '';
    if (limited.length >= 1) {
      formatted = limited.slice(0, 2);
    }
    if (limited.length >= 3) {
      formatted += '/' + limited.slice(2, 4);
    }
    if (limited.length >= 5) {
      formatted += '/' + limited.slice(4, 8);
    }
    
    return formatted;
  };

  const handleDateChange = (field: 'date' | 'loading_schedule' | 'releasing_date', value: string) => {
    const formatted = formatDateInput(value);
    handleChange(field, formatted);
    
    // Validate if complete
    if (formatted.length === 10) {
      const isValid = validateDate(formatted);
      if (field === 'date') {
        setDateError(isValid ? "" : "Invalid date");
      } else if (field === 'loading_schedule') {
        setLoadingScheduleError(isValid ? "" : "Invalid date");
      } else {
        setReleasingDateError(isValid ? "" : "Invalid date");
      }
    } else {
      if (field === 'date') {
        setDateError("");
      } else if (field === 'loading_schedule') {
        setLoadingScheduleError("");
      } else {
        setReleasingDateError("");
      }
    }
  };

  const handleClose = () => {
    onClose();
    // Reset form
    setSelectedCompany(null);
    setSelectedContact(null);
    setFormData({
      date: "",
      commodity: "",
      volume_containers: "",
      shipping_line: "", // NEW - Added shipping line field
      vessel_voyage: "",
      destination: "",
      origin: "",
      trucker: "",
      loading_address: "",
      loading_schedule: "",
      pod: "",
      releasing_date: "",
    });
    setDateError("");
    setLoadingScheduleError("");
    setReleasingDateError("");
  };

  if (!isOpen) return null;

  const isFormValid = selectedCompany !== null; // Contact is now optional

  const inputStyle = {
    borderColor: "var(--neuron-ui-border)",
    fontSize: "14px",
    color: "var(--neuron-ink-primary)"
  };

  return (
    <>
      {/* Backdrop */}
      <PanelBackdrop onClick={handleClose} />

      {/* Slide-out Panel */}
      <div
        className="fixed right-0 top-0 h-full w-[800px] bg-white shadow-2xl z-50 flex flex-col animate-slide-in"
        style={{
          borderLeft: "1px solid var(--neuron-ui-border)",
        }}
      >
        {/* Header */}
        <div
          className="px-10 py-8 border-b"
          style={{
            borderColor: "var(--neuron-ui-border)",
            backgroundColor: "#FFFFFF",
          }}
        >
          <div className="flex items-center gap-4">
            {/* Arrow Button - ONLY close mechanism */}
            <button
              onClick={handleClose}
              className="p-2 hover:bg-[#0F766E]/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#0A1D4D]" />
            </button>
            
            {/* Title Block */}
            <div>
              <h2 className="text-2xl font-semibold text-[#0A1D4D] mb-1">
                Create New {movementType} Project
              </h2>
              <p className="text-sm text-[#667085]">
                Create a new {movementType?.toLowerCase()} project with multiple clients
              </p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-auto px-12 py-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Date */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-primary)" }}>
                Date
              </label>
              <input
                type="text"
                value={formData.date}
                onChange={(e) => handleDateChange("date", e.target.value)}
                placeholder="MM/DD/YYYY"
                className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                style={inputStyle}
              />
              {dateError && <p className="text-red-500 text-sm mt-1">{dateError}</p>}
            </div>

            {/* Client Selector - Single Company + Contact */}
            <div>
              <CompanyContactSelector
                companyId={selectedCompany?.id}
                contactId={selectedContact?.id}
                onSelect={({ company, contact }) => {
                  setSelectedCompany(company);
                  setSelectedContact(contact);
                }}
              />
            </div>

            {/* Commodity & Total Volume */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-primary)" }}>
                  Commodity
                </label>
                <input
                  type="text"
                  value={formData.commodity}
                  onChange={(e) => handleChange("commodity", e.target.value)}
                  placeholder="Product description"
                  className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-primary)" }}>
                  Total Volume
                </label>
                <input
                  type="text"
                  value={formData.volume_containers}
                  onChange={(e) => handleChange("volume_containers", e.target.value)}
                  placeholder="e.g., 4X40'HC"
                  className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Shipping Line & Vessel/Voyage */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-primary)" }}>
                  Shipping Line
                </label>
                <input
                  type="text"
                  value={formData.shipping_line}
                  onChange={(e) => handleChange("shipping_line", e.target.value)}
                  placeholder="Carrier/Shipping Line"
                  className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-primary)" }}>
                  Vessel/Voyage
                </label>
                <input
                  type="text"
                  value={formData.vessel_voyage}
                  onChange={(e) => handleChange("vessel_voyage", e.target.value)}
                  placeholder="Vessel/Voyage"
                  className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* EXPORT ONLY FIELDS */}
            {movementType === "Export" && (
              <>
                {/* Trucker & Destination */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-primary)" }}>
                      Trucker
                    </label>
                    <input
                      type="text"
                      value={formData.trucker}
                      onChange={(e) => handleChange("trucker", e.target.value)}
                      placeholder="Trucking company name"
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-primary)" }}>
                      Destination
                    </label>
                    <input
                      type="text"
                      value={formData.destination}
                      onChange={(e) => handleChange("destination", e.target.value)}
                      placeholder="Destination"
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Loading Address & Loading Schedule */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-primary)" }}>
                      Loading Address
                    </label>
                    <input
                      type="text"
                      value={formData.loading_address}
                      onChange={(e) => handleChange("loading_address", e.target.value)}
                      placeholder="Pickup/loading location"
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-primary)" }}>
                      Loading Schedule
                    </label>
                    <input
                      type="text"
                      value={formData.loading_schedule}
                      onChange={(e) => handleDateChange("loading_schedule", e.target.value)}
                      placeholder="MM/DD/YYYY"
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={inputStyle}
                    />
                    {loadingScheduleError && <p className="text-red-500 text-sm mt-1">{loadingScheduleError}</p>}
                  </div>
                </div>
              </>
            )}

            {/* IMPORT ONLY FIELDS */}
            {movementType === "Import" && (
              <>
                {/* Trucker & Origin */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-primary)" }}>
                      Trucker
                    </label>
                    <input
                      type="text"
                      value={formData.trucker}
                      onChange={(e) => handleChange("trucker", e.target.value)}
                      placeholder="Trucking company name"
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-primary)" }}>
                    POL (Port of Loading)
                    </label>
                    <input
                      type="text"
                      value={formData.origin}
                      onChange={(e) => handleChange("origin", e.target.value)}
                      placeholder="Origin location"
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* POD & Releasing Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-primary)" }}>
                      POD (Port of Discharge)
                    </label>
                    <input
                      type="text"
                      value={formData.pod}
                      onChange={(e) => handleChange("pod", e.target.value)}
                      placeholder="Port of Discharge"
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "var(--neuron-ink-primary)" }}>
                      Releasing Date
                    </label>
                    <input
                      type="text"
                      value={formData.releasing_date}
                      onChange={(e) => handleDateChange("releasing_date", e.target.value)}
                      placeholder="MM/DD/YYYY"
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={inputStyle}
                    />
                    {releasingDateError && <p className="text-red-500 text-sm mt-1">{releasingDateError}</p>}
                  </div>
                </div>
              </>
            )}

          </form>
        </div>

        {/* Footer */}
        <div
          className="px-12 py-6 border-t flex justify-end gap-3"
          style={{
            borderColor: "var(--neuron-ui-border)",
            backgroundColor: "#FAFAFA",
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2.5 rounded-lg border font-medium transition-colors"
            style={{
              borderColor: "var(--neuron-ui-border)",
              color: "var(--neuron-ink-base)",
              fontSize: "14px"
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={!isFormValid || isLoading}
            className="px-6 py-2.5 rounded-lg font-medium transition-opacity"
            style={{
              backgroundColor: isFormValid ? "#0F766E" : "#D1D5DB",
              color: "white",
              fontSize: "14px",
              cursor: isFormValid ? "pointer" : "not-allowed",
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? "Creating..." : "Create Project"}
          </button>
        </div>
      </div>
    </>
  );
}