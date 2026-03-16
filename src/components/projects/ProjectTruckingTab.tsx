import { useState, useEffect } from "react";
import { Truck, Calendar, MapPin, Package } from "lucide-react";
import type { Project } from "../../types/pricing";
import type { TruckingLeg } from "../../types/operations";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { NeuronStatusPill } from "../NeuronStatusPill";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ce0d67b8`;

interface ProjectTruckingTabProps {
  project: Project;
}

export function ProjectTruckingTab({ project }: ProjectTruckingTabProps) {
  const [truckingLegs, setTruckingLegs] = useState<TruckingLeg[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchProjectTruckingLegs();
  }, [project.id]);

  const fetchProjectTruckingLegs = async () => {
    setIsLoading(true);
    try {
      // Fetch all bookings for this project
      const bookingsResponse = await fetch(`${API_URL}/projects/${project.id}/bookings`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });

      const bookingsResult = await bookingsResponse.json();
      if (!bookingsResult.success) {
        console.error("Failed to fetch bookings:", bookingsResult.error);
        return;
      }

      const bookings = bookingsResult.data;

      // Fetch trucking legs for each booking
      const allTruckingLegs: TruckingLeg[] = [];
      
      for (const booking of bookings) {
        const bookingId = booking.bookingId || booking.booking_number || booking.id;
        const bookingType = booking.booking_type?.toLowerCase() || "export";
        
        try {
          const response = await fetch(
            `${API_URL}/trucking-legs?bookingId=${bookingId}&bookingType=${bookingType}`,
            {
              headers: {
                Authorization: `Bearer ${publicAnonKey}`,
              },
            }
          );

          const result = await response.json();
          if (result.success && result.data) {
            // Add booking reference to each leg
            const legsWithBooking = result.data.map((leg: TruckingLeg) => ({
              ...leg,
              bookingReference: bookingId,
            }));
            allTruckingLegs.push(...legsWithBooking);
          }
        } catch (error) {
          console.error(`Error fetching trucking legs for booking ${bookingId}:`, error);
        }
      }

      setTruckingLegs(allTruckingLegs);
    } catch (error) {
      console.error("Error fetching project trucking legs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return { bg: "#E8F5E9", text: "#2E7D32" };
      case "In Transit":
        return { bg: "#E3F2FD", text: "#1565C0" };
      case "Scheduled":
        return { bg: "#FFF3E0", text: "#E65100" };
      default:
        return { bg: "#F5F5F5", text: "#616161" };
    }
  };

  if (isLoading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "400px",
        color: "var(--neuron-ink-muted)"
      }}>
        Loading trucking data...
      </div>
    );
  }

  if (truckingLegs.length === 0) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "400px",
        gap: "16px"
      }}>
        <Truck size={48} color="var(--neuron-ink-muted)" />
        <p style={{
          fontSize: "16px",
          color: "var(--neuron-ink-muted)",
          textAlign: "center"
        }}>
          No trucking operations for this project yet
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 48px" }}>
      <div style={{
        marginBottom: "24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div>
          <h2 style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "var(--neuron-ink-primary)",
            marginBottom: "4px"
          }}>
            Trucking Operations
          </h2>
          <p style={{
            fontSize: "14px",
            color: "var(--neuron-ink-muted)",
            margin: 0
          }}>
            {truckingLegs.length} trucking {truckingLegs.length === 1 ? "leg" : "legs"} across all bookings
          </p>
        </div>
      </div>

      {/* Trucking Legs Grid */}
      <div style={{
        display: "grid",
        gap: "16px"
      }}>
        {truckingLegs.map((leg: any) => (
          <div
            key={leg.id}
            style={{
              background: "white",
              border: "1px solid var(--neuron-ui-border)",
              borderRadius: "8px",
              padding: "20px",
              transition: "all 0.2s ease"
            }}
          >
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "start",
              marginBottom: "16px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "#F0FDF4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Truck size={20} color="#0F766E" />
                </div>
                <div>
                  <div style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "var(--neuron-ink-primary)",
                    marginBottom: "4px"
                  }}>
                    {leg.origin} → {leg.destination}
                  </div>
                  <div style={{
                    fontSize: "13px",
                    color: "var(--neuron-ink-muted)"
                  }}>
                    Booking: {leg.bookingReference}
                  </div>
                </div>
              </div>

              <NeuronStatusPill
                status={leg.status || "Scheduled"}
                type="execution"
              />
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "16px",
              paddingTop: "16px",
              borderTop: "1px solid #E5E7EB"
            }}>
              <div>
                <div style={{
                  fontSize: "12px",
                  color: "var(--neuron-ink-muted)",
                  marginBottom: "4px"
                }}>
                  Pickup Date
                </div>
                <div style={{
                  fontSize: "14px",
                  color: "var(--neuron-ink-primary)",
                  fontWeight: 500
                }}>
                  {leg.pickupDate ? new Date(leg.pickupDate).toLocaleDateString() : "—"}
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: "12px",
                  color: "var(--neuron-ink-muted)",
                  marginBottom: "4px"
                }}>
                  Delivery Date
                </div>
                <div style={{
                  fontSize: "14px",
                  color: "var(--neuron-ink-primary)",
                  fontWeight: 500
                }}>
                  {leg.deliveryDate ? new Date(leg.deliveryDate).toLocaleDateString() : "—"}
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: "12px",
                  color: "var(--neuron-ink-muted)",
                  marginBottom: "4px"
                }}>
                  Truck Type
                </div>
                <div style={{
                  fontSize: "14px",
                  color: "var(--neuron-ink-primary)",
                  fontWeight: 500
                }}>
                  {leg.truckType || "—"}
                </div>
              </div>
            </div>

            {leg.notes && (
              <div style={{
                marginTop: "12px",
                padding: "12px",
                background: "#F9FAFB",
                borderRadius: "6px",
                fontSize: "13px",
                color: "var(--neuron-ink-secondary)"
              }}>
                {leg.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}