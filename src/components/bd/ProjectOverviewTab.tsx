import { Calendar, MapPin, Truck, X, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import type { Project } from "../../types/pricing";
import { ClientSelector } from "../selectors/ClientSelector";
import { DatePicker } from "../ui/DatePicker";

interface ProjectOverviewTabProps {
  project: Project;
  onUpdate: () => void;
  isEditing?: boolean;
  onSave?: (data: any) => Promise<void>;
  onCancelEdit?: () => void;
}

export function ProjectOverviewTab({ project, onUpdate, isEditing = false, onSave, onCancelEdit }: ProjectOverviewTabProps) {
  const [editData, setEditData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedClients, setSelectedClients] = useState<Array<{ id: string; name: string }>>([]);
  const [showClientSelector, setShowClientSelector] = useState(false);

  // Initialize selectedClients when entering edit mode
  useEffect(() => {
    // Always load clients from project data
    const clientIds = project.client_ids || [project.client_id];
    const clientNames = project.client_names || [project.client_name || project.customer_name];
    const clients = clientIds.map((id: string, index: number) => ({
      id,
      name: clientNames[index] || "Unknown Client"
    })).filter((c: any) => c.id);
    setSelectedClients(clients);
    console.log("Loaded clients from project:", clients);

    if (isEditing) {
      console.log("Edit mode enabled");
    } else {
      // Reset selector state when exiting edit mode
      setShowClientSelector(false);
    }
  }, [isEditing, project]);

  const handleChange = (field: string, value: any) => {
    console.log(`Field changed: ${field} =`, value);
    setEditData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleClientSelect = (client: any) => {
    if (client && !selectedClients.find(c => c.id === client.id)) {
      const updatedClients = [...selectedClients, {
        id: client.id,
        name: client.name || client.company_name
      }];
      setSelectedClients(updatedClients);
      
      // Update editData with new client arrays
      handleChange('client_ids', updatedClients.map(c => c.id));
      handleChange('client_names', updatedClients.map(c => c.name));
      
      console.log("Added client:", client);
    }
    setShowClientSelector(false);
  };

  const removeClient = (clientId: string) => {
    const updatedClients = selectedClients.filter(c => c.id !== clientId);
    setSelectedClients(updatedClients);
    
    // Update editData with new client arrays
    handleChange('client_ids', updatedClients.map(c => c.id));
    handleChange('client_names', updatedClients.map(c => c.name));
    
    console.log("Removed client:", clientId);
  };

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      const updatedProject = {
        ...project,
        ...editData,
        id: project.id
      };
      console.log("Saving project with data:", updatedProject);
      console.log("Changed fields:", editData);
      await onSave(updatedProject);
      setEditData({});
    } catch (error) {
      console.error("Error saving project:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData({});
    if (onCancelEdit) onCancelEdit();
  };

  const getValue = (field: string, defaultValue?: any) => {
    return editData[field] !== undefined ? editData[field] : (project[field as keyof Project] ?? defaultValue);
  };

  // Get movement type to determine which fields to show
  const movementType = getValue("movement") || "Export";
  const isExport = movementType === "Export";
  const isImport = movementType === "Import";

  return (
    <div style={{ 
      flex: 1,
      overflow: "auto"
    }}>
      <div style={{ 
        padding: "32px 48px",
        maxWidth: "1400px",
        margin: "0 auto"
      }}>
        
        {/* Main Details Section */}
        <div style={{
          backgroundColor: "white",
          border: "1px solid var(--neuron-ui-border)",
          borderRadius: "8px",
          padding: "24px",
          marginBottom: "24px"
        }}>
          <div style={{ display: "grid", gap: "20px" }}>
            
            {/* Row 1: Date */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <Field 
                label="Date" 
                fieldName="shipment_ready_date" 
                value={getValue("shipment_ready_date")} 
                icon={<Calendar size={16} />} 
                onChange={handleChange} 
                isEditing={isEditing}
                type="date"
                placeholder="MM/DD/YYYY"
              />
              <div /> {/* Empty cell for grid alignment */}
            </div>

            {/* Row 2: Clients (Multi-client support) */}
            <div>
              <label style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--neuron-ink-base)",
                marginBottom: "8px"
              }}>
                Clients
              </label>
              
              {!isEditing ? (
                // VIEW MODE - Show green badges
                <div style={{
                  padding: "10px 14px",
                  backgroundColor: "#F9FAFB",
                  border: "1px solid var(--neuron-ui-border)",
                  borderRadius: "6px",
                  minHeight: "42px",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  alignItems: "center"
                }}>
                  {selectedClients.length > 0 ? (
                    selectedClients.map((client: any) => (
                      <div
                        key={client.id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "4px 10px",
                          backgroundColor: "#E8F2EE",
                          border: "1px solid #0F766E",
                          borderRadius: "6px",
                          fontSize: "13px",
                          color: "#0F766E"
                        }}
                      >
                        {client.name}
                      </div>
                    ))
                  ) : (
                    <span style={{ color: "#9CA3AF", fontSize: "14px" }}>—</span>
                  )}
                </div>
              ) : (
                // EDIT MODE - Show editable chips with Add button
                <div>
                  {/* Selected Clients Display */}
                  {selectedClients.length > 0 && (
                    <div style={{
                      marginBottom: "12px",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px"
                    }}>
                      {selectedClients.map(client => (
                        <div
                          key={client.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "1px solid var(--neuron-ui-border)",
                            backgroundColor: "#F9FAFB",
                            fontSize: "14px",
                            color: "var(--neuron-ink-primary)"
                          }}
                        >
                          <span>{client.name}</span>
                          <button
                            type="button"
                            onClick={() => removeClient(client.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "16px",
                              height: "16px",
                              padding: 0,
                              border: "none",
                              background: "transparent",
                              color: "#667085",
                              cursor: "pointer",
                              borderRadius: "4px",
                              transition: "all 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#F3F4F6";
                              e.currentTarget.style.color = "#EF4444";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                              e.currentTarget.style.color = "#667085";
                            }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Client Button or ClientSelector */}
                  {!showClientSelector ? (
                    <button
                      type="button"
                      onClick={() => setShowClientSelector(true)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 14px",
                        borderRadius: "6px",
                        border: "1px solid var(--neuron-ui-border)",
                        backgroundColor: "white",
                        color: "var(--neuron-ink-base)",
                        fontSize: "14px",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#F9FAFB";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "white";
                      }}
                    >
                      <Plus size={16} />
                      Add Client
                    </button>
                  ) : (
                    <div style={{ marginTop: "8px" }}>
                      <ClientSelector
                        onSelect={handleClientSelect}
                        excludeClientIds={selectedClients.map(c => c.id)}
                        autoOpen={true}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Row 3: Commodity & Total Volume */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <Field 
                label="Commodity" 
                fieldName="commodity" 
                value={getValue("commodity")} 
                onChange={handleChange} 
                isEditing={isEditing}
                placeholder="Product description"
              />
              <Field 
                label="Total Volume" 
                fieldName="volume_containers" 
                value={getValue("volume_containers")} 
                onChange={handleChange} 
                isEditing={isEditing}
                placeholder="e.g., 4X40'HC" 
              />
            </div>

            {/* Row 4: Shipping Line & Vessel/Voyage */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <Field 
                label="Shipping Line" 
                fieldName="shipping_line" 
                value={getValue("shipping_line")} 
                onChange={handleChange} 
                isEditing={isEditing}
                placeholder="Carrier/Shipping Line"
              />
              <Field 
                label="Vessel/Voyage" 
                fieldName="vessel_voyage" 
                value={getValue("vessel_voyage")} 
                onChange={handleChange} 
                isEditing={isEditing}
                placeholder="Vessel/Voyage"
              />
            </div>

            {/* EXPORT ONLY FIELDS */}
            {isExport && (
              <>
                {/* Row 5: Trucker & Destination */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <Field 
                    label="Trucker" 
                    fieldName="trucker" 
                    value={getValue("trucker")} 
                    icon={<Truck size={16} />}
                    onChange={handleChange} 
                    isEditing={isEditing}
                    placeholder="Trucking company name"
                  />
                  <Field 
                    label="Destination" 
                    fieldName="destination" 
                    value={getValue("destination")} 
                    icon={<MapPin size={16} />}
                    onChange={handleChange} 
                    isEditing={isEditing}
                    placeholder="Destination"
                  />
                </div>

                {/* Row 6: Loading Address & Loading Schedule */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <Field 
                    label="Loading Address" 
                    fieldName="loading_address" 
                    value={getValue("loading_address")} 
                    icon={<MapPin size={16} />}
                    onChange={handleChange} 
                    isEditing={isEditing}
                    placeholder="Pickup/loading location"
                  />
                  <Field 
                    label="Loading Schedule" 
                    fieldName="loading_schedule" 
                    value={getValue("loading_schedule")} 
                    icon={<Calendar size={16} />}
                    onChange={handleChange} 
                    isEditing={isEditing}
                    type="date"
                    placeholder="MM/DD/YYYY"
                  />
                </div>
              </>
            )}

            {/* IMPORT ONLY FIELDS */}
            {isImport && (
              <>
                {/* Row 5: Trucker & Origin */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <Field 
                    label="Trucker" 
                    fieldName="trucker" 
                    value={getValue("trucker")} 
                    icon={<Truck size={16} />}
                    onChange={handleChange} 
                    isEditing={isEditing}
                    placeholder="Trucking company name"
                  />
                  <Field 
                    label="Origin" 
                    fieldName="origin" 
                    value={getValue("origin")} 
                    icon={<MapPin size={16} />}
                    onChange={handleChange} 
                    isEditing={isEditing}
                    placeholder="Origin location"
                  />
                </div>

                {/* Row 6: POD & Releasing Date */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <Field 
                    label="POD (Port of Discharge)" 
                    fieldName="pod" 
                    value={getValue("pod")} 
                    icon={<MapPin size={16} />}
                    onChange={handleChange} 
                    isEditing={isEditing}
                    placeholder="Port of Discharge"
                  />
                  <Field 
                    label="Releasing Date" 
                    fieldName="releasing_date" 
                    value={getValue("releasing_date")} 
                    icon={<Calendar size={16} />}
                    onChange={handleChange} 
                    isEditing={isEditing}
                    type="date"
                    placeholder="MM/DD/YYYY"
                  />
                </div>
              </>
            )}

          </div>
        </div>

        {/* Save and Cancel Buttons */}
        {isEditing && (
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px"
          }}>
            <button
              style={{
                padding: "10px 20px",
                backgroundColor: "white",
                color: "#667085",
                border: "1px solid #E5E7EB",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 500,
                transition: "all 0.2s ease"
              }}
              onClick={handleCancel}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#F9FAFB";
                e.currentTarget.style.borderColor = "#D1D5DB";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.borderColor = "#E5E7EB";
              }}
            >
              Cancel
            </button>
            <button
              style={{
                padding: "10px 20px",
                backgroundColor: "var(--neuron-brand-green)",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 500
              }}
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Component for Fields
function Field({ 
  label, 
  value, 
  icon,
  fieldName,
  onChange,
  isEditing,
  placeholder,
  type = "text"
}: { 
  label: string; 
  value?: string | number | null; 
  icon?: React.ReactNode;
  fieldName?: string;
  onChange?: (field: string, value: any) => void;
  isEditing?: boolean;
  placeholder?: string;
  type?: "text" | "date";
}) {
  // Helper to format date for display
  const formatDate = (dateStr?: string | number | null) => {
    if (!dateStr) return undefined;
    const date = new Date(dateStr as string);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  // Helper to ensure date is ISO for DatePicker
  const toIsoDate = (dateStr?: string | number | null) => {
    if (!dateStr) return "";
    const str = String(dateStr);
    // If already YYYY-MM-DD
    if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return str;
    // If MM/DD/YYYY
    if (str.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [mm, dd, yyyy] = str.split('/');
      return `${yyyy}-${mm}-${dd}`;
    }
    // Try Date parse
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    return "";
  };

  if (!isEditing) {
    const displayValue = type === "date" ? formatDate(value) : value;
    return (
      <div>
        <label style={{
          display: "block",
          fontSize: "13px",
          fontWeight: 500,
          color: "var(--neuron-ink-base)",
          marginBottom: "8px"
        }}>
          {label}
        </label>
        <div style={{
          padding: "10px 14px",
          backgroundColor: "#F9FAFB",
          border: "1px solid var(--neuron-ui-border)",
          borderRadius: "6px",
          fontSize: "14px",
          color: displayValue ? "var(--neuron-ink-primary)" : "#9CA3AF",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          {icon && <span style={{ color: "var(--neuron-ink-muted)", flexShrink: 0 }}>{icon}</span>}
          <span>{displayValue || "—"}</span>
        </div>
      </div>
    );
  }

  // Editing mode
  return (
    <div>
      <label style={{
        display: "block",
        fontSize: "13px",
        fontWeight: 500,
        color: "var(--neuron-ink-base)",
        marginBottom: "8px"
      }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        {type === "date" ? (
          <div style={{ position: "relative" }}>
             <DatePicker
              value={toIsoDate(value)}
              onChange={(val) => onChange?.(fieldName!, val)}
              placeholder={placeholder || "MM/DD/YYYY"}
              style={{
                width: "100%",
                padding: icon ? "10px 14px 10px 38px" : "10px 14px",
                border: "1px solid var(--neuron-ui-border)",
                borderRadius: "6px",
                fontSize: "14px",
                color: "var(--neuron-ink-primary)",
                backgroundColor: "white"
              }}
            />
            {icon && (
              <span style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--neuron-ink-muted)",
                pointerEvents: "none",
                zIndex: 10
              }}>
                {icon}
              </span>
            )}
          </div>
        ) : (
          <>
            {icon && (
              <span style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--neuron-ink-muted)",
                pointerEvents: "none"
              }}>
                {icon}
              </span>
            )}
            <input
              type="text"
              value={value || ""}
              onChange={(e) => onChange?.(fieldName!, e.target.value)}
              placeholder={placeholder || "—"}
              style={{
                width: "100%",
                padding: icon ? "10px 14px 10px 38px" : "10px 14px",
                border: "1px solid var(--neuron-ui-border)",
                borderRadius: "6px",
                fontSize: "14px",
                color: "var(--neuron-ink-primary)",
                backgroundColor: "white"
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}