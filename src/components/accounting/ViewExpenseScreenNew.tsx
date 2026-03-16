import React, { useState, useEffect } from "react";
import { ArrowLeft, Edit3, Clock } from "lucide-react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { toast } from "sonner@2.0.3";
import { formatAmount } from "../../utils/formatAmount";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8`;

interface ViewExpenseScreenProps {
  expenseId: string;
  onBack: () => void;
  onDeleted: () => void;
}

interface ExpenseData {
  id: string;
  expenseNumber: string;
  projectId: string;
  projectNumber?: string;
  bookingIds: string[];
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
  charges?: Array<{
    category: string;
    description: string;
    amount: number;
  }>;
}

interface Booking {
  id: string;
  bookingNumber?: string;
  booking_number?: string;
  clientName?: string;
  client_name?: string;
}

interface Project {
  id: string;
  projectNumber?: string;
  project_number?: string;
  movement?: string;
}

export function ViewExpenseScreen({ expenseId, onBack, onDeleted }: ViewExpenseScreenProps) {
  const [expense, setExpense] = useState<ExpenseData | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedExpense, setEditedExpense] = useState<ExpenseData | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    fetchExpenseDetails();
  }, [expenseId]);

  const fetchExpenseDetails = async () => {
    setIsLoading(true);
    try {
      // Fetch expense details
      const expenseResponse = await fetch(`${API_URL}/expenses/${expenseId}`, {
        headers: {
          "Authorization": `Bearer ${publicAnonKey}`,
        },
      });

      if (!expenseResponse.ok) {
        throw new Error("Failed to fetch expense details");
      }

      const expenseResult = await expenseResponse.json();
      
      if (expenseResult.success && expenseResult.data) {
        const expenseData = expenseResult.data;
        setExpense(expenseData);
        setEditedExpense(expenseData);

        // Fetch project details
        if (expenseData.projectId) {
          const projectResponse = await fetch(`${API_URL}/projects/${expenseData.projectId}`, {
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

        // Fetch booking details
        if (expenseData.bookingIds && expenseData.bookingIds.length > 0) {
          const bookingPromises = expenseData.bookingIds.map(async (bookingId: string) => {
            // Try different booking type endpoints
            const endpoints = [
              `${API_URL}/forwarding-bookings/${bookingId}`,
              `${API_URL}/trucking-bookings/${bookingId}`,
              `${API_URL}/marine-insurance-bookings/${bookingId}`,
              `${API_URL}/brokerage-bookings/${bookingId}`,
              `${API_URL}/others-bookings/${bookingId}`,
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
                    return result.data;
                  }
                }
              } catch (error) {
                continue;
              }
            }
            return null;
          });

          const bookingResults = await Promise.all(bookingPromises);
          setBookings(bookingResults.filter((b): b is Booking => b !== null));
        }
      }
    } catch (error) {
      console.error("Error fetching expense details:", error);
      toast.error("Failed to load expense details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editedExpense) return;

    setIsEditing(false);
    try {
      const response = await fetch(`${API_URL}/expenses/${expenseId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editedExpense),
      });

      if (!response.ok) {
        throw new Error("Failed to update expense");
      }

      const result = await response.json();
      if (result.success && result.data) {
        setExpense(result.data);
        toast.success("Changes saved successfully");
      } else {
        toast.error("Failed to update expense");
      }
    } catch (error) {
      console.error("Error updating expense:", error);
      toast.error("Failed to update expense");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedExpense(expense);
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
        <div style={{ color: "#DC2626" }}>Expense not found</div>
        <button onClick={onBack} style={{ marginTop: "16px" }}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Expenses
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex",
      flexDirection: "column",
      background: "#F9FAFB" 
    }}>
      {/* Header */}
      <div style={{ 
        background: "white",
        borderBottom: "1px solid #E5E9F0",
        padding: "20px 48px"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Left side - Back button and Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
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
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#F3F4F6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <ArrowLeft size={20} />
            </button>
            
            <h1 style={{ 
              fontSize: "20px", 
              fontWeight: 600, 
              color: "#12332B", 
              margin: 0
            }}>
              {expense.expenseNumber}
            </h1>
          </div>

          {/* Right side - Action Buttons */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {/* Activity Timeline Button */}
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                backgroundColor: showTimeline ? "#E8F2EE" : "white",
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

            {/* Status Badge */}
            <div style={{
              padding: "8px 16px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 500,
              backgroundColor: expense.status === "Draft" ? "#F3F4F6" : 
                             expense.status === "For Approval" ? "#FEF3C7" :
                             expense.status === "Approved" ? "#D1FAE5" :
                             expense.status === "Completed" ? "#D1FAE5" :
                             expense.status === "Partially Paid" ? "#FEF3C7" :
                             expense.status === "Cancelled" ? "#FEE2E2" : "#F3F4F6",
              color: expense.status === "Draft" ? "#6B7280" :
                     expense.status === "For Approval" ? "#F59E0B" :
                     expense.status === "Approved" ? "#10B981" :
                     expense.status === "Completed" ? "#10B981" :
                     expense.status === "Partially Paid" ? "#F59E0B" :
                     expense.status === "Cancelled" ? "#EF4444" : "#6B7280",
              border: `1px solid ${expense.status === "Draft" ? "#E5E7EB" : 
                                   expense.status === "For Approval" ? "#FCD34D" :
                                   expense.status === "Approved" ? "#10B98133" :
                                   expense.status === "Completed" ? "#10B98133" :
                                   expense.status === "Partially Paid" ? "#FCD34D" :
                                   expense.status === "Cancelled" ? "#EF444433" : "#E5E7EB"}`
            }}>
              {expense.status}
            </div>

            {/* Edit Expense Button - Only show when not editing */}
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  backgroundColor: "white",
                  border: "1.5px solid #E5E9F0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#667085",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#F9FAFB";
                  e.currentTarget.style.borderColor = "#0F766E";
                  e.currentTarget.style.color = "#0F766E";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#E5E9F0";
                  e.currentTarget.style.color = "#667085";
                }}
              >
                <Edit3 size={16} />
                Edit Expense
              </button>
            )}

            {/* Show Save/Cancel buttons when editing */}
            {isEditing && (
              <>
                <button
                  onClick={handleCancel}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 20px",
                    backgroundColor: "white",
                    border: "1.5px solid #E5E9F0",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#667085",
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
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 20px",
                    backgroundColor: "#0F766E",
                    border: "1.5px solid #0F766E",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "white",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#0D6962";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#0F766E";
                  }}
                >
                  Save Changes
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ 
        flex: 1,
        overflow: "auto",
        padding: "32px 48px",
        background: "#F9FAFB"
      }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          {/* Expense Information Card */}
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "32px",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
            marginBottom: "24px"
          }}>
            <h3 style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "#0F766E",
              marginBottom: "24px"
            }}>
              Expense Information
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
              <div>
                <div style={{ fontSize: "13px", color: "#667085", marginBottom: "8px", fontWeight: 500 }}>
                  Date
                </div>
                {isEditing ? (
                  <input
                    type="date"
                    value={editedExpense?.expenseDate || ""}
                    onChange={(e) => setEditedExpense({ ...editedExpense!, expenseDate: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      fontSize: "14px",
                      color: "#12332B",
                      background: "white",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px"
                    }}
                  />
                ) : (
                  <div style={{
                    padding: "10px 12px",
                    fontSize: "14px",
                    color: "#12332B",
                    background: "#F9FAFB",
                    border: "1px solid #E5E9F0",
                    borderRadius: "8px"
                  }}>
                    {formatDate(expense.expenseDate)}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: "13px", color: "#667085", marginBottom: "8px", fontWeight: 500 }}>
                  Expense No.
                </div>
                <div style={{
                  padding: "10px 12px",
                  fontSize: "14px",
                  color: "#12332B",
                  background: "#F9FAFB",
                  border: "1px solid #E5E9F0",
                  borderRadius: "8px"
                }}>
                  {expense.expenseNumber}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "13px", color: "#667085", marginBottom: "8px", fontWeight: 500 }}>
                Link to Project
              </div>
              <div style={{
                padding: "10px 12px",
                fontSize: "14px",
                color: "#12332B",
                background: "#F9FAFB",
                border: "1px solid #E5E9F0",
                borderRadius: "8px"
              }}>
                {project?.projectNumber || project?.project_number || "—"}
              </div>
            </div>
          </div>

          {/* Payment Details Card */}
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "32px",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
            marginBottom: "24px"
          }}>
            <h3 style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "#0F766E",
              marginBottom: "24px"
            }}>
              Payment Details
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <div style={{ fontSize: "13px", color: "#667085", marginBottom: "8px", fontWeight: 500 }}>
                  Category
                </div>
                {isEditing ? (
                  <input
                    value={editedExpense?.category || ""}
                    onChange={(e) => setEditedExpense({ ...editedExpense!, category: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      fontSize: "14px",
                      color: "#12332B",
                      background: "white",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px"
                    }}
                  />
                ) : (
                  <div style={{
                    padding: "10px 12px",
                    fontSize: "14px",
                    color: "#12332B",
                    background: "#F9FAFB",
                    border: "1px solid #E5E9F0",
                    borderRadius: "8px"
                  }}>
                    {expense.category || "—"}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: "13px", color: "#667085", marginBottom: "8px", fontWeight: 500 }}>
                  Amount
                </div>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedExpense?.amount || ""}
                    onChange={(e) => setEditedExpense({ ...editedExpense!, amount: parseFloat(e.target.value) })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      fontSize: "14px",
                      color: "#12332B",
                      background: "white",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px"
                    }}
                  />
                ) : (
                  <div style={{
                    padding: "10px 12px",
                    fontSize: "14px",
                    color: "#12332B",
                    background: "#F9FAFB",
                    border: "1px solid #E5E9F0",
                    borderRadius: "8px",
                    fontWeight: 600
                  }}>
                    ₱{formatAmount(expense.amount)}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: "13px", color: "#667085", marginBottom: "8px", fontWeight: 500 }}>
                  Vendor
                </div>
                {isEditing ? (
                  <input
                    value={editedExpense?.vendor || ""}
                    onChange={(e) => setEditedExpense({ ...editedExpense!, vendor: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      fontSize: "14px",
                      color: "#12332B",
                      background: "white",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px"
                    }}
                  />
                ) : (
                  <div style={{
                    padding: "10px 12px",
                    fontSize: "14px",
                    color: "#12332B",
                    background: "#F9FAFB",
                    border: "1px solid #E5E9F0",
                    borderRadius: "8px"
                  }}>
                    {expense.vendor || "—"}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: "13px", color: "#667085", marginBottom: "8px", fontWeight: 500 }}>
                  Payment Method
                </div>
                {isEditing ? (
                  <select
                    value={editedExpense?.paymentMethod || ""}
                    onChange={(e) => setEditedExpense({ ...editedExpense!, paymentMethod: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      fontSize: "14px",
                      color: "#12332B",
                      background: "white",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px"
                    }}
                  >
                    <option value="">Select payment method</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Check">Check</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                  </select>
                ) : (
                  <div style={{
                    padding: "10px 12px",
                    fontSize: "14px",
                    color: "#12332B",
                    background: "#F9FAFB",
                    border: "1px solid #E5E9F0",
                    borderRadius: "8px"
                  }}>
                    {expense.paymentMethod || "—"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Linked Bookings - Show only if there are bookings */}
          {bookings.length > 0 && (
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "32px",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)"
            }}>
              <h3 style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#0F766E",
                marginBottom: "24px"
              }}>
                Linked Bookings
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    style={{ 
                      padding: "16px",
                      background: "#F9FAFB",
                      border: "1px solid #E5E9F0",
                      borderRadius: "8px"
                    }}
                  >
                    <div style={{ fontSize: "14px", color: "#12332B", fontWeight: 600, marginBottom: "4px" }}>
                      {booking.bookingNumber || booking.booking_number || "—"}
                    </div>
                    <div style={{ fontSize: "13px", color: "#667085" }}>
                      {booking.clientName || booking.client_name || "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}