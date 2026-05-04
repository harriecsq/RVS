import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";

interface ReportItem {
  id: string;
  name: string;
  description: string;
  path: string;
}

const operationsReports: ReportItem[] = [
];

const accountingReports: ReportItem[] = [
  {
    id: "container-refund",
    name: "Container Refund Monitoring",
    description: "Track container return status and deposit refunds.",
    path: "/reports/container-refund"
  },
  {
    id: "expenses-summary",
    name: "Expenses Summary",
    description: "View summarized operational expense data.",
    path: "/reports/expenses-summary"
  },
  {
    id: "final-shipment-cost",
    name: "Final Shipment Cost",
    description: "Analyze shipment-level revenue, costs, and profit.",
    path: "/reports/final-shipment-cost"
  },
  {
    id: "profit-loss",
    name: "In-depth Profit/Loss",
    description: "Detailed profitability breakdown by shipment.",
    path: "/reports/profit-loss"
  },
  {
    id: "profit-loss-period",
    name: "Profit/Loss per Period",
    description: "Analyze total revenue, costs, and profit across a selected date range.",
    path: "/reports/profit-loss-period"
  },
  {
    id: "soa-payment-monitoring",
    name: "SOA Payment Monitoring",
    description: "Track billing payments, check details, and collection status.",
    path: "/reports/soa-payment-monitoring"
  }
];

function ReportRow({ item, onClick }: { item: ReportItem; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 24px",
        backgroundColor: "white",
        borderBottom: "1px solid var(--neuron-ui-border)",
        cursor: "pointer",
        transition: "background-color 0.15s ease"
      }}
      className="group hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl last:border-b-0"
    >
      <div>
        <div style={{ 
          fontSize: "15px", 
          fontWeight: 600, 
          color: "#0A1D4D",
          marginBottom: "4px" 
        }}>
          {item.name}
        </div>
        <div style={{ 
          fontSize: "13px", 
          color: "#667085",
          lineHeight: "1.4"
        }}>
          {item.description}
        </div>
      </div>
      <ChevronRight size={18} className="text-gray-400 group-hover:text-gray-600" />
    </div>
  );
}

export function Reports() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
      {/* Header */}
      <div style={{ padding: "32px 48px 0 48px", maxWidth: "1000px", margin: "0 auto" }}>
        <h1 style={{ 
          fontSize: "32px", 
          fontWeight: 600, 
          color: "#0A1D4D", 
          marginBottom: "4px",
          letterSpacing: "-1.2px"
        }}>
          Reports
        </h1>
        <p style={{ 
          fontSize: "14px", 
          color: "#667085"
        }}>
          Select a report to view operational or financial data.
        </p>
      </div>

      <div style={{ height: "48px" }}></div>

      {/* Content */}
      <div style={{ padding: "0 48px 48px 48px", maxWidth: "1000px", margin: "0 auto" }}>
        
        <div>
          <div style={{ 
            border: "1px solid var(--neuron-ui-border)", 
            borderRadius: "12px",
            overflow: "hidden"
          }}>
            {[...operationsReports, ...accountingReports].map((report) => (
              <ReportRow 
                key={report.id} 
                item={report} 
                onClick={() => navigate(report.path)} 
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}