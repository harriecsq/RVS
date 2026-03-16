// NEW WORKFLOW SEED DATA: Projects first, then Bookings
import * as kv from "./kv_store.tsx";

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
const dateOnly = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

export async function seedNewWorkflowData() {
  console.log("🌱 Starting new workflow seed (Projects → Bookings)...");
  
  let clientCount = 0;
  let projectCount = 0;
  let exportBookingCount = 0;
  let importBookingCount = 0;
  
  // ==================== CLIENTS ====================
  const clients = [
    {
      id: "client-001",
      name: "Pacific Electronics Manufacturing Corp.",
      company_name: "Pacific Electronics Manufacturing Corp.",
      industry: "Electronics & Technology",
      status: "Active",
      registered_address: "Laguna Technopark, Biñan, Laguna",
      phone: "+63 49 511 2345",
      email: "procurement@pacificelec.ph",
      created_at: daysAgo(30),
      created_by: "user-001",
      updated_at: daysAgo(30)
    },
    {
      id: "client-002",
      name: "Manila Fashion Distributors Inc.",
      company_name: "Manila Fashion Distributors Inc.",
      industry: "Textile & Apparel",
      status: "Active",
      registered_address: "Binondo, Manila",
      phone: "+63 2 8242 5678",
      email: "logistics@manilafashion.com",
      created_at: daysAgo(28),
      created_by: "user-001",
      updated_at: daysAgo(28)
    },
    {
      id: "client-003",
      name: "Cebu Food Products Corporation",
      company_name: "Cebu Food Products Corporation",
      industry: "Food & Beverage",
      status: "Active",
      registered_address: "Mandaue City, Cebu",
      phone: "+63 32 345 6789",
      email: "imports@cebufood.ph",
      created_at: daysAgo(25),
      created_by: "user-002",
      updated_at: daysAgo(25)
    },
    {
      id: "client-004",
      name: "BuildRight Construction Supplies",
      company_name: "BuildRight Construction Supplies",
      industry: "Construction",
      status: "Active",
      registered_address: "Pasig City",
      phone: "+63 2 8631 4567",
      email: "procurement@buildright.ph",
      created_at: daysAgo(20),
      created_by: "user-002",
      updated_at: daysAgo(20)
    },
    {
      id: "client-005",
      name: "GreenEnergy Solutions Inc.",
      company_name: "GreenEnergy Solutions Inc.",
      industry: "Renewable Energy",
      status: "Active",
      registered_address: "Taguig City",
      phone: "+63 2 8856 2345",
      email: "projects@greenenergy.ph",
      created_at: daysAgo(15),
      created_by: "user-001",
      updated_at: daysAgo(15)
    }
  ];
  
  for (const client of clients) {
    await kv.set(`client:${client.id}`, client);
    clientCount++;
  }
  
  console.log(`✅ Seeded ${clientCount} clients`);
  
  // ==================== PROJECTS ====================
  const projects = [
    {
      id: "project-001",
      project_number: "PROJ-2025-001",
      project_name: "Q1 Electronics Components Import",
      description: "Quarterly shipment of PCBs and electronic components from Taiwan",
      client_id: "client-001",
      client_name: "Pacific Electronics Manufacturing Corp.",
      status: "Active",
      booking_status: "Partially Booked",
      start_date: dateOnly(20),
      end_date: dateOnly(-30),
      linked_bookings: [],
      created_at: daysAgo(20),
      created_by: "user-001",
      created_by_name: "Maria Santos",
      updated_at: daysAgo(10)
    },
    {
      id: "project-002",
      project_number: "PROJ-2025-002",
      project_name: "Spring Fashion Collection Import",
      description: "Import of ready-made garments for spring collection",
      client_id: "client-002",
      client_name: "Manila Fashion Distributors Inc.",
      status: "Active",
      booking_status: "Fully Booked",
      start_date: dateOnly(18),
      end_date: dateOnly(-20),
      linked_bookings: [],
      created_at: daysAgo(18),
      created_by: "user-001",
      created_by_name: "Maria Santos",
      updated_at: daysAgo(5)
    },
    {
      id: "project-003",
      project_number: "PROJ-2025-003",
      project_name: "Food Ingredients Shipment",
      description: "Import of specialized food ingredients from Japan",
      client_id: "client-003",
      client_name: "Cebu Food Products Corporation",
      status: "Planning",
      booking_status: "No Bookings",
      start_date: dateOnly(10),
      end_date: null,
      linked_bookings: [],
      created_at: daysAgo(10),
      created_by: "user-002",
      created_by_name: "Juan Dela Cruz",
      updated_at: daysAgo(10)
    },
    {
      id: "project-004",
      project_number: "PROJ-2025-004",
      project_name: "Construction Equipment Import",
      description: "Heavy machinery and equipment from China",
      client_id: "client-004",
      client_name: "BuildRight Construction Supplies",
      status: "Active",
      booking_status: "Partially Booked",
      start_date: dateOnly(15),
      end_date: dateOnly(-10),
      linked_bookings: [],
      created_at: daysAgo(15),
      created_by: "user-002",
      created_by_name: "Juan Dela Cruz",
      updated_at: daysAgo(7)
    },
    {
      id: "project-005",
      project_number: "PROJ-2025-005",
      project_name: "Solar Panel Installation Project",
      description: "Import of solar panels and inverters from Taiwan",
      client_id: "client-005",
      client_name: "GreenEnergy Solutions Inc.",
      status: "Completed",
      booking_status: "Completed",
      start_date: dateOnly(30),
      end_date: dateOnly(5),
      linked_bookings: [],
      created_at: daysAgo(30),
      created_by: "user-001",
      created_by_name: "Maria Santos",
      updated_at: daysAgo(5),
      completed_at: daysAgo(5)
    }
  ];
  
  for (const project of projects) {
    await kv.set(`project:${project.id}`, project);
    projectCount++;
  }
  
  console.log(`✅ Seeded ${projectCount} projects`);
  
  // ==================== IMPORT BOOKINGS ====================
  const importBookings = [
    {
      id: "import-booking-001",
      booking_number: "IMP-2025-001",
      project_id: "project-001",
      project_number: "PROJ-2025-001",
      client_id: "client-001",
      client_name: "Pacific Electronics Manufacturing Corp.",
      status: "In Transit",
      origin: "Taipei, Taiwan",
      destination: "Manila, Philippines (NAIA)",
      commodity: "Electronic Components & PCBs",
      incoterm: "FOB",
      mode: "Air",
      carrier: "China Airlines Cargo",
      etd: dateOnly(7),
      eta: dateOnly(-2),
      has_trucking: false,
      created_at: daysAgo(15),
      created_by: "user-001",
      created_by_name: "Maria Santos",
      updated_at: daysAgo(7)
    },
    {
      id: "import-booking-002",
      booking_number: "IMP-2025-002",
      project_id: "project-002",
      project_number: "PROJ-2025-002",
      client_id: "client-002",
      client_name: "Manila Fashion Distributors Inc.",
      status: "Delivered",
      origin: "Guangzhou, China",
      destination: "Manila, Philippines",
      commodity: "Ready-made Garments",
      incoterm: "FOB",
      mode: "Sea",
      carrier: "COSCO",
      etd: dateOnly(25),
      eta: dateOnly(5),
      ata: dateOnly(5),
      has_trucking: true,
      trucking_status: "Completed",
      created_at: daysAgo(30),
      created_by: "user-001",
      created_by_name: "Maria Santos",
      updated_at: daysAgo(5)
    },
    {
      id: "import-booking-003",
      booking_number: "IMP-2025-003",
      project_id: "project-004",
      project_number: "PROJ-2025-004",
      client_id: "client-004",
      client_name: "BuildRight Construction Supplies",
      status: "Booking Confirmed",
      origin: "Shanghai, China",
      destination: "Manila, Philippines",
      commodity: "Construction Equipment",
      incoterm: "CFR",
      mode: "Sea",
      carrier: "MSC",
      etd: dateOnly(-5),
      eta: dateOnly(-19),
      has_trucking: false,
      created_at: daysAgo(10),
      created_by: "user-002",
      created_by_name: "Juan Dela Cruz",
      updated_at: daysAgo(10)
    },
    {
      id: "import-booking-004",
      booking_number: "IMP-2025-004",
      project_id: "project-005",
      project_number: "PROJ-2025-005",
      client_id: "client-005",
      client_name: "GreenEnergy Solutions Inc.",
      status: "Delivered",
      origin: "Kaohsiung, Taiwan",
      destination: "Manila, Philippines",
      commodity: "Solar Panels & Inverters",
      incoterm: "FOB",
      mode: "Sea",
      carrier: "Evergreen",
      etd: dateOnly(35),
      eta: dateOnly(7),
      ata: dateOnly(7),
      has_trucking: true,
      trucking_status: "Completed",
      created_at: daysAgo(40),
      created_by: "user-001",
      created_by_name: "Maria Santos",
      updated_at: daysAgo(5)
    }
  ];
  
  for (const booking of importBookings) {
    await kv.set(`import_booking:${booking.id}`, booking);
    importBookingCount++;
  }
  
  console.log(`✅ Seeded ${importBookingCount} import bookings`);
  
  // ==================== EXPORT BOOKINGS ====================
  const exportBookings = [
    {
      id: "export-booking-001",
      booking_number: "EXP-2025-001",
      project_id: "project-001",
      project_number: "PROJ-2025-001",
      client_id: "client-001",
      client_name: "Pacific Electronics Manufacturing Corp.",
      status: "Preparing Shipment",
      origin: "Manila, Philippines",
      destination: "Singapore",
      commodity: "Finished Electronics Products",
      incoterm: "EXW",
      mode: "Sea",
      carrier: "ONE",
      etd: dateOnly(-7),
      eta: dateOnly(-12),
      has_trucking: false,
      created_at: daysAgo(12),
      created_by: "user-001",
      created_by_name: "Maria Santos",
      updated_at: daysAgo(8)
    },
    {
      id: "export-booking-002",
      booking_number: "EXP-2025-002",
      project_id: "project-002",
      project_number: "PROJ-2025-002",
      client_id: "client-002",
      client_name: "Manila Fashion Distributors Inc.",
      status: "In Transit",
      origin: "Manila, Philippines",
      destination: "Los Angeles, USA",
      commodity: "Custom Fashion Designs",
      incoterm: "FOB",
      mode: "Air",
      carrier: "FedEx",
      etd: dateOnly(3),
      eta: dateOnly(-1),
      has_trucking: false,
      created_at: daysAgo(8),
      created_by: "user-001",
      created_by_name: "Maria Santos",
      updated_at: daysAgo(3)
    }
  ];
  
  for (const booking of exportBookings) {
    await kv.set(`export_booking:${booking.id}`, booking);
    exportBookingCount++;
  }
  
  console.log(`✅ Seeded ${exportBookingCount} export bookings`);
  
  const summary = {
    clients: clientCount,
    projects: projectCount,
    import_bookings: importBookingCount,
    export_bookings: exportBookingCount,
    total_bookings: importBookingCount + exportBookingCount
  };
  
  console.log("🎉 New workflow seed complete!");
  console.log(`   ${summary.clients} clients`);
  console.log(`   ${summary.projects} projects`);
  console.log(`   ${summary.import_bookings} import bookings`);
  console.log(`   ${summary.export_bookings} export bookings`);
  console.log(`   ${summary.total_bookings} total bookings`);
  
  return { success: true, summary };
}
