import { NeuronStatusPill } from "./NeuronStatusPill";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { formatAmount } from "../utils/formatAmount";
import { API_BASE_URL } from '@/utils/api-config';

interface Client {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address?: string;
  defaultOrigin: string;
  defaultDestination: string;
  modes: Array<"Air" | "Sea" | "Truck" | "Domestic">;
  notes: string;
  activeBookings: number;
  totalBookings: number;
  lastActivity: string;
  dateAdded: string;
  totalRevenue: number;
  preferredSchedule?: string;
}

interface ClientBooking {
  id: string;
  trackingNo: string;
  route: string;
  mode: string;
  date: string;
  status: "For Delivery" | "In Transit" | "Delivered" | "Closed";
  profit: number;
}

interface BookingTemplate {
  id: string;
  templateName: string;
  mode: string;
  route: string;
  notes: string;
  frequency?: string;
  lastUsed?: string;
}

interface Booking {
  id: string;
  trackingNo: string;
  client: string;
  pickup: string;
  dropoff: string;
  status: "Created" | "For Delivery" | "In Transit" | "Delivered" | "Cancelled" | "Closed";
  deliveryDate: string;
  deliveryType?: "Import" | "Export" | "Domestic";
  delivered_at?: string;
  profit: number;
  driver?: string;
  vehicle?: string;
  notes?: string;
}

interface ClientFullViewProps {
  clientId: string;
  bookings?: Booking[];
  onBack: () => void;
  onCreateBooking?: (templateId?: string) => void;
  onViewBooking?: (bookingId: string) => void;
}

// Status pill component
function StatusPill({ status }: { status: ClientBooking["status"] }) {
  const statusConfig = {
    "For Delivery": { color: "#0A1D4D", bg: "#E8EAF6" },
    "In Transit": { color: "#F25C05", bg: "#FFF3E0" },
    "Delivered": { color: "#10b981", bg: "#E8F5E9" },
    "Closed": { color: "#6B7280", bg: "#F9FAFB" },
  };

  const config = statusConfig[status];

  return (
    <div 
      className="inline-flex items-center px-3 py-1.5 rounded-full text-xs"
      style={{
        backgroundColor: config.bg,
        color: config.color,
      }}
    >
      {status}
    </div>
  );
}

