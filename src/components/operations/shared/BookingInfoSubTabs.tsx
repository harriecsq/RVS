import { useState } from "react";
import { FileText, Plus } from "lucide-react";
import { SubTabRow } from "./SubTabRow";

type BookingInfoSubTab = "booking-details" | "form-e" | "fsi";

interface BookingInfoSubTabsProps {
  bookingId: string;
  currentUser?: { name: string; email: string; department: string } | null;
  /** The existing BookingInformationTab content rendered as children */
  children: React.ReactNode;
}

const subTabs = [
  { id: "booking-details", label: "Booking Details" },
  { id: "form-e", label: "Form E" },
  { id: "fsi", label: "FSI" },
];

/** Placeholder empty state matching TruckingTab's "no record" design */
function EmptyDocumentState({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ padding: "32px 48px" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "280px",
        }}
      >
        <FileText size={44} style={{ color: "#D1D5DB", marginBottom: "14px" }} />
        <p style={{ fontSize: "15px", fontWeight: 600, color: "#12332B", margin: "0 0 6px" }}>
          No {title} record
        </p>
        <p style={{ fontSize: "13px", color: "#667085", margin: "0 0 16px" }}>
          {description}
        </p>
        <button
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
          onClick={() => {
            // Placeholder — future implementation
          }}
        >
          <Plus size={15} /> Create {title}
        </button>
      </div>
    </div>
  );
}

export function BookingInfoSubTabs({
  bookingId,
  currentUser,
  children,
}: BookingInfoSubTabsProps) {
  const [activeSubTab, setActiveSubTab] = useState<BookingInfoSubTab>("booking-details");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Sub-tab row */}
      <SubTabRow
        tabs={subTabs}
        activeTab={activeSubTab}
        onTabChange={(id) => setActiveSubTab(id as BookingInfoSubTab)}
      />

      {/* Sub-tab content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {activeSubTab === "booking-details" && children}

        {activeSubTab === "form-e" && (
          <EmptyDocumentState
            title="Form E"
            description="Create a Form E certificate of origin for this booking."
          />
        )}

        {activeSubTab === "fsi" && (
          <EmptyDocumentState
            title="FSI"
            description="Create a Final Shipping Instruction for this booking."
          />
        )}
      </div>
    </div>
  );
}