/**
 * TruckingTab — embedded tab inside Import/Export booking details.
 * Since each booking can only have 1 trucking record, this tab directly
 * renders the TruckingRecordDetails view instead of a table list.
 * If no trucking record exists yet, shows an empty state with a create button.
 */
import { useState, useEffect } from "react";
import { Plus, Truck } from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { toast } from "../../ui/toast-utils";
import { CreateTruckingModal } from "../CreateTruckingModal";
import { TruckingRecordDetails } from "../TruckingRecordDetails";
import type { TruckingRecord } from "../CreateTruckingModal";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8`;

interface TruckingTabProps {
  bookingId: string;
  bookingType: string;
  currentUser?: { name: string; email: string; department: string } | null;
}

export function TruckingTab({ bookingId, bookingType, currentUser }: TruckingTabProps) {
  const [record, setRecord] = useState<TruckingRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetchRecord();
  }, [bookingId]);

  const fetchRecord = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/trucking-records?linkedBookingId=${bookingId}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const result = await res.json();
      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        // Since each booking can only have 1 trucking record, take the first one
        setRecord(result.data[0]);
      } else {
        setRecord(null);
      }
    } catch (err) {
      console.error("Error fetching trucking record for booking:", err);
      setRecord(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaved = () => {
    setShowCreate(false);
    fetchRecord();
    toast.success("Trucking record saved");
  };

  // Loading state
  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px" }}>
        <p style={{ color: "#667085", fontSize: "14px" }}>Loading trucking record...</p>
      </div>
    );
  }

  // No record — empty state with create button
  if (!record) {
    return (
      <div style={{ padding: "32px 48px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "280px" }}>
          <Truck size={44} style={{ color: "#D1D5DB", marginBottom: "14px" }} />
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#12332B", margin: "0 0 6px" }}>No trucking record</p>
          <p style={{ fontSize: "13px", color: "#667085", margin: "0 0 16px" }}>
            Add a trucking assignment for this booking.
          </p>
          <button
            onClick={() => setShowCreate(true)}
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
              color: "#FFFFFF",
              cursor: "pointer",
            }}
          >
            <Plus size={15} /> New Trucking
          </button>
        </div>

        <CreateTruckingModal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          onSaved={handleSaved}
          prefillBookingId={bookingId}
          prefillBookingType={bookingType}
        />
      </div>
    );
  }

  // Record exists — render full detail view inline (embedded)
  return (
    <>
      <TruckingRecordDetails
        record={record}
        onBack={() => {
          // In embedded mode, "back" after delete should refresh to show empty state
          setRecord(null);
          fetchRecord();
        }}
        onUpdate={fetchRecord}
        currentUser={currentUser}
        embedded
      />

      {/* Create Modal — available in case record was deleted and user wants to create again */}
      <CreateTruckingModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={handleSaved}
        prefillBookingId={bookingId}
        prefillBookingType={bookingType}
      />
    </>
  );
}