export function ClientFullView({ clientId, bookings: allBookingsFromApp = [], onBack, onCreateBooking, onViewBooking }: ClientFullViewProps) {
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [showLoadTemplateModal, setShowLoadTemplateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [bookingFilter, setBookingFilter] = useState("all");
  
  // New states for Requests and Projects
  const [exportBookings, setExportBookings] = useState<ExportBooking[]>([]);
  const [importBookings, setImportBookings] = useState<ImportBooking[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [activeTab, setActiveTab] = useState("requests");

  // Form state for New Booking modal
  const [bookingFormData, setBookingFormData] = useState({
    shipmentType: "",
    origin: "",
    destination: "",
    mode: "",
    deliveryDate: "",
    notes: "",
  });

  // Mock client data
  const client: Client = {
    id: clientId,
    name: "Acme Trading Corp",
    contactPerson: "Maria Santos",
    phone: "+63 917 123 4567",
    email: "maria.santos@acm.com.ph",
    address: "Mall of Asia Complex, Pasay City, Metro Manila",
    defaultOrigin: "Manila",
    defaultDestination: "Cebu",
    modes: ["Sea", "Air"],
    notes: "Prefers morning deliveries. Temperature-controlled goods.",
    activeBookings: 2,
    totalBookings: 72,
    lastActivity: "Oct 20, 2025",
    dateAdded: "Jan 15, 2024",
    totalRevenue: 1250000,
    preferredSchedule: "Mondays & Thursdays",
  };

  // Fetch Export and Import bookings for this client
  const fetchRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const [exportRes, importRes] = await Promise.all([
        fetch(`${API_BASE_URL}/export-bookings`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` }
        }),
        fetch(`${API_BASE_URL}/import-bookings`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` }
        })
      ]);

      if (exportRes.ok) {
        const exportData = await exportRes.json();
        // Filter by client name
        const clientExports = exportData.filter((b: ExportBooking) => 
          b.customerName?.toLowerCase().includes(client.name.toLowerCase()) ||
          client.name.toLowerCase().includes(b.customerName?.toLowerCase())
        );
        setExportBookings(clientExports);
      }

      if (importRes.ok) {
        const importData = await importRes.json();
        // Filter by client name
        const clientImports = importData.filter((b: ImportBooking) => 
          b.customerName?.toLowerCase().includes(client.name.toLowerCase()) ||
          client.name.toLowerCase().includes(b.customerName?.toLowerCase())
        );
        setImportBookings(clientImports);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load requests");
    } finally {
      setIsLoadingRequests(false);
    }
  };

  // Fetch Projects for this client
  const fetchProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const response = await fetch(`${API_BASE_URL}/projects`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` }
      });

      if (response.ok) {
        const data = await response.json();
        // Filter by client name
        const clientProjects = data.filter((p: Project) => 
          p.client_name?.toLowerCase().includes(client.name.toLowerCase()) ||
          client.name.toLowerCase().includes(p.client_name?.toLowerCase())
        );
        setProjects(clientProjects);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchRequests();
    fetchProjects();
  }, []);

  // Mock bookings data for Acme Trading Corp
  const mockBookings: Booking[] = [
    {
      id: "bk001",
      trackingNo: "LCL-IMPS-003-AIR",
      client: "Acme Trading Corp",
      pickup: "Busan",
      dropoff: "Manila",
      status: "For Delivery",
      deliveryDate: "2025-10-26",
      deliveryType: "Import",
      profit: 45000,
      driver: "Juan Dela Cruz",
      vehicle: "CebuPac Flight 101",
      notes: "Temperature-controlled container"
    },
    {
      id: "bk002",
      trackingNo: "FCL-EXPS-012-SEA",
      client: "Acme Trading Corp",
      pickup: "Manila",
      dropoff: "Singapore",
      status: "In Transit",
      deliveryDate: "2025-11-22",
      deliveryType: "Export",
      profit: 28000,
      driver: "Pedro Santos",
      vehicle: "MV Pacific Star",
      notes: "Express delivery - Priority handling"
    },
    {
      id: "bk003",
      trackingNo: "LCL-IMPS-008-SEA",
      client: "Acme Trading Corp",
      pickup: "Shanghai",
      dropoff: "Manila",
      status: "Delivered",
      deliveryDate: "2025-11-15",
      deliveryType: "Import",
      delivered_at: "2025-11-15T10:30:00",
      profit: 52000,
      driver: "Ricardo Gomez",
      vehicle: "MV Ocean Wave",
      notes: "FCL - 40ft container"
    },
    {
      id: "bk004",
      trackingNo: "FCL-IMPS-015-AIR",
      client: "Acme Trading Corp",
      pickup: "Hong Kong",
      dropoff: "Manila",
      status: "Delivered",
      deliveryDate: "2025-11-10",
      deliveryType: "Import",
      delivered_at: "2025-11-10T14:20:00",
      profit: 31000,
      driver: "Anna Reyes",
      vehicle: "PAL Flight 302",
      notes: "Fragile items - Handle with care"
    },
    {
      id: "bk005",
      trackingNo: "LCL-EXPS-009-SEA",
      client: "Acme Trading Corp",
      pickup: "Manila",
      dropoff: "Jakarta",
      status: "Closed",
      deliveryDate: "2025-11-05",
      deliveryType: "Export",
      delivered_at: "2025-11-05T09:15:00",
      profit: 38000,
      driver: "Miguel Torres",
      vehicle: "MV Island Express",
      notes: "Standard shipment"
    },
    {
      id: "bk006",
      trackingNo: "FCL-IMPS-007-SEA",
      client: "Acme Trading Corp",
      pickup: "Ningbo",
      dropoff: "Manila",
      status: "Closed",
      deliveryDate: "2025-10-28",
      deliveryType: "Import",
      delivered_at: "2025-10-28T16:45:00",
      profit: 15000,
      driver: "Carlos Fernandez",
      vehicle: "MV Asia Carrier",
      notes: "Local delivery"
    }
  ];

  // Merge mock bookings with any passed bookings from app
  const combinedBookings = allBookingsFromApp.length > 0 ? allBookingsFromApp : mockBookings;

  // Filter bookings for this client (flexible matching to handle partial names)
  const clientBookings = combinedBookings.filter(b => {
    const bookingClient = b.client.toLowerCase();
    const fullClientName = client.name.toLowerCase();
    // Match if booking client is in full name or vice versa
    return fullClientName.includes(bookingClient) || bookingClient.includes(fullClientName.split(' ')[0]);
  });
  
  // Convert booking data to display format
  const allBookings: ClientBooking[] = clientBookings.map(booking => ({
    id: booking.id,
    trackingNo: booking.trackingNo,
    route: `${booking.pickup} → ${booking.dropoff}`,
    mode: booking.trackingNo.includes("SEA") ? "Sea" : booking.trackingNo.includes("AIR") ? "Air" : booking.trackingNo.includes("TRK") ? "Truck" : "Sea",
    date: new Date(booking.deliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    status: booking.status === "Created" ? "For Delivery" : booking.status === "Cancelled" ? "Closed" : booking.status as ClientBooking["status"],
    profit: booking.profit,
  }));

  // Mock booking templates
  const bookingTemplates: BookingTemplate[] = [
    { 
      id: "p1", 
      templateName: "Standard Retail Shipment", 
      mode: "Sea", 
      route: "Manila → Cebu", 
      notes: "Temperature-controlled container",
      frequency: "Weekly",
      lastUsed: "Oct 15, 2025"
    },
    { 
      id: "p2", 
      templateName: "Express Delivery", 
      mode: "Air", 
      route: "Manila → Cebu", 
      notes: "Priority handling required",
      frequency: "As needed",
      lastUsed: "Oct 10, 2025"
    },
    { 
      id: "p3", 
      templateName: "Bulk Container", 
      mode: "Sea", 
      route: "Manila → Davao", 
      notes: "FCL - 40ft container",
      frequency: "Monthly",
      lastUsed: "Oct 1, 2025"
    },
    { 
      id: "p4", 
      templateName: "Temperature Controlled", 
      mode: "Air", 
      route: "Manila → Cebu", 
      notes: "Refrigerated cargo, maintain 2-8°C",
      frequency: "Bi-weekly",
      lastUsed: "Sep 28, 2025"
    },
  ];

  // Filter bookings based on status
  const filteredBookings = bookingFilter === "all" 
    ? allBookings 
    : bookingFilter === "active"
    ? allBookings.filter(b => b.status === "For Delivery" || b.status === "In Transit")
    : bookingFilter === "delivered"
    ? allBookings.filter(b => b.status === "Delivered")
    : allBookings.filter(b => b.status === "Closed");

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "Air": return <Plane className="w-3.5 h-3.5" />;
      case "Sea": return <Ship className="w-3.5 h-3.5" />;
      case "Truck": return <Truck className="w-3.5 h-3.5" />;
      case "Domestic": return <Home className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  const getClientInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleCreateBooking = () => {
    if (!bookingFormData.shipmentType || !bookingFormData.origin || !bookingFormData.destination || !bookingFormData.mode) {
      toast.error("Please fill in all required fields");
      return;
    }

    toast.success(`New booking created for ${client.name}`);
    setShowNewBookingModal(false);
    
    // Reset form
    setBookingFormData({
      shipmentType: "",
      origin: "",
      destination: "",
      mode: "",
      deliveryDate: "",
      notes: "",
    });
  };

  const handleUseTemplate = (template: BookingTemplate) => {
    setShowLoadTemplateModal(false);
    if (onCreateBooking) {
      onCreateBooking(template.id);
    }
    toast.success(`Template "${template.templateName}" loaded`);
  };

  return (
    <div className="h-full overflow-y-auto" style={{ background: "#FFFFFF" }}>
      {/* Header Section */}
      <div className="border-b bg-white top-0 z-10" style={{ borderColor: "#E5E9F0" }}>
        <div style={{ padding: "32px 48px" }}>
          {/* Back Button */}
          <div style={{ marginBottom: "24px" }}>
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-[#6B7280] hover:text-[#0A1D4D] hover:bg-[#F9FAFB] -ml-2"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back to Clients
            </Button>
          </div>

          {/* Client Title + Action Buttons - Horizontal Layout */}
          <div className="flex items-start justify-between gap-6" style={{ marginBottom: "24px" }}>
            {/* Left: Client Identity */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <Avatar className="w-12 h-12 shrink-0" style={{ backgroundColor: "#12332B" }}>
                <AvatarFallback style={{ backgroundColor: "#12332B", color: "white" }}>
                  {getClientInitials(client.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className="text-[#0A1D4D] mb-1">
                  {client.name}
                </h1>
                <p className="text-[#6B7280]">
                  Client since {client.dateAdded} • {client.activeBookings} active bookings
                </p>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex flex-wrap gap-3 items-start justify-end shrink-0">
              <Button
                onClick={() => setShowEditModal(true)}
                variant="outline"
                className="rounded-xl h-10 px-4"
                style={{ 
                  borderColor: "#E5E9F0", 
                  color: "#374151",
                  backgroundColor: "white"
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Client Info
              </Button>
            </div>
          </div>

          {/* Contact Information Profile Card */}
          <Card 
            className="rounded-xl bg-white" 
            style={{ 
              marginTop: "24px", 
              padding: "24px",
              borderColor: "#E5E9F0"
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-[#6B7280] mt-0.5" />
                  <div>
                    <div className="text-[#6B7280] mb-1">Contact person</div>
                    <div className="text-[#0A1D4D]">{client.contactPerson}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-[#6B7280] mt-0.5" />
                  <div>
                    <div className="text-[#6B7280] mb-1">Phone</div>
                    <div className="text-[#0A1D4D]">{client.phone}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[#6B7280] mt-0.5" />
                  <div>
                    <div className="text-[#6B7280] mb-1">Email</div>
                    <div className="text-[#0A1D4D]">{client.email}</div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {client.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#6B7280] mt-0.5" />
                    <div>
                      <div className="text-[#6B7280] mb-1">Address</div>
                      <div className="text-[#0A1D4D]">{client.address}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: "32px 48px" }}>
        <div className="w-full">
          {/* Main Tabs */}
          <div className="w-full">
            <Tabs defaultValue="requests" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <style>{`
                .custom-tab[data-state="active"] {
                  background-color: #0F766E !important;
                  border-color: #0F766E !important;
                  color: white !important;
                }
                .custom-tab[data-state="inactive"] {
                  background-color: white !important;
                  border-color: #E5E9F0 !important;
                  color: #6B7280 !important;
                }
              `}</style>
              <TabsList className="inline-flex gap-2 mb-6 bg-transparent border-0 p-0 h-auto">
                <TabsTrigger 
                  value="requests" 
                  className="custom-tab px-4 py-2 rounded-lg border"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Requests
                </TabsTrigger>
                <TabsTrigger 
                  value="projects"
                  className="custom-tab px-4 py-2 rounded-lg border"
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  Projects
                </TabsTrigger>
                <TabsTrigger 
                  value="preloaded"
                  className="custom-tab px-4 py-2 rounded-lg border"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Booking Templates
                </TabsTrigger>
                <TabsTrigger 
                  value="comments"
                  className="custom-tab px-4 py-2 rounded-lg border"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Comments
                </TabsTrigger>
              </TabsList>

              {/* Requests Tab - Export and Import Bookings */}
              <TabsContent value="requests" className="space-y-4">
                {isLoadingRequests ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[#0F766E]" />
                  </div>
                ) : (
                  <>
                    {/* Export Bookings Section */}
                    {exportBookings.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-[#0A1D4D] flex items-center gap-2">
                          <ArrowRight className="w-5 h-5 text-[#0F766E]" />
                          Export Bookings ({exportBookings.length})
                        </h3>
                        <Card className="rounded-xl overflow-hidden" style={{ borderColor: "#E5E9F0" }}>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E9F0" }}>
                                <tr>
                                  <th className="text-left py-3 px-4 text-[#6B7280]">Booking ID</th>
                                  <th className="text-left py-3 px-4 text-[#6B7280]">Service</th>
                                  <th className="text-left py-3 px-4 text-[#6B7280]">Mode</th>
                                  <th className="text-left py-3 px-4 text-[#6B7280]">Route</th>
                                  <th className="text-left py-3 px-4 text-[#6B7280]">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {exportBookings.map((booking, index) => (
                                  <tr
                                    key={booking.bookingId}
                                    className="cursor-pointer hover:bg-[#FFF3E0]/30 transition-colors"
                                    style={{
                                      backgroundColor: index % 2 === 0 ? "#FFFFFF" : "#FAFBFC",
                                      borderBottom: "1px solid #E5E9F0"
                                    }}
                                  >
                                    <td className="py-4 px-4 text-[#0A1D4D]">
                                      {booking.bookingId}
                                    </td>
                                    <td className="py-4 px-4 text-[#374151]">
                                      {booking.services?.join(", ") || "N/A"}
                                    </td>
                                    <td className="py-4 px-4">
                                      <Badge
                                        variant="outline"
                                        className="px-2 py-0.5"
                                        style={{
                                          borderColor: "#E5E9F0",
                                          color: "#374151"
                                        }}
                                      >
                                        {booking.mode || "N/A"}
                                      </Badge>
                                    </td>
                                    <td className="py-4 px-4 text-[#374151]">
                                      {booking.aolPol && booking.aodPod 
                                        ? `${booking.aolPol} → ${booking.aodPod}`
                                        : "N/A"}
                                    </td>
                                    <td className="py-4 px-4">
                                      <NeuronStatusPill status={booking.status} />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </Card>
                      </div>
                    )}

                    {/* Import Bookings Section */}
                    {importBookings.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-[#0A1D4D] flex items-center gap-2">
                          <ArrowRight className="w-5 h-5 text-[#0F766E] transform rotate-180" />
                          Import Bookings ({importBookings.length})
                        </h3>
                        <Card className="rounded-xl overflow-hidden" style={{ borderColor: "#E5E9F0" }}>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E9F0" }}>
                                <tr>
                                  <th className="text-left py-3 px-4 text-[#6B7280]">Booking ID</th>
                                  <th className="text-left py-3 px-4 text-[#6B7280]">Service</th>
                                  <th className="text-left py-3 px-4 text-[#6B7280]">Mode</th>
                                  <th className="text-left py-3 px-4 text-[#6B7280]">Route</th>
                                  <th className="text-left py-3 px-4 text-[#6B7280]">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {importBookings.map((booking, index) => (
                                  <tr
                                    key={booking.bookingId}
                                    className="cursor-pointer hover:bg-[#FFF3E0]/30 transition-colors"
                                    style={{
                                      backgroundColor: index % 2 === 0 ? "#FFFFFF" : "#FAFBFC",
                                      borderBottom: "1px solid #E5E9F0"
                                    }}
                                  >
                                    <td className="py-4 px-4 text-[#0A1D4D]">
                                      {booking.bookingId}
                                    </td>
                                    <td className="py-4 px-4 text-[#374151]">
                                      {booking.service || "N/A"}
                                    </td>
                                    <td className="py-4 px-4">
                                      <Badge
                                        variant="outline"
                                        className="px-2 py-0.5"
                                        style={{
                                          borderColor: "#E5E9F0",
                                          color: "#374151"
                                        }}
                                      >
                                        {booking.mode || "N/A"}
                                      </Badge>
                                    </td>
                                    <td className="py-4 px-4 text-[#374151]">
                                      {booking.aolPol && booking.aodPod 
                                        ? `${booking.aolPol} → ${booking.aodPod}`
                                        : booking.pod 
                                        ? booking.pod
                                        : "N/A"}
                                    </td>
                                    <td className="py-4 px-4">
                                      <NeuronStatusPill status={booking.status} />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </Card>
                      </div>
                    )}

                    {/* Empty State */}
                    {exportBookings.length === 0 && importBookings.length === 0 && (
                      <Card className="rounded-xl p-12" style={{ borderColor: "#E5E9F0" }}>
                        <div className="text-center">
                          <FileText className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
                          <p className="text-[#6B7280]">
                            No export or import bookings found for this client
                          </p>
                        </div>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Projects Tab */}
              <TabsContent value="projects" className="space-y-4">
                {isLoadingProjects ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[#0F766E]" />
                  </div>
                ) : projects.length > 0 ? (
                  <Card className="rounded-xl overflow-hidden" style={{ borderColor: "#E5E9F0" }}>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E9F0" }}>
                          <tr>
                            <th className="text-left py-3 px-4 text-[#6B7280]">Project Number</th>
                            <th className="text-left py-3 px-4 text-[#6B7280]">Quotation</th>
                            <th className="text-left py-3 px-4 text-[#6B7280]">Services</th>
                            <th className="text-left py-3 px-4 text-[#6B7280]">Total</th>
                            <th className="text-left py-3 px-4 text-[#6B7280]">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projects.map((project, index) => (
                            <tr
                              key={project.id}
                              className="cursor-pointer hover:bg-[#FFF3E0]/30 transition-colors"
                              style={{
                                backgroundColor: index % 2 === 0 ? "#FFFFFF" : "#FAFBFC",
                                borderBottom: "1px solid #E5E9F0"
                              }}
                            >
                              <td className="py-4 px-4 text-[#0A1D4D]">
                                {project.project_number}
                              </td>
                              <td className="py-4 px-4 text-[#374151]">
                                {project.quotation_number}
                              </td>
                              <td className="py-4 px-4 text-[#374151]">
                                {project.services?.join(", ") || "N/A"}
                              </td>
                              <td className="py-4 px-4 text-[#374151]">
                                ₱{formatAmount(project.total)}
                              </td>
                              <td className="py-4 px-4">
                                <NeuronStatusPill status={project.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                ) : (
                  <Card className="rounded-xl p-12" style={{ borderColor: "#E5E9F0" }}>
                    <div className="text-center">
                      <Briefcase className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
                      <p className="text-[#6B7280]">
                        No projects found for this client
                      </p>
                    </div>
                  </Card>
                )}
              </TabsContent>

              {/* Booking Templates Tab */}
              <TabsContent value="preloaded" className="space-y-4">
                {/* Header with Add Template button */}
                <div className="flex items-center justify-end">
                  <Button
                    onClick={() => toast.success("Add Template feature coming soon")}
                    className="rounded-xl h-10 px-4"
                    style={{
                      backgroundColor: "#0F766E",
                      color: "white"
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Template
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bookingTemplates.map((template) => (
                    <Card 
                      key={template.id} 
                      className="p-5 rounded-xl transition-colors" 
                      style={{ borderColor: "#E5E9F0" }}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-[#0A1D4D] mb-2">{template.templateName}</h4>
                            <div className="flex items-center gap-4 text-[#6B7280] mb-3">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {template.route}
                              </div>
                              <Badge 
                                variant="outline" 
                                className="px-2 py-0.5 flex items-center gap-1"
                                style={{
                                  borderColor: "#E5E9F0",
                                  color: "#374151"
                                }}
                              >
                                {getModeIcon(template.mode)}
                                {template.mode}
                              </Badge>
                            </div>
                            <div className="text-[#6B7280] mb-3">
                              {template.notes}
                            </div>
                            {template.frequency && (
                              <div className="text-[#9CA3AF]">
                                Frequency: {template.frequency} • Last used: {template.lastUsed}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              if (onCreateBooking) {
                                onCreateBooking(template.id);
                              }
                            }}
                            className="flex-1 rounded-lg"
                            style={{
                              backgroundColor: "#0F766E",
                              color: "white"
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Use Template
                          </Button>
                          <Button
                            onClick={() => toast.success(`Duplicating template: ${template.templateName}`)}
                            variant="outline"
                            className="flex-1 rounded-lg"
                            style={{
                              borderColor: "#E5E9F0",
                              color: "#374151",
                              backgroundColor: "white"
                            }}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Comments Tab */}
              <TabsContent value="comments" className="space-y-4">
                <Card className="rounded-xl p-12" style={{ borderColor: "#E5E9F0" }}>
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
                    <p className="text-[#6B7280] mb-4">
                      Comments feature coming soon
                    </p>
                    <p className="text-[#9CA3AF]">
                      Track conversations and notes about this client
                    </p>
                  </div>
                </Card>
              </TabsContent>

            </Tabs>
          </div>
        </div>
      </div>

      {/* Edit Client Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-[#0A1D4D]">
              Edit Client Information
            </DialogTitle>
            <DialogDescription className="text-[#6B7280]">
              Update client details and contact information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#374151]">Company Name *</Label>
              <Input
                defaultValue={client.name}
                className="rounded-lg"
                style={{ borderColor: "#E5E9F0" }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#374151]">Contact Person *</Label>
              <Input
                defaultValue={client.contactPerson}
                className="rounded-lg"
                style={{ borderColor: "#E5E9F0" }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#374151]">Phone *</Label>
                <Input
                  defaultValue={client.phone}
                  className="rounded-lg"
                  style={{ borderColor: "#E5E9F0" }}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#374151]">Email *</Label>
                <Input
                  type="email"
                  defaultValue={client.email}
                  className="rounded-lg"
                  style={{ borderColor: "#E5E9F0" }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#374151]">Address</Label>
              <Textarea
                defaultValue={client.address}
                rows={3}
                className="rounded-lg resize-none"
                style={{ borderColor: "#E5E9F0" }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4" style={{ borderTop: "1px solid #E5E9F0" }}>
            <Button
              variant="outline"
              onClick={() => setShowEditModal(false)}
              className="rounded-lg"
              style={{ borderColor: "#E5E9F0" }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success("Client information updated");
                setShowEditModal(false);
              }}
              className="rounded-lg"
              style={{
                backgroundColor: "#0F766E",
                color: "white"
              }}
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}