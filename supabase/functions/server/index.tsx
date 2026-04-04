import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger — v2
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ==================== RETRY HELPER ====================
async function kvRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 1000): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts - 1) throw err;
      console.log(`⏳ KV retry ${i + 1}/${attempts} after error: ${err}`);
      await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw new Error("Retry exhausted");
}

// ==================== ALLOCATION-AWARE COLLECTION HELPERS ====================

/**
 * Compute the total collected amount for a set of billing IDs from collections,
 * using allocation-level amounts (not the full collection amount).
 */
function computeCollectedForBillingIds(billingIds: string[], allCollections: any[], statusFilter?: string): number {
  let total = 0;
  for (const col of allCollections) {
    if (statusFilter && col.status !== statusFilter) continue;
    if (col.allocations && Array.isArray(col.allocations) && col.allocations.length > 0) {
      for (const alloc of col.allocations) {
        if (billingIds.includes(alloc.billingId)) {
          total += (alloc.amount || 0);
        }
      }
    } else if (col.billingId && billingIds.includes(col.billingId)) {
      total += (col.amount || 0);
    }
  }
  return total;
}

/** Check if a collection is linked to a specific billing ID. */
function isCollectionLinkedToBilling(col: any, billingId: string): boolean {
  if (col.allocations && Array.isArray(col.allocations) && col.allocations.length > 0) {
    return col.allocations.some((alloc: any) => alloc.billingId === billingId);
  }
  return col.billingId === billingId;
}

/** Get the allocated amount from a collection for a specific billing. */
function getAllocatedAmountForBilling(col: any, billingId: string): number {
  if (col.allocations && Array.isArray(col.allocations) && col.allocations.length > 0) {
    return col.allocations
      .filter((alloc: any) => alloc.billingId === billingId)
      .reduce((sum: number, alloc: any) => sum + (alloc.amount || 0), 0);
  }
  if (col.billingId === billingId) {
    return col.amount || 0;
  }
  return 0;
}

// ==================== AUTO-SEED DEMO DATA ====================

async function seedDemoData() {
  try {
    // Check if data already exists
    // Optimized: Check for a specific seed marker OR user-001 to avoid heavy getByPrefix calls on startup
    const seedMarker = await kvRetry(() => kv.get("system:seeded"));
    const existingUser = await kvRetry(() => kv.get("user:user-001"));
    
    if (seedMarker || existingUser) {
      console.log("🌱 Database already has data (seed marker or user-001 found), skipping seed");
      
      // Ensure marker exists if only user was found (migration)
      if (!seedMarker && existingUser) {
        await kvRetry(() => kv.set("system:seeded", { timestamp: new Date().toISOString(), version: "1.0" }));
      }
      
      return;
    }
    
    console.log("🌱 Seeding demo data...");
    
    // Create demo users first
    const demoUsers = [
      {
        id: "user-001",
        name: "Maria Santos",
        email: "maria.santos@neuronos.ph",
        password: "demo123",
        department: "BD",
        role: "Manager",
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: "user-002",
        name: "Juan Dela Cruz",
        email: "juan.delacruz@neuronos.ph",
        password: "demo123",
        department: "Operations",
        role: "Manager",
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: "user-003",
        name: "Ana Reyes",
        email: "ana.reyes@neuronos.ph",
        password: "demo123",
        department: "Pricing",
        role: "Specialist",
        is_active: true,
        created_at: new Date().toISOString()
      }
    ];
    
    for (const user of demoUsers) {
      await kvRetry(() => kv.set(`user:${user.id}`, user));
    }
    
    // Create demo clients
    const demoClients = [
      {
        id: "client-backend-001",
        name: "Cebu Manufacturing Corp",
        company_name: "Cebu Manufacturing Corp",
        industry: "Electronics",
        status: "Active",
        registered_address: "Mactan Economic Zone, Lapu-Lapu City, Cebu 6015",
        owner_id: "user-001",
        created_at: new Date().toISOString()
      },
      {
        id: "client-backend-002",
        name: "Davao Agri Exports Inc",
        company_name: "Davao Agri Exports Inc",
        industry: "Agricultural",
        status: "Active",
        registered_address: "Bajada, Davao City, Davao del Sur 8000",
        owner_id: "user-002",
        created_at: new Date().toISOString()
      },
      {
        id: "client-backend-003",
        name: "Makati Retail Group",
        company_name: "Makati Retail Group",
        industry: "General Merchandise",
        status: "Prospect",
        registered_address: "Ayala Avenue, Makati City, Metro Manila 1226",
        owner_id: "user-001",
        created_at: new Date().toISOString()
      },
      {
        id: "client-backend-004",
        name: "Batangas Food Processing",
        company_name: "Batangas Food Processing",
        industry: "Food & Beverage",
        status: "Active",
        registered_address: "LIMA Technology Center, Malvar, Batangas 4233",
        owner_id: "user-003",
        created_at: new Date().toISOString()
      },
      {
        id: "client-backend-005",
        name: "Subic Bay Logistics Partners",
        company_name: "Subic Bay Logistics Partners",
        industry: "Heavy Equipment",
        status: "Active",
        registered_address: "Subic Bay Freeport Zone, Zambales 2222",
        owner_id: "user-002",
        created_at: new Date().toISOString()
      }
    ];
    
    for (const client of demoClients) {
      await kvRetry(() => kv.set(`client:${client.id}`, client));
    }
    
    // Set seed marker to prevent re-seeding even if data is deleted
    await kvRetry(() => kv.set("system:seeded", { timestamp: new Date().toISOString(), version: "1.0" }));
    
    console.log(`✅ Seeded ${demoUsers.length} users and ${demoClients.length} clients`);
  } catch (error: any) {
    // Avoid logging full HTML error pages
    const errorMessage = String(error);
    if (errorMessage.includes("<!DOCTYPE html>")) {
      console.error("❌ Error seeding demo data: Upstream service returned 500 HTML error (likely temporary)");
    } else {
      console.error("❌ Error seeding demo data:", errorMessage);
    }
  }
}

// Run seed on startup
seedDemoData();

// Health check endpoint
app.get("/make-server-ce0d67b8/health", (c) => {
  return c.json({ status: "ok" });
});

// ==================== AUTH & USERS API ====================

// Login endpoint
app.post("/make-server-ce0d67b8/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    // Get all users
    const users = await kv.getByPrefix("user:");
    
    // Find user by email
    const user = users.find((u: any) => u.email === email);
    
    if (!user) {
      console.log(`Login failed: User not found for email ${email}`);
      return c.json({ success: false, error: "Invalid email or password" }, 401);
    }
    
    // Simple password check (in production, use proper hashing)
    if (user.password !== password) {
      console.log(`Login failed: Invalid password for email ${email}`);
      return c.json({ success: false, error: "Invalid email or password" }, 401);
    }
    
    if (!user.is_active) {
      console.log(`Login failed: User account is inactive for email ${email}`);
      return c.json({ success: false, error: "Account is inactive" }, 401);
    }
    
    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    
    console.log(`Login successful: ${user.email} (${user.department} ${user.role})`);
    
    return c.json({ 
      success: true, 
      data: userWithoutPassword 
    });
  } catch (error) {
    console.error("Error during login:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get current user (session check)
app.get("/make-server-ce0d67b8/auth/me", async (c) => {
  try {
    const userId = c.req.query("user_id");
    
    if (!userId) {
      return c.json({ success: false, error: "User ID required" }, 400);
    }
    
    const user = await kv.get(`user:${userId}`);
    
    if (!user) {
      return c.json({ success: false, error: "User not found" }, 404);
    }
    
    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    
    return c.json({ success: true, data: userWithoutPassword });
  } catch (error) {
    console.error("Error fetching current user:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get all users (with optional filters)
app.get("/make-server-ce0d67b8/users", async (c) => {
  try {
    const department = c.req.query("department");
    const role = c.req.query("role");
    
    // Get all users
    let users = await kv.getByPrefix("user:");
    
    // Filter by department if provided
    if (department) {
      users = users.filter((u: any) => u.department === department);
    }
    
    // Filter by role if provided
    if (role) {
      users = users.filter((u: any) => u.role === role);
    }
    
    // Only return active users
    users = users.filter((u: any) => u.is_active);
    
    // Remove passwords from response
    const usersWithoutPasswords = users.map((u: any) => {
      const { password: _, ...userWithoutPassword } = u;
      return userWithoutPassword;
    });
    
    // Sort by name
    usersWithoutPasswords.sort((a: any, b: any) => 
      a.name.localeCompare(b.name)
    );
    
    console.log(`Fetched ${usersWithoutPasswords.length} users (department: ${department || 'all'}, role: ${role || 'all'})`);
    
    return c.json({ success: true, data: usersWithoutPasswords });
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Seed initial users (development only - call once to set up test users)
app.post("/make-server-ce0d67b8/auth/seed-users", async (c) => {
  try {
    // First, clear existing users to avoid duplicates
    const existingUsers = await kv.getByPrefix("user:");
    if (existingUsers.length > 0) {
      console.log(`Clearing ${existingUsers.length} existing users before re-seeding...`);
      for (const user of existingUsers) {
        await kv.del(`user:${user.id}`);
      }
    }
    
    const seedUsers = [
      {
        id: "user-bd-rep-001",
        email: "bd.rep@neuron.ph",
        password: "password123", // In production, hash this!
        name: "Juan Dela Cruz",
        department: "Business Development",
        role: "rep",
        created_at: new Date().toISOString(),
        is_active: true
      },
      {
        id: "user-bd-manager-001",
        email: "bd.manager@neuron.ph",
        password: "password123",
        name: "Maria Santos",
        department: "Business Development",
        role: "manager",
        created_at: new Date().toISOString(),
        is_active: true
      },
      {
        id: "user-pd-rep-001",
        email: "pd.rep@neuron.ph",
        password: "password123",
        name: "Pedro Reyes",
        department: "Pricing",
        role: "rep",
        created_at: new Date().toISOString(),
        is_active: true
      },
      {
        id: "user-pd-manager-001",
        email: "pd.manager@neuron.ph",
        password: "password123",
        name: "Ana Garcia",
        department: "Pricing",
        role: "manager",
        created_at: new Date().toISOString(),
        is_active: true
      },
      {
        id: "user-ops-rep-001",
        email: "ops.rep@neuron.ph",
        password: "password123",
        name: "Carlos Mendoza",
        department: "Operations",
        role: "rep",
        created_at: new Date().toISOString(),
        is_active: true
      },
      {
        id: "user-exec-001",
        email: "executive@neuron.ph",
        password: "password123",
        name: "Sofia Rodriguez",
        department: "Executive",
        role: "director",
        created_at: new Date().toISOString(),
        is_active: true
      }
    ];
    
    // Save each user to KV store
    for (const user of seedUsers) {
      await kv.set(`user:${user.id}`, user);
      console.log(`Seeded user: ${user.email} (${user.department} ${user.role})`);
    }
    
    return c.json({ 
      success: true, 
      message: `Seeded ${seedUsers.length} users successfully`,
      users: seedUsers.map(u => ({ email: u.email, department: u.department, role: u.role }))
    });
  } catch (error) {
    console.error("Error seeding users:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Clear all users (development only - for resetting test data)
app.delete("/make-server-ce0d67b8/auth/clear-users", async (c) => {
  try {
    const allUsers = await kv.getByPrefix("user:");
    
    // Delete each user
    for (const user of allUsers) {
      await kv.del(`user:${user.id}`);
      console.log(`Deleted user: ${user.email}`);
    }
    
    return c.json({ 
      success: true, 
      message: `Cleared ${allUsers.length} users successfully` 
    });
  } catch (error) {
    console.error("Error clearing users:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== TICKET TYPES API ====================

// Seed ticket types (auto-run on startup if none exist)
app.post("/make-server-ce0d67b8/ticket-types/seed", async (c) => {
  try {
    // Check if ticket types already exist
    const existingTypes = await kv.getByPrefix("ticket_type:");
    
    if (existingTypes.length > 0) {
      console.log(`Ticket types already exist (${existingTypes.length}). Skipping seed.`);
      return c.json({ 
        success: true, 
        message: `${existingTypes.length} ticket types already exist`,
        data: existingTypes 
      });
    }
    
    const ticketTypes = [
      {
        id: "QUOTATION_PRICING",
        name: "Quotation Pricing Request",
        description: "Request pricing for a customer quotation",
        default_from_department: "Business Development",
        default_to_department: "Pricing",
        default_due_hours: 24,
        created_at: new Date().toISOString()
      },
      {
        id: "QUOTATION_REVISION",
        name: "Quotation Revision",
        description: "Customer requested changes to existing quotation pricing",
        default_from_department: "Business Development",
        default_to_department: "Pricing",
        default_due_hours: 12,
        created_at: new Date().toISOString()
      },
      {
        id: "CUSTOMER_CLARIFICATION",
        name: "Customer Clarification Needed",
        description: "Need additional information or clarification from customer",
        default_from_department: "Pricing",
        default_to_department: "Business Development",
        default_due_hours: 24,
        created_at: new Date().toISOString()
      },
      {
        id: "DOCUMENT_REQUEST",
        name: "Document Request",
        description: "Request missing or additional documents",
        default_from_department: "Pricing",
        default_to_department: "Business Development",
        default_due_hours: 48,
        created_at: new Date().toISOString()
      },
      {
        id: "URGENT_ISSUE",
        name: "Urgent Issue",
        description: "Critical issue requiring immediate attention",
        default_from_department: null,
        default_to_department: null,
        default_due_hours: 4,
        created_at: new Date().toISOString()
      },
      {
        id: "GENERAL_REQUEST",
        name: "General Request",
        description: "General request or question between departments",
        default_from_department: null,
        default_to_department: null,
        default_due_hours: 48,
        created_at: new Date().toISOString()
      }
    ];
    
    // Save each ticket type
    for (const ticketType of ticketTypes) {
      await kv.set(`ticket_type:${ticketType.id}`, ticketType);
      console.log(`Seeded ticket type: ${ticketType.id}`);
    }
    
    return c.json({ 
      success: true, 
      message: `Seeded ${ticketTypes.length} ticket types successfully`,
      data: ticketTypes
    });
  } catch (error) {
    console.error("Error seeding ticket types:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get all ticket types
app.get("/make-server-ce0d67b8/ticket-types", async (c) => {
  try {
    // Retry logic for connection stability
    let ticketTypes: any[] = [];
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        ticketTypes = await kv.getByPrefix("ticket_type:");
        break; // Success
      } catch (err) {
        attempts++;
        console.warn(`Attempt ${attempts} to fetch ticket types failed: ${err}`);
        if (attempts >= maxAttempts) throw err;
        await new Promise(r => setTimeout(r, 500)); // Wait 500ms
      }
    }
    
    // Sort by name
    if (ticketTypes && Array.isArray(ticketTypes)) {
      ticketTypes.sort((a: any, b: any) => a.name.localeCompare(b.name));
    }
    
    return c.json({ success: true, data: ticketTypes });
  } catch (error) {
    console.error("Error fetching ticket types:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== TICKETS API ====================

// Create a new ticket
app.post("/make-server-ce0d67b8/tickets", async (c) => {
  try {
    const ticket = await c.req.json();
    
    // Generate department-based sequential ticket ID
    if (!ticket.id) {
      // Get department prefix (first 2-3 letters)
      const deptMap: Record<string, string> = {
        "Business Development": "BD",
        "Pricing": "PRC",
        "Operations": "OPS",
        "Finance": "FIN",
        "Executive": "EXEC",
        "Administration": "ADM"
      };
      
      const deptPrefix = deptMap[ticket.from_department] || "GEN";
      
      // Get the current counter for this department
      const counterKey = `ticket_counter:${deptPrefix}`;
      let counter = await kv.get(counterKey);
      
      if (!counter) {
        counter = { value: 0 };
      }
      
      // Increment counter
      counter.value += 1;
      
      // Save updated counter
      await kv.set(counterKey, counter);
      
      // Generate ID: DEPT-0001, DEPT-0042, etc.
      const sequenceNumber = counter.value.toString().padStart(4, '0');
      ticket.id = `${deptPrefix}-${sequenceNumber}`;
    }
    
    // Set timestamps
    ticket.created_at = new Date().toISOString();
    ticket.updated_at = new Date().toISOString();
    
    // Set default status and priority if not provided
    if (!ticket.status) {
      ticket.status = "Open";
    }
    if (!ticket.priority) {
      ticket.priority = "Normal";
    }
    
    // Calculate due date based on ticket type if not provided
    if (!ticket.due_date && ticket.ticket_type) {
      const ticketType = await kv.get(`ticket_type:${ticket.ticket_type}`);
      if (ticketType && ticketType.default_due_hours) {
        const dueDate = new Date();
        dueDate.setHours(dueDate.getHours() + ticketType.default_due_hours);
        ticket.due_date = dueDate.toISOString();
      }
    }
    
    // Initialize null fields for assignment
    ticket.assigned_to = ticket.assigned_to || null;
    ticket.assigned_to_name = ticket.assigned_to_name || null;
    ticket.assigned_at = ticket.assigned_at || null;
    ticket.resolved_at = null;
    ticket.closed_at = null;
    
    // Handle linked entity fields (optional)
    ticket.linked_entity_type = ticket.linked_entity_type || null;
    ticket.linked_entity_id = ticket.linked_entity_id || null;
    ticket.linked_entity_name = ticket.linked_entity_name || null;
    ticket.linked_entity_status = ticket.linked_entity_status || null;
    
    // Save to KV store
    await kv.set(`ticket:${ticket.id}`, ticket);
    
    // Log activity: ticket created
    await logTicketActivity(
      ticket.id,
      "ticket_created",
      ticket.created_by,
      ticket.created_by_name,
      ticket.from_department,
      null,
      null,
      { 
        subject: ticket.subject,
        priority: ticket.priority,
        to_department: ticket.to_department
      }
    );
    
    console.log(`Created ticket: ${ticket.id} - ${ticket.subject} (${ticket.from_department} → ${ticket.to_department})${ticket.linked_entity_type ? ` [Linked to ${ticket.linked_entity_type}: ${ticket.linked_entity_id}]` : ''}`);
    
    return c.json({ success: true, data: ticket });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get all tickets with role-based filtering
app.get("/make-server-ce0d67b8/tickets", async (c) => {
  try {
    const user_id = c.req.query("user_id");
    const role = c.req.query("role"); // rep, manager, director
    const department = c.req.query("department");
    const status = c.req.query("status");
    const priority = c.req.query("priority");
    const search = c.req.query("search");
    
    // Get all tickets
    let tickets = await kv.getByPrefix("ticket:");
    
    // Apply role-based filtering
    if (role === "rep") {
      // Reps see: tickets assigned to them + tickets they created
      tickets = tickets.filter((t: any) => 
        t.assigned_to === user_id || t.created_by === user_id
      );
    } else if (role === "manager") {
      // Managers see: all tickets in their department (to_department)
      tickets = tickets.filter((t: any) => 
        t.to_department === department || t.from_department === department
      );
    } else if (role === "director") {
      // Directors see all tickets
      // No filtering needed
    }
    
    // Apply additional filters
    if (status) {
      tickets = tickets.filter((t: any) => t.status === status);
    }
    
    if (priority) {
      tickets = tickets.filter((t: any) => t.priority === priority);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      tickets = tickets.filter((t: any) => 
        t.id?.toLowerCase().includes(searchLower) ||
        t.subject?.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort by created_at descending (newest first)
    tickets.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    console.log(`Fetched ${tickets.length} tickets for user ${user_id} (${role} in ${department})`);
    
    return c.json({ success: true, data: tickets });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get single ticket by ID with comments
app.get("/make-server-ce0d67b8/tickets/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const ticket = await kv.get(`ticket:${id}`);
    
    if (!ticket) {
      return c.json({ success: false, error: "Ticket not found" }, 404);
    }
    
    // Get all comments for this ticket
    const allComments = await kv.getByPrefix(`ticket_comment:${id}:`);
    
    // Sort comments by created_at ascending (oldest first)
    allComments.sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    return c.json({ 
      success: true, 
      data: {
        ...ticket,
        comments: allComments
      }
    });
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update ticket status
app.patch("/make-server-ce0d67b8/tickets/:id/status", async (c) => {
  try {
    const id = c.req.param("id");
    const { status, user_id, user_name, user_department } = await c.req.json();
    
    const ticket = await kv.get(`ticket:${id}`);
    
    if (!ticket) {
      return c.json({ success: false, error: "Ticket not found" }, 404);
    }
    
    const oldStatus = ticket.status;
    ticket.status = status;
    ticket.updated_at = new Date().toISOString();
    
    // Set resolved_at when status changes to Resolved
    if (status === "Resolved" && oldStatus !== "Resolved") {
      ticket.resolved_at = new Date().toISOString();
    }
    
    // Set closed_at when status changes to Closed
    if (status === "Closed" && oldStatus !== "Closed") {
      ticket.closed_at = new Date().toISOString();
    }
    
    await kv.set(`ticket:${id}`, ticket);
    
    // Log activity: status changed
    if (user_id && user_name && user_department && oldStatus !== status) {
      await logTicketActivity(
        id,
        "status_changed",
        user_id,
        user_name,
        user_department,
        oldStatus,
        status
      );
    }
    
    console.log(`Updated ticket ${id} status: ${oldStatus} → ${status}`);
    
    return c.json({ success: true, data: ticket });
  } catch (error) {
    console.error("Error updating ticket status:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update ticket priority
app.patch("/make-server-ce0d67b8/tickets/:id/priority", async (c) => {
  try {
    const id = c.req.param("id");
    const { priority } = await c.req.json();
    
    const ticket = await kv.get(`ticket:${id}`);
    
    if (!ticket) {
      return c.json({ success: false, error: "Ticket not found" }, 404);
    }
    
    ticket.priority = priority;
    ticket.updated_at = new Date().toISOString();
    
    await kv.set(`ticket:${id}`, ticket);
    
    console.log(`Updated ticket ${id} priority to: ${priority}`);
    
    return c.json({ success: true, data: ticket });
  } catch (error) {
    console.error("Error updating ticket priority:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Assign ticket to user
app.patch("/make-server-ce0d67b8/tickets/:id/assign", async (c) => {
  try {
    const id = c.req.param("id");
    const { assigned_to, assigned_to_name } = await c.req.json();
    
    const ticket = await kv.get(`ticket:${id}`);
    
    if (!ticket) {
      return c.json({ success: false, error: "Ticket not found" }, 404);
    }
    
    ticket.assigned_to = assigned_to;
    ticket.assigned_to_name = assigned_to_name;
    ticket.assigned_at = new Date().toISOString();
    ticket.updated_at = new Date().toISOString();
    
    // Auto-update status to Assigned if currently Open
    if (ticket.status === "Open") {
      ticket.status = "Assigned";
    }
    
    await kv.set(`ticket:${id}`, ticket);
    
    console.log(`Assigned ticket ${id} to: ${assigned_to_name} (${assigned_to})`);
    
    return c.json({ success: true, data: ticket });
  } catch (error) {
    console.error("Error assigning ticket:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update ticket due date
app.patch("/make-server-ce0d67b8/tickets/:id/due-date", async (c) => {
  try {
    const id = c.req.param("id");
    const { due_date } = await c.req.json();
    
    const ticket = await kv.get(`ticket:${id}`);
    
    if (!ticket) {
      return c.json({ success: false, error: "Ticket not found" }, 404);
    }
    
    ticket.due_date = due_date;
    ticket.updated_at = new Date().toISOString();
    
    await kv.set(`ticket:${id}`, ticket);
    
    console.log(`Updated ticket ${id} due date to: ${due_date}`);
    
    return c.json({ success: true, data: ticket });
  } catch (error) {
    console.error("Error updating ticket due date:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete ticket
app.delete("/make-server-ce0d67b8/tickets/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    // Delete the ticket
    await kv.del(`ticket:${id}`);
    
    // Delete all comments for this ticket
    const comments = await kv.getByPrefix(`ticket_comment:${id}:`);
    for (const comment of comments) {
      await kv.del(`ticket_comment:${id}:${comment.id}`);
    }
    
    console.log(`Deleted ticket: ${id} and ${comments.length} comments`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== TICKET COMMENTS API ====================

// Generic activity logger for all system activities (dual storage)
async function logActivity(
  entity_type: string,
  entity_id: string,
  entity_name: string,
  action_type: string,
  user_id: string,
  user_name: string,
  user_department: string,
  old_value: string | null = null,
  new_value: string | null = null,
  metadata: any = {}
) {
  try {
    const timestamp = Date.now();
    const activity_id = `${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
    const activity = {
      id: activity_id,
      entity_type,
      entity_id,
      entity_name,
      action_type,
      user_id,
      user_name,
      user_department,
      old_value,
      new_value,
      metadata,
      timestamp: new Date().toISOString()
    };
    
    // Write to global activity log (for system-wide view)
    await kv.set(`activity_log:${timestamp}:${activity_id}`, activity);
    
    // Write to entity-specific log (for fast entity queries)
    if (entity_type === "ticket") {
      await kv.set(`ticket_activity:${entity_id}:${activity_id}`, activity);
    } else if (entity_type === "quotation") {
      await kv.set(`quotation_activity:${entity_id}:${activity_id}`, activity);
    } else if (entity_type === "booking") {
      await kv.set(`booking_activity:${entity_id}:${activity_id}`, activity);
    }
    
    console.log(`Activity logged: ${entity_type} ${entity_id} - ${action_type} by ${user_name}`);
  } catch (error) {
    console.error("Error logging activity:", error);
    // Don't throw - activity logging should not break the main flow
  }
}

// Helper function to log ticket activity (wrapper for backward compatibility)
async function logTicketActivity(
  ticket_id: string,
  action_type: string,
  user_id: string,
  user_name: string,
  user_department: string,
  old_value: string | null = null,
  new_value: string | null = null,
  metadata: any = {}
) {
  // Get ticket name for better display
  let ticket_name = ticket_id;
  try {
    const ticket = await kv.get(`ticket:${ticket_id}`);
    if (ticket && ticket.subject) {
      ticket_name = ticket.subject;
    }
  } catch (error) {
    // If we can't get ticket name, just use ID
  }
  
  await logActivity(
    "ticket",
    ticket_id,
    ticket_name,
    action_type,
    user_id,
    user_name,
    user_department,
    old_value,
    new_value,
    metadata
  );
}

// Add comment to ticket
app.post("/make-server-ce0d67b8/tickets/:id/comments", async (c) => {
  try {
    const ticket_id = c.req.param("id");
    const commentData = await c.req.json();
    
    // Verify ticket exists
    const ticket = await kv.get(`ticket:${ticket_id}`);
    if (!ticket) {
      return c.json({ success: false, error: "Ticket not found" }, 404);
    }
    
    // Generate unique comment ID
    const comment_id = `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const comment = {
      id: comment_id,
      ticket_id,
      user_id: commentData.user_id,
      user_name: commentData.user_name,
      user_department: commentData.user_department,
      content: commentData.content,
      created_at: new Date().toISOString()
    };
    
    // Save comment with key: ticket_comment:{ticket_id}:{comment_id}
    await kv.set(`ticket_comment:${ticket_id}:${comment_id}`, comment);
    
    // Update ticket's updated_at timestamp
    ticket.updated_at = new Date().toISOString();
    await kv.set(`ticket:${ticket_id}`, ticket);
    
    // Log activity: comment added
    await logTicketActivity(
      ticket_id,
      "comment_added",
      commentData.user_id,
      commentData.user_name,
      commentData.user_department,
      null,
      null,
      { comment_preview: commentData.content.substring(0, 100) }
    );
    
    console.log(`Added comment ${comment_id} to ticket ${ticket_id} by ${commentData.user_name}`);
    
    return c.json({ success: true, data: comment });
  } catch (error) {
    console.error("Error adding comment:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get all comments for a ticket
app.get("/make-server-ce0d67b8/tickets/:id/comments", async (c) => {
  try {
    const ticket_id = c.req.param("id");
    
    // Verify ticket exists
    const ticket = await kv.get(`ticket:${ticket_id}`);
    if (!ticket) {
      return c.json({ success: false, error: "Ticket not found" }, 404);
    }
    
    // Get all comments for this ticket
    const comments = await kv.getByPrefix(`ticket_comment:${ticket_id}:`);
    
    // Sort by created_at ascending (oldest first)
    comments.sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    return c.json({ success: true, data: comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get activity log for a ticket with role-based access control
app.get("/make-server-ce0d67b8/tickets/:id/activity", async (c) => {
  try {
    const ticket_id = c.req.param("id");
    const user_role = c.req.query("role");
    const user_department = c.req.query("department");
    
    // Check role-based access
    if (user_role === "rep") {
      return c.json({ 
        success: false, 
        error: "Access denied: Activity log is not available for Employee/Rep roles" 
      }, 403);
    }
    
    // Verify ticket exists
    const ticket = await kv.get(`ticket:${ticket_id}`);
    if (!ticket) {
      return c.json({ success: false, error: "Ticket not found" }, 404);
    }
    
    // Get all activities for this ticket
    let activities = await kv.getByPrefix(`ticket_activity:${ticket_id}:`);
    
    // Apply role-based filtering
    if (user_role === "manager") {
      // Managers can only see activities involving their department
      activities = activities.filter((activity: any) => {
        // Show if activity user is from manager's department
        // OR if ticket involves manager's department (from or to)
        return activity.user_department === user_department ||
               ticket.from_department === user_department ||
               ticket.to_department === user_department;
      });
    }
    // Executives see all activities (no filtering needed)
    
    // Sort by timestamp descending (newest first)
    activities.sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    console.log(`Fetched ${activities.length} activities for ticket ${ticket_id} (role: ${user_role})`);
    
    return c.json({ success: true, data: activities });
  } catch (error) {
    console.error("Error fetching ticket activities:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== GLOBAL ACTIVITY LOG API ====================

// Get system-wide activity log with role-based access and filters
app.get("/make-server-ce0d67b8/activity-log", async (c) => {
  try {
    const user_role = c.req.query("role");
    const user_department = c.req.query("department");
    const entity_type = c.req.query("entity_type");
    const action_type = c.req.query("action_type");
    const user_id = c.req.query("user_id");
    const date_from = c.req.query("date_from");
    const date_to = c.req.query("date_to");
    const limit = c.req.query("limit") ? parseInt(c.req.query("limit")!) : 50;
    const offset = c.req.query("offset") ? parseInt(c.req.query("offset")!) : 0;
    
    // Check role-based access
    if (user_role === "rep") {
      return c.json({ 
        success: false, 
        error: "Access denied: Activity log is not available for Employee/Rep roles" 
      }, 403);
    }
    
    // Get all activities from global log
    let activities = await kv.getByPrefix("activity_log:");
    
    console.log(`Found ${activities.length} activities in global log`);
    
    // TEMPORARY: Also fetch from old ticket_activity storage and migrate to global
    // This ensures we don't lose activities created before dual storage was implemented
    const oldTicketActivities = await kv.getByPrefix("ticket_activity:");
    console.log(`Found ${oldTicketActivities.length} old ticket activities to check for migration`);
    
    for (const oldActivity of oldTicketActivities) {
      // Check if this activity already exists in global log by searching for matching ID
      const existsInGlobal = activities.some((a: any) => a.id === oldActivity.id);
      
      if (!existsInGlobal) {
        // Migrate this activity to global log
        const timestamp = new Date(oldActivity.timestamp).getTime();
        const globalKey = `activity_log:${timestamp}:${oldActivity.id}`;
        
        // Add entity_type and entity_name if missing (old format compatibility)
        const migratedActivity = {
          ...oldActivity,
          entity_type: oldActivity.entity_type || "ticket",
          entity_id: oldActivity.entity_id || oldActivity.ticket_id,
          entity_name: oldActivity.entity_name || oldActivity.ticket_id
        };
        
        // Write to global log
        await kv.set(globalKey, migratedActivity);
        
        // Add to activities array for this request
        activities.push(migratedActivity);
        
        console.log(`Migrated activity ${oldActivity.id} to global log`);
      }
    }
    
    console.log(`Total activities after migration: ${activities.length}`);
    
    // Apply role-based filtering
    if (user_role === "manager") {
      // Managers can only see activities from their department
      activities = activities.filter((activity: any) => {
        return activity.user_department === user_department;
      });
    }
    // Executives see all activities (no filtering needed)
    
    // Apply entity_type filter
    if (entity_type && entity_type !== "all") {
      activities = activities.filter((activity: any) => activity.entity_type === entity_type);
    }
    
    // Apply action_type filter
    if (action_type && action_type !== "all") {
      activities = activities.filter((activity: any) => activity.action_type === action_type);
    }
    
    // Apply user_id filter
    if (user_id) {
      activities = activities.filter((activity: any) => activity.user_id === user_id);
    }
    
    // Apply date filters
    if (date_from) {
      const fromDate = new Date(date_from);
      activities = activities.filter((activity: any) => 
        new Date(activity.timestamp) >= fromDate
      );
    }
    
    if (date_to) {
      const toDate = new Date(date_to);
      toDate.setHours(23, 59, 59, 999); // End of day
      activities = activities.filter((activity: any) => 
        new Date(activity.timestamp) <= toDate
      );
    }
    
    // Sort by timestamp descending (newest first)
    activities.sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Apply pagination
    const total = activities.length;
    const paginated = activities.slice(offset, offset + limit);
    
    console.log(`Fetched ${paginated.length}/${total} activities for ${user_role} in ${user_department}`);
    
    return c.json({ 
      success: true, 
      data: paginated,
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error("Error fetching activity log:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== QUOTATIONS API ====================

// Create a new quotation
app.post("/make-server-ce0d67b8/quotations", async (c) => {
  try {
    const quotation = await c.req.json();
    
    // Generate unique ID if not provided
    if (!quotation.id) {
      quotation.id = `QUO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Auto-generate request number if status is "Processing" (for requests module)
    if (quotation.status === "Processing" && !quotation.quote_number) {
      const year = new Date().getFullYear();
      const counterKey = `request_counter:${year}`;
      let counter = await kv.get(counterKey);
      
      if (!counter) {
        counter = { value: 0 };
      }
      
      counter.value += 1;
      await kv.set(counterKey, counter);
      
      const sequenceNumber = counter.value.toString().padStart(3, '0');
      quotation.quote_number = `REQ-${year}-${sequenceNumber}`;
    }
    
    // Set timestamps
    quotation.created_at = quotation.created_at || new Date().toISOString();
    quotation.updated_at = new Date().toISOString();
    
    // Set default status if not provided
    if (!quotation.status) {
      quotation.status = "Draft";
    }
    
    // Save to KV store with key: quotation:{id}
    await kv.set(`quotation:${quotation.id}`, quotation);
    
    console.log(`Created quotation: ${quotation.id} with status: ${quotation.status}${quotation.quote_number ? `, number: ${quotation.quote_number}` : ''}`);
    
    return c.json({ success: true, data: quotation });
  } catch (error) {
    console.error("Error creating quotation:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get all quotations (with optional status filter)
app.get("/make-server-ce0d67b8/quotations", async (c) => {
  try {
    const status = c.req.query("status");
    const department = c.req.query("department");
    const customer_id = c.req.query("customer_id");
    const contact_id = c.req.query("contact_id");
    const search = c.req.query("search");
    const created_by = c.req.query("created_by");
    const date_from = c.req.query("date_from");
    const date_to = c.req.query("date_to");
    const sort_by = c.req.query("sort_by") || "updated_at"; // updated_at, created_at, quote_number
    const sort_order = c.req.query("sort_order") || "desc"; // asc or desc
    const limit = c.req.query("limit") ? parseInt(c.req.query("limit")!) : undefined;
    const offset = c.req.query("offset") ? parseInt(c.req.query("offset")!) : 0;
    
    // Get all quotations with prefix
    const quotations = await kv.getByPrefix("quotation:");
    
    // AUTOMATIC STATUS MIGRATION: Convert old status names to new ones
    // This ensures backward compatibility with quotations created before the status refactor
    const migrateStatus = (oldStatus: string): string => {
      const statusMigrationMap: Record<string, string> = {
        "Quotation": "Priced",           // Old → New
        "Approved": "Accepted by Client", // Old → New
        "Rejected": "Rejected by Client", // Old → New
        // All other statuses remain unchanged
      };
      return statusMigrationMap[oldStatus] || oldStatus;
    };
    
    // Apply status migration to all quotations
    let filtered = quotations.map((q: any) => ({
      ...q,
      status: migrateStatus(q.status)
    }));
    
    // Filter by customer_id if provided
    if (customer_id) {
      filtered = filtered.filter((q: any) => q.customer_id === customer_id);
    }
    
    // Filter by contact_id if provided
    if (contact_id) {
      filtered = filtered.filter((q: any) => q.contact_person_id === contact_id);
    }
    
    // Filter by created_by if provided
    if (created_by) {
      filtered = filtered.filter((q: any) => q.created_by === created_by);
    }
    
    // Filter by date range
    if (date_from) {
      const fromDate = new Date(date_from);
      filtered = filtered.filter((q: any) => 
        new Date(q.created_at) >= fromDate
      );
    }
    
    if (date_to) {
      const toDate = new Date(date_to);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter((q: any) => 
        new Date(q.created_at) <= toDate
      );
    }
    
    // Filter by search query (searches quote_number, quotation_name, and customer info)
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((q: any) => 
        q.quote_number?.toLowerCase().includes(searchLower) ||
        q.quotation_name?.toLowerCase().includes(searchLower) ||
        q.customer_name?.toLowerCase().includes(searchLower) ||
        q.id?.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by status if provided
    if (status) {
      filtered = filtered.filter((q: any) => q.status === status);
    }
    
    // NOTE: Department-based visibility filtering has been removed
    // The frontend now handles all tab filtering logic for better flexibility
    // This allows the frontend to control what quotations appear in which tabs
    // based on the two-layer status system (business view + technical workflow)
    
    // Get total count before pagination
    const total = filtered.length;
    
    // Sort
    filtered.sort((a: any, b: any) => {
      let aVal, bVal;
      
      switch (sort_by) {
        case "created_at":
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case "quote_number":
          aVal = a.quote_number || "";
          bVal = b.quote_number || "";
          break;
        case "updated_at":
        default:
          aVal = new Date(a.updated_at).getTime();
          bVal = new Date(b.updated_at).getTime();
          break;
      }
      
      if (sort_order === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
    
    // Apply pagination
    const paginated = limit ? filtered.slice(offset, offset + limit) : filtered;
    
    console.log(`Fetched ${paginated.length}/${total} quotations (offset: ${offset}, limit: ${limit || 'all'}) for department: ${department}, status: ${status}, search: ${search}`);
    
    return c.json({ 
      success: true, 
      data: paginated,
      pagination: {
        total,
        offset,
        limit: limit || total,
        hasMore: limit ? (offset + limit) < total : false
      }
    });
  } catch (error) {
    console.error("Error fetching quotations:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get single quotation by ID
app.get("/make-server-ce0d67b8/quotations/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const quotation = await kv.get(`quotation:${id}`);
    
    if (!quotation) {
      return c.json({ success: false, error: "Quotation not found" }, 404);
    }
    
    // Apply status migration for backward compatibility
    const statusMigrationMap: Record<string, string> = {
      "Quotation": "Priced",
      "Approved": "Accepted by Client",
      "Rejected": "Rejected by Client"
    };
    
    if (statusMigrationMap[quotation.status]) {
      quotation.status = statusMigrationMap[quotation.status];
    }
    
    return c.json({ success: true, data: quotation });
  } catch (error) {
    console.error("Error fetching quotation:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update quotation
app.put("/make-server-ce0d67b8/quotations/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    
    // Get existing quotation
    const existing = await kv.get(`quotation:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Quotation not found" }, 404);
    }
    
    // Merge updates
    const updated = {
      ...existing,
      ...updates,
      id, // Preserve ID
      created_at: existing.created_at, // Preserve created_at
      updated_at: new Date().toISOString()
    };
    
    // Save back
    await kv.set(`quotation:${id}`, updated);
    
    console.log(`Updated quotation: ${id}, new status: ${updated.status}`);
    
    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating quotation:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Submit inquiry to pricing (BD → Pricing)
app.post("/make-server-ce0d67b8/quotations/:id/submit", async (c) => {
  try {
    const id = c.req.param("id");
    const quotation = await kv.get(`quotation:${id}`);
    
    if (!quotation) {
      return c.json({ success: false, error: "Quotation not found" }, 404);
    }
    
    // Change status from Draft to Pending Pricing
    quotation.status = "Pending Pricing";
    quotation.submitted_at = new Date().toISOString();
    quotation.updated_at = new Date().toISOString();
    
    await kv.set(`quotation:${id}`, quotation);
    
    console.log(`Submitted quotation ${id} to Pricing`);
    
    return c.json({ success: true, data: quotation });
  } catch (error) {
    console.error("Error submitting quotation:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Convert to full quotation (Pricing adds pricing and accepts)
app.post("/make-server-ce0d67b8/quotations/:id/convert", async (c) => {
  try {
    const id = c.req.param("id");
    const pricingData = await c.req.json();
    
    const quotation = await kv.get(`quotation:${id}`);
    
    if (!quotation) {
      return c.json({ success: false, error: "Quotation not found" }, 404);
    }
    
    // Merge pricing data and change status to Quotation (accepted)
    const converted = {
      ...quotation,
      ...pricingData,
      status: "Quotation",
      converted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await kv.set(`quotation:${id}`, converted);
    
    console.log(`Converted quotation ${id} to full Quotation`);
    
    return c.json({ success: true, data: converted });
  } catch (error) {
    console.error("Error converting quotation:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete quotation
app.delete("/make-server-ce0d67b8/quotations/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    await kv.del(`quotation:${id}`);
    
    console.log(`Deleted quotation: ${id}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting quotation:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Migrate quotation statuses (one-time migration from old status names to new)
app.post("/make-server-ce0d67b8/quotations/migrate-statuses", async (c) => {
  try {
    const quotations = await kv.getByPrefix("quotation:");
    
    const statusMigrationMap: Record<string, string> = {
      "Quotation": "Priced",
      "Approved": "Accepted by Client",
      "Rejected": "Rejected by Client"
    };
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const quotation of quotations) {
      const oldStatus = quotation.status;
      const newStatus = statusMigrationMap[oldStatus];
      
      if (newStatus) {
        quotation.status = newStatus;
        quotation.updated_at = new Date().toISOString();
        await kv.set(`quotation:${quotation.id}`, quotation);
        console.log(`Migrated quotation ${quotation.id}: "${oldStatus}" → "${newStatus}"`);
        migratedCount++;
      } else {
        skippedCount++;
      }
    }
    
    console.log(`Migration complete: ${migratedCount} quotations migrated, ${skippedCount} skipped`);
    
    return c.json({ 
      success: true, 
      message: `Migration complete: ${migratedCount} quotations migrated, ${skippedCount} skipped`,
      migrated: migratedCount,
      skipped: skippedCount
    });
  } catch (error) {
    console.error("Error migrating quotation statuses:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update quotation status (for BD workflow: Sent to Client, Approved, Rejected, etc.)
app.patch("/make-server-ce0d67b8/quotations/:id/status", async (c) => {
  try {
    const id = c.req.param("id");
    const { status, user_id, user_name, user_department, sent_to_client_at } = await c.req.json();
    
    const quotation = await kv.get(`quotation:${id}`);
    
    if (!quotation) {
      return c.json({ success: false, error: "Quotation not found" }, 404);
    }
    
    const oldStatus = quotation.status;
    quotation.status = status;
    quotation.updated_at = new Date().toISOString();
    
    // Track when sent to client (for expiration calculation)
    if (status === "Sent to Client" && sent_to_client_at) {
      quotation.sent_to_client_at = sent_to_client_at;
      
      // Calculate expiration date based on validity_period
      if (quotation.validity_period) {
        const validityDays = parseInt(quotation.validity_period);
        if (!isNaN(validityDays)) {
          const expiresAt = new Date(sent_to_client_at);
          expiresAt.setDate(expiresAt.getDate() + validityDays);
          quotation.expires_at = expiresAt.toISOString();
        }
      }
    }
    
    // Track when client approved/rejected
    if (status === "Accepted by Client") {
      quotation.client_accepted_at = new Date().toISOString();
    } else if (status === "Rejected by Client") {
      quotation.client_rejected_at = new Date().toISOString();
    }
    
    await kv.set(`quotation:${id}`, quotation);
    
    // Log activity
    if (user_id && user_name && user_department && oldStatus !== status) {
      await logActivity(
        "quotation",
        id,
        quotation.quote_number || quotation.quotation_name || id,
        "status_changed",
        user_id,
        user_name,
        user_department,
        oldStatus,
        status
      );
    }
    
    console.log(`Updated quotation ${id} status: ${oldStatus} → ${status}`);
    
    return c.json({ success: true, data: quotation });
  } catch (error) {
    console.error("Error updating quotation status:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create new version of quotation (for client-requested revisions)
app.post("/make-server-ce0d67b8/quotations/:id/revise", async (c) => {
  try {
    const id = c.req.param("id");
    const { revision_reason, user_id, user_name, user_department } = await c.req.json();
    
    const quotation = await kv.get(`quotation:${id}`);
    
    if (!quotation) {
      return c.json({ success: false, error: "Quotation not found" }, 404);
    }
    
    // Initialize version control if not already present
    if (!quotation.current_version) {
      quotation.current_version = 1;
      quotation.versions = [{
        version: 1,
        created_at: quotation.created_at,
        created_by_user_id: quotation.created_by,
        created_by_user_name: user_name,
        charge_categories: quotation.charge_categories,
        financial_summary: quotation.financial_summary,
        sent_to_client_at: quotation.sent_to_client_at,
        revision_reason: "Initial quotation"
      }];
    }
    
    // Mark quotation as needing revision
    quotation.status = "Needs Revision";
    quotation.revision_requested_at = new Date().toISOString();
    quotation.pending_revision_reason = revision_reason;
    quotation.updated_at = new Date().toISOString();
    
    await kv.set(`quotation:${id}`, quotation);
    
    // Log activity
    if (user_id && user_name && user_department) {
      await logActivity(
        "quotation",
        id,
        quotation.quote_number || quotation.quotation_name || id,
        "revision_requested",
        user_id,
        user_name,
        user_department,
        null,
        null,
        { revision_reason }
      );
    }
    
    console.log(`Quotation ${id} marked for revision: ${revision_reason}`);
    
    return c.json({ success: true, data: quotation });
  } catch (error) {
    console.error("Error requesting quotation revision:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== PROJECTS API ====================

// Accept quotation and create project in one atomic operation
app.post("/make-server-ce0d67b8/quotations/:id/accept-and-create-project", async (c) => {
  try {
    const quotation_id = c.req.param("id");
    const { bd_owner_user_id, bd_owner_user_name, ops_assigned_user_id, ops_assigned_user_name, special_instructions } = await c.req.json();
    
    // Get quotation
    const quotation = await kv.get(`quotation:${quotation_id}`);
    
    if (!quotation) {
      return c.json({ success: false, error: "Quotation not found" }, 404);
    }
    
    // Verify quotation is in correct status
    if (quotation.status !== "Accepted by Client") {
      return c.json({ success: false, error: "Can only create projects from quotations with 'Accepted by Client' status" }, 400);
    }
    
    // Check if project already exists for this quotation
    if (quotation.project_id) {
      return c.json({ success: false, error: "Project already exists for this quotation" }, 400);
    }
    
    // Debug: Log services metadata from quotation
    console.log(`Quotation ${quotation.quote_number} has ${quotation.services_metadata?.length || 0} service specifications`);
    if (quotation.services_metadata && quotation.services_metadata.length > 0) {
      console.log(`  Service types: ${quotation.services_metadata.map((s: any) => s.service_type).join(", ")}`);
      console.log(`  Services metadata:`, JSON.stringify(quotation.services_metadata, null, 2));
    } else {
      console.log(`  WARNING: services_metadata is empty or undefined!`);
      console.log(`  Quotation services array:`, quotation.services);
    }
    
    // Generate project number: PROJ-2025-001
    const year = new Date().getFullYear();
    const counterKey = `project_counter:${year}`;
    let counter = await kv.get(counterKey);
    
    if (!counter) {
      counter = { value: 0 };
    }
    
    counter.value += 1;
    await kv.set(counterKey, counter);
    
    const sequenceNumber = counter.value.toString().padStart(3, '0');
    const project_number = `PROJ-${year}-${sequenceNumber}`;
    
    // Generate unique project ID
    const project_id = `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create project from quotation data
    const project = {
      id: project_id,
      project_number,
      quotation_id: quotation.id,
      quotation_number: quotation.quote_number,
      quotation_name: quotation.quotation_name,
      
      // Inherit from quotation
      customer_id: quotation.customer_id,
      customer_name: quotation.customer_name,
      contact_person_id: quotation.contact_person_id,
      contact_person_name: quotation.contact_person_name,
      services: quotation.services || [],
      services_metadata: quotation.services_metadata || [],
      charge_categories: quotation.charge_categories || [],
      currency: quotation.currency,
      total: quotation.financial_summary?.grand_total || 0,
      
      // Shipment details
      movement: quotation.movement,
      category: quotation.category,
      pol_aol: quotation.pol_aol,
      pod_aod: quotation.pod_aod,
      commodity: quotation.commodity,
      incoterm: quotation.incoterm,
      carrier: quotation.carrier,
      volume: quotation.volume,
      gross_weight: quotation.gross_weight,
      chargeable_weight: quotation.chargeable_weight,
      dimensions: quotation.dimensions,
      collection_address: quotation.collection_address,
      
      // Project-specific fields (optional)
      shipment_ready_date: null,
      requested_etd: null,
      special_instructions: special_instructions || "",
      
      // Simplified status (Active/Completed)
      status: "Active",
      booking_status: "Not Booked",
      
      // Bidirectional linking
      linkedBookings: [],
      
      // Ownership
      bd_owner_user_id: bd_owner_user_id || quotation.created_by,
      bd_owner_user_name: bd_owner_user_name || "",
      ops_assigned_user_id: ops_assigned_user_id || null,
      ops_assigned_user_name: ops_assigned_user_name || null,
      
      // Timestamps
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null
    };
    
    // Save project
    await kv.set(`project:${project_id}`, project);
    
    // Update quotation: mark as converted and link to project
    quotation.project_id = project_id;
    quotation.project_number = project_number;
    quotation.status = "Converted to Project";
    quotation.converted_to_project_at = new Date().toISOString();
    quotation.updated_at = new Date().toISOString();
    await kv.set(`quotation:${quotation.id}`, quotation);
    
    // Log activity
    if (bd_owner_user_id && bd_owner_user_name) {
      await logActivity(
        "project",
        project_id,
        project_number,
        "project_created",
        bd_owner_user_id,
        bd_owner_user_name,
        "Business Development",
        null,
        null,
        { quotation_id: quotation.id, quotation_number: quotation.quote_number }
      );
    }
    
    console.log(`✓ Accepted quotation ${quotation.quote_number} and created project ${project_number}`);
    console.log(`   Services metadata copied: ${project.services_metadata?.length || 0} services`);
    
    return c.json({ 
      success: true, 
      data: {
        quotation,
        project
      }
    });
  } catch (error) {
    console.error("Error accepting quotation and creating project:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create a new project from approved quotation
app.post("/make-server-ce0d67b8/projects", async (c) => {
  try {
    const projectData = await c.req.json();
    
    // Handle multi-client or single client
    let clientIds: string[] = [];
    let clientNames: string[] = [];
    let primaryClient = null;
    
    if (projectData.client_ids && Array.isArray(projectData.client_ids) && projectData.client_ids.length > 0) {
      // Multi-client scenario
      clientIds = projectData.client_ids;
      clientNames = projectData.client_names || [];
      
      // Verify all clients exist
      for (const clientId of clientIds) {
        const client = await kv.get(`client:${clientId}`);
        if (!client) {
          return c.json({ success: false, error: `Client not found: ${clientId}` }, 404);
        }
        if (!primaryClient) {
          primaryClient = client; // Use first client as primary
        }
      }
    } else if (projectData.client_id || projectData.customer_id) {
      // Single client scenario (backward compatibility)
      const clientId = projectData.client_id || projectData.customer_id;
      const client = await kv.get(`client:${clientId}`);
      
      if (!client) {
        return c.json({ success: false, error: "Client not found" }, 404);
      }
      
      console.log(`🔍 DEBUG: Fetched client data for project creation:`, {
        id: client.id,
        company_name: client.company_name || client.name,
        client_name: client.client_name,
        hasClientName: !!client.client_name
      });
      
      primaryClient = client;
      clientIds = [clientId];
      clientNames = [client.name || client.company_name];
    } else {
      return c.json({ success: false, error: "No client specified" }, 400);
    }
    
    // Extract company names and contact person names from clients
    const companyNames = clientIds.map((id, index) => {
      if (index === 0 && primaryClient) {
        return primaryClient.name || primaryClient.company_name;
      }
      return clientNames[index];
    });
    
    const contactPersonNames = clientIds.map((id, index) => {
      if (index === 0 && primaryClient) {
        // Extract contact person name from client_name field
        const contactName = primaryClient.client_name || '';
        console.log(`📋 Extracting contact person for client ${id}:`, contactName);
        return contactName;
      }
      return ''; // For multi-client, would need to fetch each client
    });
    
    // Generate booking reference based on movement type (EXP-XXXXXX or IMP-XXXXXX)
    const movement = projectData.movement || "Export";
    const prefix = movement === "Export" ? "EXP" : movement === "Import" ? "IMP" : "PROJ";
    const counterKey = `${prefix.toLowerCase()}_booking_counter`;
    let counter = await kv.get(counterKey);
    
    if (!counter) {
      counter = { value: 0 };
    }
    
    counter.value += 1;
    await kv.set(counterKey, counter);
    
    const sequenceNumber = counter.value.toString().padStart(6, '0');
    const booking_reference = `${prefix}-${sequenceNumber}`;
    
    // Also generate project number: PROJ-2026-001
    const year = new Date().getFullYear();
    const projectCounterKey = `project_counter:${year}`;
    let projectCounter = await kv.get(projectCounterKey);
    
    if (!projectCounter) {
      projectCounter = { value: 0 };
    }
    
    projectCounter.value += 1;
    await kv.set(projectCounterKey, projectCounter);
    
    const projectSequenceNumber = projectCounter.value.toString().padStart(3, '0');
    const project_number = `PROJ-${year}-${projectSequenceNumber}`;
    
    // Generate unique project ID
    const project_id = `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create project with comprehensive fields
    const project = {
      id: project_id,
      project_number,
      booking_reference,
      
      // Basic Information
      project_name: projectData.project_name || `${clientNames.join(', ')} - ${booking_reference}`,
      description: projectData.description || '',
      date: projectData.date || new Date().toISOString().split('T')[0],
      
      // Multi-client support
      client_ids: clientIds,
      client_names: clientNames,
      
      // Client information (using primary client for backward compatibility)
      client_id: clientIds[0],
      customer_id: clientIds[0],
      client_name: companyNames[0], // Company name
      customer_name: companyNames[0], // Company name (backward compatibility)
      company_name: companyNames[0], // ✨ NEW: Explicit company name from Client module
      contact_person_name: contactPersonNames[0] || projectData.contact_person_name || '', // ✨ NEW: Contact person from Client module
      
      // Booking Details
      bl_number: projectData.bl_number || '',
      shipper: projectData.shipper || '',
      consignee: projectData.consignee || '',
      commodity: projectData.commodity || '',
      
      // Shipment Details
      movement: projectData.movement || '',
      category: projectData.category || '',
      shipment_type: projectData.shipment_type || '',
      pol_aol: projectData.pol_aol || '',
      pod_aod: projectData.pod_aod || projectData.pod || '',
      pod: projectData.pod || projectData.pod_aod || '',
      origin: projectData.origin || '',
      destination: projectData.destination || projectData.pod_aod || '',
      carrier: projectData.carrier || '',
      shipping_line: projectData.shipping_line || projectData.carrier || '',
      vessel: projectData.vessel || '',
      voyage: projectData.voyage || '',
      vessel_voyage: projectData.vessel_voyage || '',
      transit_days: projectData.transit_days || '',
      incoterm: projectData.incoterm || '',
      
      // Cargo Details
      cargo_type: projectData.cargo_type || '',
      stackability: projectData.stackability || '',
      volume: projectData.volume || projectData.volume_containers || '',
      volume_cbm: projectData.volume_cbm || '',
      volume_containers: projectData.volume_containers || '',
      volume_packages: projectData.volume_packages || '',
      gross_weight: projectData.gross_weight || '',
      chargeable_weight: projectData.chargeable_weight || '',
      dimensions: projectData.dimensions || '',
      container_number: projectData.container_number || '',
      
      // Trucking & Loading
      trucker: projectData.trucker || '',
      loading_address: projectData.loading_address || projectData.collection_address || '',
      collection_address: projectData.collection_address || projectData.loading_address || '',
      loading_schedule: projectData.loading_schedule || '',
      releasing_date: projectData.releasing_date || '',
      
      // Timeline
      client_po_number: projectData.client_po_number || '',
      client_po_date: projectData.client_po_date || '',
      shipment_ready_date: projectData.shipment_ready_date || '',
      requested_etd: projectData.requested_etd || '',
      actual_etd: projectData.actual_etd || '',
      eta: projectData.eta || '',
      actual_delivery_date: projectData.actual_delivery_date || '',
      
      // Financial Particulars
      financial_particulars: projectData.financial_particulars || [],
      
      // Special Instructions
      special_instructions: projectData.special_instructions || '',
      
      // Project status
      status: projectData.status || "Planning", // Planning, Active, Completed, Cancelled
      booking_status: "No Bookings",
      
      // Dates
      start_date: projectData.start_date || projectData.date || new Date().toISOString().split('T')[0],
      end_date: projectData.end_date || null,
      
      // Linked bookings
      linked_bookings: [],
      
      // Timestamps
      created_at: new Date().toISOString(),
      created_by: projectData.created_by,
      created_by_name: projectData.created_by_name,
      updated_at: new Date().toISOString(),
      completed_at: null
    };
    
    // Save project
    await kv.set(`project:${project_id}`, project);
    
    console.log(`✅ Created project: ${project_number} (${booking_reference})`);
    console.log(`   Company: ${project.company_name}`);
    console.log(`   Contact Person: ${project.contact_person_name}`);
    
    return c.json({ success: true, data: project });
  } catch (error) {
    console.error("Error creating project:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get all projects (with filters)
app.get("/make-server-ce0d67b8/projects", async (c) => {
  try {
    const status = c.req.query("status");
    const client_id = c.req.query("client_id");
    const search = c.req.query("search");
    
    // Get all projects
    let projects = await kv.getByPrefix("project:");
    
    // Get all billings, collections, expenses, and vouchers for aggregation
    const allBillings = await kv.getByPrefix("billing:");
    const allCollections = await kv.getByPrefix("collection:");
    const allExpenses = await kv.getByPrefix("expense:");
    const allVouchers = await kv.getByPrefix("voucher:");
    
    // Add financial data to each project
    projects = projects.map((project: any) => {
      // BILLINGS: Calculate outstanding
      const projectBillings = allBillings.filter((billing: any) => billing.projectId === project.id);
      const totalBilled = projectBillings.reduce((sum: number, billing: any) => sum + (billing.totalAmount || 0), 0);
      
      const projectBillingIds = projectBillings.map((b: any) => b.id);
      const totalCollections = computeCollectedForBillingIds(projectBillingIds, allCollections);
      
      const billingsOutstanding = totalBilled - totalCollections;
      
      // EXPENSES: Calculate outstanding
      // Get all bookings for this project
      const projectBookingIds = project.bookings?.map((b: any) => b.id || b.bookingId) || [];
      
      // Find expenses for this project (either direct projectId or via bookings)
      const projectExpenses = allExpenses.filter((expense: any) => {
        // Direct project link
        if (expense.projectId === project.id || expense.project_id === project.id) {
          return true;
        }
        // Via bookings
        if (expense.bookingIds && Array.isArray(expense.bookingIds)) {
          return expense.bookingIds.some((bookingId: string) => projectBookingIds.includes(bookingId));
        }
        // Legacy single bookingId
        if (expense.bookingId || expense.booking_id) {
          return projectBookingIds.includes(expense.bookingId || expense.booking_id);
        }
        return false;
      });
      
      // Calculate total expenses (sum from charges if available, otherwise use amount field)
      const totalExpenses = projectExpenses.reduce((sum: number, expense: any) => {
        if (expense.charges && Array.isArray(expense.charges) && expense.charges.length > 0) {
          const calculatedAmount = expense.charges.reduce((chargeSum: number, charge: any) => 
            chargeSum + (charge.amount || 0), 0
          );
          return sum + calculatedAmount;
        }
        return sum + (expense.amount || 0);
      }, 0);
      
      // Find vouchers for these expenses
      const projectExpenseIds = projectExpenses.map((e: any) => e.id);
      const projectVouchers = allVouchers.filter((voucher: any) => 
        projectExpenseIds.includes(voucher.expenseId)
      );
      
      // Calculate total vouchers (sum of PAID voucher amounts)
      const totalVouchers = projectVouchers
        .filter((voucher: any) => voucher.status === "Paid")
        .reduce((sum: number, voucher: any) => 
          sum + (voucher.amount || 0), 0
        );
      
      const expensesOutstanding = totalExpenses - totalVouchers;
      
      return {
        ...project,
        // Billing fields
        totalBilled,
        totalCollections,
        billingsOutstanding,
        balance: billingsOutstanding, // Keep for backward compatibility
        // Expense fields
        totalExpenses,
        totalVouchers,
        expensesOutstanding
      };
    });
    
    // Apply filters
    if (status) {
      projects = projects.filter((p: any) => p.status === status);
    }
    
    if (client_id) {
      projects = projects.filter((p: any) => p.client_id === client_id);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      projects = projects.filter((p: any) =>
        p.project_number?.toLowerCase().includes(searchLower) ||
        p.project_name?.toLowerCase().includes(searchLower) ||
        p.client_name?.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort by created_at descending (newest first)
    projects.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    console.log(`Fetched ${projects.length} projects with financial data`);
    
    return c.json({ success: true, data: projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get single project by ID
app.get("/make-server-ce0d67b8/projects/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const project = await kv.get(`project:${id}`);
    
    if (!project) {
      return c.json({ success: false, error: "Project not found" }, 404);
    }
    
    // Get all billings, collections, expenses, and vouchers for this project
    const allBillings = await kv.getByPrefix("billing:");
    const allCollections = await kv.getByPrefix("collection:");
    const allExpenses = await kv.getByPrefix("expense:");
    const allVouchers = await kv.getByPrefix("voucher:");
    
    // BILLINGS: Calculate outstanding
    const projectBillings = allBillings.filter((billing: any) => billing.projectId === id);
    const totalBilled = projectBillings.reduce((sum: number, billing: any) => sum + (billing.totalAmount || 0), 0);
    
    const projectBillingIds = projectBillings.map((b: any) => b.id);
    const totalCollections = computeCollectedForBillingIds(projectBillingIds, allCollections, "Collected");
    
    const billingsOutstanding = totalBilled - totalCollections;
    
    // EXPENSES: Calculate outstanding
    // Get all bookings for this project
    const projectBookingIds = project.bookings?.map((b: any) => b.id || b.bookingId) || [];
    
    // Find expenses for this project (either direct projectId or via bookings)
    const projectExpenses = allExpenses.filter((expense: any) => {
      // Direct project link
      if (expense.projectId === id || expense.project_id === id) {
        return true;
      }
      // Via bookings
      if (expense.bookingIds && Array.isArray(expense.bookingIds)) {
        return expense.bookingIds.some((bookingId: string) => projectBookingIds.includes(bookingId));
      }
      // Legacy single bookingId
      if (expense.bookingId || expense.booking_id) {
        return projectBookingIds.includes(expense.bookingId || expense.booking_id);
      }
      return false;
    });
    
    // Calculate total expenses (sum from charges if available, otherwise use amount field)
    const totalExpenses = projectExpenses.reduce((sum: number, expense: any) => {
      if (expense.charges && Array.isArray(expense.charges) && expense.charges.length > 0) {
        const calculatedAmount = expense.charges.reduce((chargeSum: number, charge: any) => 
          chargeSum + (charge.amount || 0), 0
        );
        return sum + calculatedAmount;
      }
      return sum + (expense.amount || 0);
    }, 0);
    
    // Find vouchers for these expenses
    const projectExpenseIds = projectExpenses.map((e: any) => e.id);
    const projectVouchers = allVouchers.filter((voucher: any) => 
      projectExpenseIds.includes(voucher.expenseId)
    );
    
    // Calculate total vouchers (sum of PAID voucher amounts)
    const totalVouchers = projectVouchers
      .filter((voucher: any) => voucher.status === "Paid")
      .reduce((sum: number, voucher: any) => 
        sum + (voucher.amount || 0), 0
      );
    
    const expensesOutstanding = totalExpenses - totalVouchers;
    
    const projectWithFinancials = {
      ...project,
      // Billing fields
      totalBilled,
      totalCollections,
      billingsOutstanding,
      balance: billingsOutstanding, // Keep for backward compatibility
      // Expense fields
      totalExpenses,
      totalVouchers,
      expensesOutstanding
    };
    
    return c.json({ success: true, data: projectWithFinancials });
  } catch (error) {
    console.error("Error fetching project:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get all bookings for a project
app.get("/make-server-ce0d67b8/projects/:id/bookings", async (c) => {
  try {
    const id = c.req.param("id");
    const project = await kv.get(`project:${id}`);
    
    if (!project) {
      return c.json({ success: false, error: "Project not found" }, 404);
    }
    
    // Fetch all bookings linked to this project (ALL booking types)
    const allExportBookings = await kv.getByPrefix("export_booking:");
    const allImportBookings = await kv.getByPrefix("import_booking:");
    const allTruckingBookings = await kv.getByPrefix("trucking_booking:");
    const allForwardingBookings = await kv.getByPrefix("forwarding_booking:");
    const allBrokerageBookings = await kv.getByPrefix("brokerage_booking:");
    const allMarineInsuranceBookings = await kv.getByPrefix("marine_insurance_booking:");
    const allOthersBookings = await kv.getByPrefix("others_booking:");
    
    const exportBookings = allExportBookings.filter((b: any) => b.project_id === id || b.projectId === id);
    const importBookings = allImportBookings.filter((b: any) => b.project_id === id || b.projectId === id);
    const truckingBookings = allTruckingBookings.filter((b: any) => b.project_id === id || b.projectId === id);
    const forwardingBookings = allForwardingBookings.filter((b: any) => b.project_id === id || b.projectId === id);
    const brokerageBookings = allBrokerageBookings.filter((b: any) => b.project_id === id || b.projectId === id);
    const marineInsuranceBookings = allMarineInsuranceBookings.filter((b: any) => b.project_id === id || b.projectId === id);
    const othersBookings = allOthersBookings.filter((b: any) => b.project_id === id || b.projectId === id);
    
    const bookings = [
      ...exportBookings.map((b: any) => ({ ...b, booking_type: 'Export' })),
      ...importBookings.map((b: any) => ({ ...b, booking_type: 'Import' })),
      ...truckingBookings.map((b: any) => ({ ...b, booking_type: 'Trucking' })),
      ...forwardingBookings.map((b: any) => ({ ...b, booking_type: 'Forwarding' })),
      ...brokerageBookings.map((b: any) => ({ ...b, booking_type: 'Brokerage' })),
      ...marineInsuranceBookings.map((b: any) => ({ ...b, booking_type: 'Marine Insurance' })),
      ...othersBookings.map((b: any) => ({ ...b, booking_type: 'Others' }))
    ];
    
    // Sort by created_at descending
    bookings.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    console.log(`Fetched ${bookings.length} bookings for project ${project.project_number}`);
    
    return c.json({ success: true, data: bookings });
  } catch (error) {
    console.error("Error fetching project bookings:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get all billings for a project (directly by projectId)
app.get("/make-server-ce0d67b8/projects/:id/billings", async (c) => {
  try {
    const id = c.req.param("id");
    const project = await kv.get(`project:${id}`);
    
    if (!project) {
      return c.json({ success: false, error: "Project not found" }, 404);
    }
    
    // Fetch all billings directly by projectId
    const allBillings = await kv.getByPrefix("billing:");
    const projectBillings = allBillings.filter((billing: any) => billing.projectId === id);
    
    // Sort by createdAt descending
    projectBillings.sort((a: any, b: any) =>
      new Date(b.createdAt || b.created_at).getTime() - new Date(a.createdAt || a.created_at).getTime()
    );
    
    console.log(`Fetched ${projectBillings.length} billings for project ${project.project_number}`);
    
    return c.json({ success: true, data: projectBillings });
  } catch (error) {
    console.error("Error fetching project billings:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get all expenses for a project (all bookings in the project)
app.get("/make-server-ce0d67b8/projects/:id/expenses", async (c) => {
  try {
    const id = c.req.param("id");
    const project = await kv.get(`project:${id}`);
    
    if (!project) {
      return c.json({ success: false, error: "Project not found" }, 404);
    }
    
    // Fetch all bookings linked to this project
    const allExportBookings = await kv.getByPrefix("export_booking:");
    const allImportBookings = await kv.getByPrefix("import_booking:");
    const allForwardingBookings = await kv.getByPrefix("forwarding_booking:");
    const allTruckingBookings = await kv.getByPrefix("trucking_booking:");
    const allBrokerageBookings = await kv.getByPrefix("brokerage_booking:");
    const allOthersBookings = await kv.getByPrefix("others_booking:");
    
    const projectBookingIds = [
      ...allExportBookings.filter((b: any) => b.project_id === id || b.projectId === id).map((b: any) => b.bookingId),
      ...allImportBookings.filter((b: any) => b.project_id === id || b.projectId === id).map((b: any) => b.bookingId),
      ...allForwardingBookings.filter((b: any) => b.project_id === id || b.projectId === id).map((b: any) => b.bookingId),
      ...allTruckingBookings.filter((b: any) => b.project_id === id || b.projectId === id).map((b: any) => b.bookingId),
      ...allBrokerageBookings.filter((b: any) => b.project_id === id || b.projectId === id).map((b: any) => b.bookingId),
      ...allOthersBookings.filter((b: any) => b.project_id === id || b.projectId === id).map((b: any) => b.bookingId)
    ];
    
    // Fetch all expenses and vouchers
    const allExpenses = await kv.getByPrefix("expense:");
    const allVouchers = await kv.getByPrefix("voucher:");
    
    // Filter expenses that either:
    // 1. Belong to bookings in this project (via bookingIds array)
    // 2. Are directly linked to this project (via projectId field)
    const projectExpenses = allExpenses.filter((expense: any) => {
      // Check if expense is directly linked to this project
      if (expense.projectId === id || expense.project_id === id) {
        return true;
      }
      
      // Check if expense belongs to a booking in this project
      if (expense.bookingIds && Array.isArray(expense.bookingIds)) {
        return expense.bookingIds.some((bookingId: string) => 
          projectBookingIds.includes(bookingId)
        );
      }
      
      // Legacy: single bookingId field
      if (expense.bookingId || expense.booking_id) {
        return projectBookingIds.includes(expense.bookingId || expense.booking_id);
      }
      
      return false;
    });
    
    // Calculate amount from charges for each expense (if charges exist) AND add voucher info
    const expensesWithCalculatedAmounts = projectExpenses.map((expense: any) => {
      let calculatedAmount = 0;
      
      if (expense.charges && Array.isArray(expense.charges) && expense.charges.length > 0) {
        calculatedAmount = expense.charges.reduce((sum: number, charge: any) => 
          sum + (charge.amount || 0), 0
        );
      } else {
        // If no charges, keep existing amount or default to 0
        calculatedAmount = expense.amount || 0;
      }
      
      // Calculate vouchers for this expense
      const expenseVouchers = allVouchers.filter((v: any) => v.expenseId === expense.id);
      const totalVouchers = expenseVouchers.reduce((sum: number, v: any) => sum + (v.amount || 0), 0);
      const outstanding = calculatedAmount - totalVouchers;
      
      // Calculate payment status based on voucher coverage
      let paymentStatus = "Unpaid";
      if (totalVouchers > 0) {
        const coverage = calculatedAmount > 0 ? (totalVouchers / calculatedAmount) * 100 : 0;
        if (coverage >= 100) {
          paymentStatus = "Paid";
        } else {
          paymentStatus = "Partially Paid";
        }
      }
      
      return {
        ...expense,
        amount: calculatedAmount,
        totalVouchers,
        outstanding,
        pendingAmount: outstanding, // Add alias for frontend consistency
        paymentStatus // NEW: Calculated payment status based on vouchers
      };
    });
    
    // Sort by createdAt descending
    expensesWithCalculatedAmounts.sort((a: any, b: any) =>
      new Date(b.createdAt || b.created_at).getTime() - new Date(a.createdAt || a.created_at).getTime()
    );
    
    // Calculate totals for the project
    const totalExpenses = expensesWithCalculatedAmounts.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    const totalVouchers = expensesWithCalculatedAmounts.reduce((sum: number, e: any) => sum + (e.totalVouchers || 0), 0);
    const expensesOutstanding = totalExpenses - totalVouchers;
    
    console.log(`Fetched ${expensesWithCalculatedAmounts.length} expenses for project ${project.project_number} - Total: ₱${totalExpenses.toFixed(2)}, Vouchers: ₱${totalVouchers.toFixed(2)}, Outstanding: ₱${expensesOutstanding.toFixed(2)}`);
    
    return c.json({ 
      success: true, 
      data: expensesWithCalculatedAmounts,
      summary: {
        totalExpenses,
        totalVouchers,
        expensesOutstanding
      }
    });
  } catch (error) {
    console.error("Error fetching project expenses:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ALTERNATIVE SERVER ID ENDPOINTS FOR COMPATIBILITY
// Get all billings for a project (alternative server ID - directly by projectId)
app.get("/make-server-c142e950/projects/:id/billings", async (c) => {
  try {
    const id = c.req.param("id");
    const project = await kv.get(`project:${id}`);
    
    if (!project) {
      return c.json({ success: false, error: "Project not found" }, 404);
    }
    
    // Fetch all billings directly by projectId
    const allBillings = await kv.getByPrefix("billing:");
    const projectBillings = allBillings.filter((billing: any) => billing.projectId === id);
    
    // Sort by createdAt descending
    projectBillings.sort((a: any, b: any) =>
      new Date(b.createdAt || b.created_at).getTime() - new Date(a.createdAt || a.created_at).getTime()
    );
    
    console.log(`Fetched ${projectBillings.length} billings for project ${project.project_number}`);
    
    return c.json({ success: true, data: projectBillings });
  } catch (error) {
    console.error("Error fetching project billings:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get all expenses for a project (alternative server ID)
app.get("/make-server-c142e950/projects/:id/expenses", async (c) => {
  try {
    const id = c.req.param("id");
    const project = await kv.get(`project:${id}`);
    
    if (!project) {
      return c.json({ success: false, error: "Project not found" }, 404);
    }
    
    // Fetch all bookings linked to this project
    const allExportBookings = await kv.getByPrefix("export_booking:");
    const allImportBookings = await kv.getByPrefix("import_booking:");
    const allForwardingBookings = await kv.getByPrefix("forwarding_booking:");
    const allTruckingBookings = await kv.getByPrefix("trucking_booking:");
    const allBrokerageBookings = await kv.getByPrefix("brokerage_booking:");
    const allOthersBookings = await kv.getByPrefix("others_booking:");
    
    const projectBookingIds = [
      ...allExportBookings.filter((b: any) => b.project_id === id || b.projectId === id).map((b: any) => b.bookingId),
      ...allImportBookings.filter((b: any) => b.project_id === id || b.projectId === id).map((b: any) => b.bookingId),
      ...allForwardingBookings.filter((b: any) => b.project_id === id || b.projectId === id).map((b: any) => b.bookingId),
      ...allTruckingBookings.filter((b: any) => b.project_id === id || b.projectId === id).map((b: any) => b.bookingId),
      ...allBrokerageBookings.filter((b: any) => b.project_id === id || b.projectId === id).map((b: any) => b.bookingId),
      ...allOthersBookings.filter((b: any) => b.project_id === id || b.projectId === id).map((b: any) => b.bookingId)
    ];
    
    // Fetch all expenses and vouchers
    const allExpenses = await kv.getByPrefix("expense:");
    const allVouchers = await kv.getByPrefix("voucher:");
    
    // Filter expenses that either:
    // 1. Belong to bookings in this project (via bookingIds array)
    // 2. Are directly linked to this project (via projectId field)
    const projectExpenses = allExpenses.filter((expense: any) => {
      // Check if expense is directly linked to this project
      if (expense.projectId === id || expense.project_id === id) {
        return true;
      }
      
      // Check if expense belongs to a booking in this project
      if (expense.bookingIds && Array.isArray(expense.bookingIds)) {
        return expense.bookingIds.some((bookingId: string) => 
          projectBookingIds.includes(bookingId)
        );
      }
      
      // Legacy: single bookingId field
      if (expense.bookingId || expense.booking_id) {
        return projectBookingIds.includes(expense.bookingId || expense.booking_id);
      }
      
      return false;
    });
    
    // Calculate amount from charges for each expense (if charges exist) AND add voucher info
    const expensesWithCalculatedAmounts = projectExpenses.map((expense: any) => {
      let calculatedAmount = 0;
      
      if (expense.charges && Array.isArray(expense.charges) && expense.charges.length > 0) {
        calculatedAmount = expense.charges.reduce((sum: number, charge: any) => 
          sum + (charge.amount || 0), 0
        );
      } else {
        // If no charges, keep existing amount or default to 0
        calculatedAmount = expense.amount || 0;
      }
      
      // Calculate vouchers for this expense
      const expenseVouchers = allVouchers.filter((v: any) => v.expenseId === expense.id);
      const totalVouchers = expenseVouchers.reduce((sum: number, v: any) => sum + (v.amount || 0), 0);
      const outstanding = calculatedAmount - totalVouchers;
      
      // Calculate payment status based on voucher coverage
      let paymentStatus = "Unpaid";
      if (totalVouchers > 0) {
        const coverage = calculatedAmount > 0 ? (totalVouchers / calculatedAmount) * 100 : 0;
        if (coverage >= 100) {
          paymentStatus = "Paid";
        } else {
          paymentStatus = "Partially Paid";
        }
      }
      
      return {
        ...expense,
        amount: calculatedAmount,
        totalVouchers,
        outstanding,
        pendingAmount: outstanding, // Add alias for frontend consistency
        paymentStatus // NEW: Calculated payment status based on vouchers
      };
    });
    
    // Sort by createdAt descending
    expensesWithCalculatedAmounts.sort((a: any, b: any) =>
      new Date(b.createdAt || b.created_at).getTime() - new Date(a.createdAt || a.created_at).getTime()
    );
    
    // Calculate totals for the project
    const totalExpenses = expensesWithCalculatedAmounts.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    const totalVouchers = expensesWithCalculatedAmounts.reduce((sum: number, e: any) => sum + (e.totalVouchers || 0), 0);
    const expensesOutstanding = totalExpenses - totalVouchers;
    
    console.log(`Fetched ${expensesWithCalculatedAmounts.length} expenses for project ${project.project_number} - Total: ₱${totalExpenses.toFixed(2)}, Vouchers: ₱${totalVouchers.toFixed(2)}, Outstanding: ₱${expensesOutstanding.toFixed(2)}`);
    
    return c.json({ 
      success: true, 
      data: expensesWithCalculatedAmounts,
      summary: {
        totalExpenses,
        totalVouchers,
        expensesOutstanding
      }
    });
  } catch (error) {
    console.error("Error fetching project expenses:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get project by project number (for Operations autofill)
app.get("/make-server-ce0d67b8/projects/by-number/:projectNumber", async (c) => {
  try {
    const projectNumber = c.req.param("projectNumber");
    
    // Get all projects and find by project_number
    const allProjects = await kv.getByPrefix("project:");
    const project = allProjects.find((p: any) => p.project_number === projectNumber);
    
    if (!project) {
      return c.json({ success: false, error: `Project ${projectNumber} not found` }, 404);
    }
    
    console.log(`Fetched project by number: ${projectNumber}`);
    
    return c.json({ success: true, data: project });
  } catch (error) {
    console.error("Error fetching project by number:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update project
app.patch("/make-server-ce0d67b8/projects/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    
    const project = await kv.get(`project:${id}`);
    
    if (!project) {
      return c.json({ success: false, error: "Project not found" }, 404);
    }
    
    // Merge updates
    const updated = {
      ...project,
      ...updates,
      id, // Preserve ID
      created_at: project.created_at, // Preserve created_at
      updated_at: new Date().toISOString()
    };
    
    await kv.set(`project:${id}`, updated);
    
    console.log(`Updated project: ${id}`);
    
    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating project:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Link booking to project (for bidirectional tracking)
app.post("/make-server-ce0d67b8/projects/:id/link-booking", async (c) => {
  try {
    const id = c.req.param("id");
    const { bookingId, bookingNumber, serviceType, status, createdBy } = await c.req.json();
    
    const project = await kv.get(`project:${id}`);
    
    if (!project) {
      return c.json({ success: false, error: "Project not found" }, 404);
    }
    
    // Add booking to linkedBookings array
    if (!project.linkedBookings) {
      project.linkedBookings = [];
    }
    
    // Check if already linked (by bookingId)
    const alreadyLinked = project.linkedBookings.some((b: any) => b.bookingId === bookingId);
    if (alreadyLinked) {
      return c.json({ success: true, data: project }); // Already linked, just return success
    }
    
    // VALIDATION: Check if a booking for this service type already exists
    const serviceTypeExists = project.linkedBookings.some((b: any) => b.serviceType === serviceType);
    if (serviceTypeExists) {
      const existingBooking = project.linkedBookings.find((b: any) => b.serviceType === serviceType);
      return c.json({ 
        success: false, 
        error: `A ${serviceType} booking (${existingBooking.bookingNumber}) already exists for this project. Only one booking per service type is allowed.`
      }, 400);
    }
    
    project.linkedBookings.push({
      bookingId,
      bookingNumber,
      serviceType,
      status,
      createdAt: new Date().toISOString(),
      createdBy
    });
    
    // Auto-calculate booking_status
    const totalServices = project.services?.length || 0;
    const bookedServices = new Set(project.linkedBookings.map((b: any) => b.serviceType)).size;
    
    if (bookedServices === 0) {
      project.booking_status = "No Bookings Yet";
    } else if (bookedServices >= totalServices) {
      project.booking_status = "Fully Booked";
    } else {
      project.booking_status = "Partially Booked";
    }
    
    project.updated_at = new Date().toISOString();
    await kv.set(`project:${id}`, project);
    
    console.log(`Linked booking ${bookingNumber} to project ${project.project_number} - Status: ${project.booking_status}`);
    
    return c.json({ success: true, data: project });
  } catch (error) {
    console.error("Error linking booking to project:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Unlink booking from project
app.post("/make-server-ce0d67b8/projects/:id/unlink-booking", async (c) => {
  try {
    const id = c.req.param("id");
    const { bookingId } = await c.req.json();
    
    const project = await kv.get(`project:${id}`);
    
    if (!project) {
      return c.json({ success: false, error: "Project not found" }, 404);
    }
    
    // Remove booking from linkedBookings array
    if (project.linkedBookings) {
      project.linkedBookings = project.linkedBookings.filter((b: any) => b.bookingId !== bookingId);
      
      // Recalculate booking_status
      const totalServices = project.services?.length || 0;
      const bookedServices = new Set(project.linkedBookings.map((b: any) => b.serviceType)).size;
      
      if (bookedServices === 0) {
        project.booking_status = "No Bookings Yet";
      } else if (bookedServices >= totalServices) {
        project.booking_status = "Fully Booked";
      } else {
        project.booking_status = "Partially Booked";
      }
      
      project.updated_at = new Date().toISOString();
      await kv.set(`project:${id}`, project);
      
      console.log(`Unlinked booking ${bookingId} from project ${project.project_number} - Status: ${project.booking_status}`);
    }
    
    return c.json({ success: true, data: project });
  } catch (error) {
    console.error("Error unlinking booking from project:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Generate invoice (billing) from project pricing
app.post("/make-server-ce0d67b8/projects/:id/generate-invoice", async (c) => {
  try {
    const projectId = c.req.param("id");
    const { bookingId, bookingType } = await c.req.json();
    
    const project = await kv.get(`project:${projectId}`);
    
    if (!project) {
      return c.json({ success: false, error: "Project not found" }, 404);
    }
    
    // Check if project has pricing data
    if (!project.charge_categories || project.charge_categories.length === 0) {
      return c.json({ success: false, error: "Project has no pricing data to generate invoice from" }, 400);
    }
    
    // Generate billing ID
    const billingId = `BILL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const timestamp = new Date().toISOString();
    
    // Convert project charge_categories to billing format
    const chargeCategories = project.charge_categories.map((cat: any) => ({
      categoryName: cat.category_name || cat.name,
      lineItems: (cat.line_items || []).map((item: any) => ({
        description: item.description || "",
        price: item.price || 0,
        quantity: item.quantity || 1,
        unit: item.unit || "",
        amount: item.amount || (item.price * item.quantity),
        remarks: item.remarks || ""
      })),
      subtotal: cat.subtotal || 0
    }));
    
    // Calculate total from charge categories
    const totalAmount = chargeCategories.reduce((sum: number, cat: any) => sum + cat.subtotal, 0);
    
    // Create new billing from project pricing
    const newBilling = {
      billingId,
      bookingId: bookingId || `PROJECT-${project.project_number}`,
      bookingType: bookingType || "forwarding",
      createdAt: timestamp,
      updatedAt: timestamp,
      
      // Source tracking - THIS IS THE KEY!
      source: "project" as const,
      projectNumber: project.project_number,
      quotationNumber: project.quotation_number,
      
      // Detailed structure from project
      chargeCategories,
      
      // Legacy fields for compatibility
      description: `Invoice for ${project.quotation_name || project.project_number}`,
      amount: totalAmount,
      currency: project.currency || "PHP",
      status: "Pending" as const,
      notes: `Auto-generated from project ${project.project_number}`
    };
    
    await kv.set(`billing:${billingId}`, newBilling);
    
    console.log(`✓ Generated invoice ${billingId} from project ${project.project_number} (${chargeCategories.length} categories, ${project.currency} ${totalAmount.toFixed(2)})`);
    
    return c.json({ success: true, data: newBilling });
  } catch (error) {
    console.error("Error generating invoice from project:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete project (only if no linked bookings)
app.delete("/make-server-ce0d67b8/projects/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    const project = await kv.get(`project:${id}`);
    
    if (!project) {
      return c.json({ success: false, error: "Project not found" }, 404);
    }
    
    // Only allow deletion if no linked bookings
    if (project.linkedBookings && project.linkedBookings.length > 0) {
      return c.json({ 
        success: false, 
        error: "Cannot delete project with linked bookings. Delete all bookings first." 
      }, 400);
    }
    
    // Delete project
    await kv.del(`project:${id}`);
    
    // Update quotation to remove project link
    if (project.quotation_id) {
      const quotation = await kv.get(`quotation:${project.quotation_id}`);
      if (quotation) {
        quotation.project_id = null;
        quotation.status = "Accepted by Client"; // Revert status
        delete quotation.converted_to_project_at;
        quotation.updated_at = new Date().toISOString();
        await kv.set(`quotation:${project.quotation_id}`, quotation);
      }
    }
    
    console.log(`Deleted project: ${id}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Backfill quotation_name for existing projects
app.post("/make-server-ce0d67b8/projects/backfill-names", async (c) => {
  try {
    const projects = await kv.getByPrefix("project:");
    let updated = 0;
    let skipped = 0;
    
    for (const project of projects) {
      // Skip if already has quotation_name
      if (project.quotation_name) {
        skipped++;
        continue;
      }
      
      // Try to get quotation and copy the name
      if (project.quotation_id) {
        const quotation = await kv.get(`quotation:${project.quotation_id}`);
        if (quotation && quotation.quotation_name) {
          project.quotation_name = quotation.quotation_name;
          project.updated_at = new Date().toISOString();
          await kv.set(`project:${project.id}`, project);
          updated++;
          console.log(`Backfilled quotation_name for project ${project.project_number}: "${quotation.quotation_name}"`);
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }
    }
    
    console.log(`Backfill complete: ${updated} projects updated, ${skipped} skipped`);
    
    return c.json({ 
      success: true, 
      data: { updated, skipped, total: projects.length }
    });
  } catch (error) {
    console.error("Error backfilling project names:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Migrate services_metadata from camelCase to snake_case for all projects and quotations
app.post("/make-server-ce0d67b8/migrate-services-metadata", async (c) => {
  try {
    // Helper function to migrate service details
    const migrateServiceDetails = (service: any) => {
      if (!service || !service.service_details) return service;
      
      const details = service.service_details;
      const serviceType = service.service_type;
      
      // Create new details object with snake_case fields
      let newDetails: any = {};
      
      if (serviceType === "Brokerage") {
        newDetails = {
          subtype: details.subtype || details.brokerageType,
          shipment_type: details.shipment_type || details.shipmentType,
          type_of_entry: details.type_of_entry || details.typeOfEntry,
          pod: details.pod,
          mode: details.mode,
          cargo_type: details.cargo_type || details.cargoType,
          commodity: details.commodity || details.commodityDescription,
          declared_value: details.declared_value || details.declaredValue,
          delivery_address: details.delivery_address || details.deliveryAddress,
          country_of_origin: details.country_of_origin || details.countryOfOrigin,
          preferential_treatment: details.preferential_treatment || details.preferentialTreatment,
          psic: details.psic,
          aeo: details.aeo
        };
        
        // Remove undefined values
        Object.keys(newDetails).forEach(key => {
          if (newDetails[key] === undefined) delete newDetails[key];
        });
      } else if (serviceType === "Forwarding") {
        // Handle compound fields
        let aol = details.aol;
        let pol = details.pol;
        let aod = details.aod;
        let pod = details.pod;
        
        if (details.aolPol && !aol && !pol) {
          const parts = details.aolPol.split('→').map((s: string) => s.trim());
          aol = parts[0];
          pol = parts[1];
        }
        if (details.aodPod && !aod && !pod) {
          const parts = details.aodPod.split('→').map((s: string) => s.trim());
          aod = parts[0];
          pod = parts[1];
        }
        
        newDetails = {
          incoterms: details.incoterms,
          cargo_type: details.cargo_type || details.cargoType,
          commodity: details.commodity || details.commodityDescription,
          delivery_address: details.delivery_address || details.deliveryAddress,
          mode: details.mode,
          aol: aol,
          pol: pol,
          aod: aod,
          pod: pod
        };
        
        // Remove undefined values
        Object.keys(newDetails).forEach(key => {
          if (newDetails[key] === undefined) delete newDetails[key];
        });
      } else if (serviceType === "Trucking") {
        newDetails = {
          pull_out: details.pull_out || details.pullOut,
          delivery_address: details.delivery_address || details.deliveryAddress,
          truck_type: details.truck_type || details.truckType,
          delivery_instructions: details.delivery_instructions || details.deliveryInstructions
        };
        
        // Remove undefined values
        Object.keys(newDetails).forEach(key => {
          if (newDetails[key] === undefined) delete newDetails[key];
        });
      } else if (serviceType === "Marine Insurance") {
        // Handle compound fields
        let aol = details.aol;
        let pol = details.pol;
        let aod = details.aod;
        let pod = details.pod;
        
        if (details.aolPol && !aol && !pol) {
          const parts = details.aolPol.split('→').map((s: string) => s.trim());
          aol = parts[0];
          pol = parts[1];
        }
        if (details.aodPod && !aod && !pod) {
          const parts = details.aodPod.split('→').map((s: string) => s.trim());
          aod = parts[0];
          pod = parts[1];
        }
        
        newDetails = {
          commodity_description: details.commodity_description || details.commodityDescription,
          hs_code: details.hs_code || details.hsCode,
          aol: aol,
          pol: pol,
          aod: aod,
          pod: pod,
          invoice_value: details.invoice_value || details.invoiceValue
        };
        
        // Remove undefined values
        Object.keys(newDetails).forEach(key => {
          if (newDetails[key] === undefined) delete newDetails[key];
        });
      } else if (serviceType === "Others") {
        newDetails = {
          service_description: details.service_description || details.serviceDescription
        };
        
        // Remove undefined values
        Object.keys(newDetails).forEach(key => {
          if (newDetails[key] === undefined) delete newDetails[key];
        });
      } else {
        // Unknown service type, keep as is
        newDetails = details;
      }
      
      return {
        ...service,
        service_details: newDetails
      };
    };
    
    // Migrate all projects
    const projects = await kv.getByPrefix("project:");
    let projectsUpdated = 0;
    let projectsSkipped = 0;
    
    for (const project of projects) {
      if (project.services_metadata && Array.isArray(project.services_metadata)) {
        const migratedMetadata = project.services_metadata.map(migrateServiceDetails);
        project.services_metadata = migratedMetadata;
        project.updated_at = new Date().toISOString();
        await kv.set(`project:${project.id}`, project);
        projectsUpdated++;
        console.log(`✓ Migrated services_metadata for project ${project.project_number}`);
      } else {
        projectsSkipped++;
      }
    }
    
    // Migrate all quotations
    const quotations = await kv.getByPrefix("quotation:");
    let quotationsUpdated = 0;
    let quotationsSkipped = 0;
    
    for (const quotation of quotations) {
      if (quotation.services_metadata && Array.isArray(quotation.services_metadata)) {
        const migratedMetadata = quotation.services_metadata.map(migrateServiceDetails);
        quotation.services_metadata = migratedMetadata;
        quotation.updated_at = new Date().toISOString();
        await kv.set(`quotation:${quotation.id}`, quotation);
        quotationsUpdated++;
        console.log(`✓ Migrated services_metadata for quotation ${quotation.quote_number}`);
      } else {
        quotationsSkipped++;
      }
    }
    
    console.log(`Migration complete!`);
    console.log(`  Projects: ${projectsUpdated} updated, ${projectsSkipped} skipped`);
    console.log(`  Quotations: ${quotationsUpdated} updated, ${quotationsSkipped} skipped`);
    
    return c.json({ 
      success: true, 
      data: { 
        projects: { updated: projectsUpdated, skipped: projectsSkipped, total: projects.length },
        quotations: { updated: quotationsUpdated, skipped: quotationsSkipped, total: quotations.length }
      }
    });
  } catch (error) {
    console.error("Error migrating services_metadata:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== BOOKINGS API ====================

// Create a new booking
app.post("/make-server-ce0d67b8/bookings", async (c) => {
  try {
    const booking = await c.req.json();
    
    // Generate unique ID if not provided
    if (!booking.id) {
      // Check for specific booking types (Import/Export) for custom ID format
      const type = booking.booking_type || booking.shipmentType;
      
      if (type === "Import" || type === "Export") {
        const prefix = type === "Import" ? "IMP" : "EXP";
        const year = new Date().getFullYear();
        const counterKey = `booking_counter:${type}:${year}`;
        
        // Get current counter for this type and year
        let counter = await kv.get(counterKey);
        if (!counter) {
          counter = { value: 0 };
        }
        
        // Increment and save
        counter.value += 1;
        await kv.set(counterKey, counter);
        
        // Format: IMP-2025-001
        const sequence = String(counter.value).padStart(3, '0');
        booking.id = `${prefix}-${year}-${sequence}`;
      } else {
        // Fallback for other types
        booking.id = `BKG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
    }
    
    // Set timestamps
    booking.created_at = booking.created_at || new Date().toISOString();
    booking.updated_at = new Date().toISOString();
    
    // Set default status if not provided
    if (!booking.status) {
      booking.status = "Draft";
    }
    
    // Save to KV store with key: booking:{id}
    await kv.set(`booking:${booking.id}`, booking);
    
    console.log(`Created booking: ${booking.id} with status: ${booking.status}`);
    
    return c.json({ success: true, data: booking });
  } catch (error) {
    console.error("Error creating booking:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get all bookings (with optional filters)
app.get("/make-server-ce0d67b8/bookings", async (c) => {
  try {
    const status = c.req.query("status");
    const search = c.req.query("search");
    const customer_id = c.req.query("customer_id");
    const created_by = c.req.query("created_by");
    const date_from = c.req.query("date_from");
    const date_to = c.req.query("date_to");
    const sort_by = c.req.query("sort_by") || "updated_at";
    const sort_order = c.req.query("sort_order") || "desc";
    const limit = c.req.query("limit") ? parseInt(c.req.query("limit")!) : undefined;
    const offset = c.req.query("offset") ? parseInt(c.req.query("offset")!) : 0;
    const ids = c.req.query("ids"); // NEW: Support for fetching specific bookings by IDs
    
    // Get all bookings from ALL prefixes (new workflow - comprehensive)
    const bookings = await kv.getByPrefix("booking:");
    const exportBookingsRaw = await kv.getByPrefix("export_booking:");
    const importBookingsRaw = await kv.getByPrefix("import_booking:");
    const exportBookings = await Promise.all(
      exportBookingsRaw.map((booking: any) =>
        migrateExportBookingIfNeeded(booking, booking.bookingId || booking.id),
      ),
    );
    const importBookings = await Promise.all(
      importBookingsRaw.map((booking: any) =>
        migrateImportBookingIfNeeded(booking, booking.bookingId || booking.id),
      ),
    );
    const forwardingBookings = await kv.getByPrefix("forwarding_booking:");
    const truckingBookings = await kv.getByPrefix("trucking_booking:");
    const brokerageBookings = await kv.getByPrefix("brokerage_booking:");
    const marineInsuranceBookings = await kv.getByPrefix("marine_insurance_booking:");
    const othersBookings = await kv.getByPrefix("others_booking:");
    
    // Combine all bookings and add booking_type field
    const allBookings = [
      ...bookings, // New generic bookings
      ...exportBookings.map((b: any) => ({ ...b, booking_type: 'Export' })),
      ...importBookings.map((b: any) => ({ ...b, booking_type: 'Import' })),
      ...forwardingBookings.map((b: any) => ({ ...b, booking_type: 'Forwarding' })),
      ...truckingBookings.map((b: any) => ({ ...b, booking_type: 'Trucking' })),
      ...brokerageBookings.map((b: any) => ({ ...b, booking_type: 'Brokerage' })),
      ...marineInsuranceBookings.map((b: any) => ({ ...b, booking_type: 'Marine Insurance' })),
      ...othersBookings.map((b: any) => ({ ...b, booking_type: 'Others' }))
    ];
    
    // Filter out incomplete/invalid bookings (must have booking_number or bookingId or id)
    let filtered = allBookings.filter((b: any) => b.booking_number || b.bookingId || b.bookingNumber || b.id);
    
    // NEW: If ids parameter is provided, filter to only those IDs
    if (ids) {
      const idArray = ids.split(',').map((id: string) => id.trim());
      filtered = filtered.filter((b: any) => 
        idArray.includes(b.id) || 
        idArray.includes(b.bookingId) || 
        idArray.includes(b.booking_number) ||
        idArray.includes(b.bookingNumber)
      );
      console.log(`Filtering bookings by IDs: ${idArray.join(', ')} - Found ${filtered.length} matches`);
    }
    
    // Filter by customer_id if provided
    if (customer_id) {
      filtered = filtered.filter((b: any) => b.customer_id === customer_id);
    }
    
    // Filter by created_by if provided
    if (created_by) {
      filtered = filtered.filter((b: any) => b.created_by === created_by);
    }
    
    // Filter by date range
    if (date_from) {
      const fromDate = new Date(date_from);
      filtered = filtered.filter((b: any) => 
        new Date(b.created_at) >= fromDate
      );
    }
    
    if (date_to) {
      const toDate = new Date(date_to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((b: any) => 
        new Date(b.created_at) <= toDate
      );
    }
    
    // Filter by search query (searches tracking_number, booking_name, and booking_number)
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((b: any) => 
        b.tracking_number?.toLowerCase().includes(searchLower) ||
        b.booking_name?.toLowerCase().includes(searchLower) ||
        b.booking_number?.toLowerCase().includes(searchLower) ||
        b.id?.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by status if provided
    if (status) {
      filtered = filtered.filter((b: any) => b.status === status);
    }
    
    const total = filtered.length;
    
    // Sort
    filtered.sort((a: any, b: any) => {
      let aVal, bVal;
      switch (sort_by) {
        case "created_at":
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case "updated_at":
        default:
          aVal = new Date(a.updated_at || a.created_at).getTime();
          bVal = new Date(b.updated_at || b.created_at).getTime();
          break;
      }
      return sort_order === "asc" 
        ? (aVal > bVal ? 1 : aVal < bVal ? -1 : 0)
        : (aVal < bVal ? 1 : aVal > bVal ? -1 : 0);
    });
    
    const paginated = limit ? filtered.slice(offset, offset + limit) : filtered;
    
    console.log(`Fetched ${paginated.length}/${total} bookings (offset: ${offset}, limit: ${limit || 'all'})`);
    
    return c.json({ 
      success: true, 
      data: paginated,
      pagination: {
        total,
        offset,
        limit: limit || total,
        hasMore: limit ? (offset + limit) < total : false
      }
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get single booking by ID
app.get("/make-server-ce0d67b8/bookings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    // Try all booking prefixes to find the booking
    const prefixes = [
      "booking:",
      "export_booking:",
      "import_booking:",
      "brokerage_booking:",
      "forwarding_booking:",
      "trucking_booking:",
      "marine_insurance_booking:",
      "others_booking:"
    ];
    
    for (const prefix of prefixes) {
      const booking = await kv.get(`${prefix}${id}`);
      if (booking) {
        let normalized = booking;
        if (prefix === "import_booking:") {
          normalized = await migrateImportBookingIfNeeded(booking, id);
        } else if (prefix === "export_booking:") {
          normalized = await migrateExportBookingIfNeeded(booking, id);
        }
        console.log(`Fetched booking from ${prefix}${id}`);
        return c.json({ success: true, data: normalized });
      }
    }
    
    // If not found in any prefix, return 404
    console.log(`Booking not found with id: ${id}`);
    return c.json({ success: false, error: "Booking not found" }, 404);
  } catch (error) {
    console.error("Error fetching booking:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update booking
app.patch("/make-server-ce0d67b8/bookings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    
    // Get existing booking
    const existing = await kv.get(`booking:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Booking not found" }, 404);
    }
    
    // Merge updates
    const updated = {
      ...existing,
      ...updates,
      id, // Preserve ID
      created_at: existing.created_at, // Preserve created_at
      updated_at: new Date().toISOString()
    };
    
    // Save back
    await kv.set(`booking:${id}`, updated);
    
    console.log(`Updated booking: ${id}`);
    
    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating booking:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete booking
app.delete("/make-server-ce0d67b8/bookings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    await kv.del(`booking:${id}`);
    
    console.log(`Deleted booking: ${id}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting booking:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== TRUCKING RECORDS API ====================

/** Normalize legacy trucking records that use containers[] array to flat fields */
function normalizeTruckingRecord(record: any): any {
  if (!record) return record;
  if (!record.containerNo && Array.isArray(record.containers) && record.containers.length > 0) {
    return {
      ...record,
      containerNo: record.containers[0].containerNo || record.containers[0].container_no || "",
      containerSize: record.containers[0].size || record.containers[0].containerSize || "",
    };
  }
  return record;
}

// Create trucking record
app.post("/make-server-ce0d67b8/trucking-records", async (c) => {
  try {
    const body = await c.req.json();
    if (!body.id) {
      body.id = `TRK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Generate truckingRefNo using lowest-gap sequence — TRK {year}-{number}
    if (!body.truckingRefNo) {
      const trkYear = new Date().getFullYear();
      const trkPrefix = `TRK ${trkYear}-`;
      const allTrucking = await kv.getByPrefix("trucking-record:");
      const usedNumbers = new Set(allTrucking.map((r: any) => {
        const ref = r.truckingRefNo || "";
        if (!ref.startsWith(trkPrefix)) return null;
        const n = parseInt(ref.slice(trkPrefix.length), 10);
        return isNaN(n) ? null : n;
      }).filter((n: any) => n !== null));
      let next = 1;
      while (usedNumbers.has(next)) next++;
      body.truckingRefNo = `${trkPrefix}${next}`;
    }

    // Uniqueness check
    const allTrucking2 = await kv.getByPrefix("trucking-record:");
    const duplicate = allTrucking2.find((r: any) => r.truckingRefNo === body.truckingRefNo && r.id !== body.id);
    if (duplicate) {
      return c.json({ success: false, error: `Reference number ${body.truckingRefNo} is already in use by another active record.` }, 409);
    }

    body.createdAt = body.createdAt || new Date().toISOString();
    body.updatedAt = new Date().toISOString();
    await kv.set(`trucking-record:${body.id}`, body);
    console.log(`Created trucking record: ${body.id}`);
    return c.json({ success: true, data: body });
  } catch (error) {
    console.error("Error creating trucking record:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get all trucking records (with optional linkedBookingId filter)
app.get("/make-server-ce0d67b8/trucking-records", async (c) => {
  try {
    const linkedBookingId = c.req.query("linkedBookingId");
    const segmentId = c.req.query("segmentId");
    let records = await kv.getByPrefix("trucking-record:");
    records = records.map(normalizeTruckingRecord);
    if (linkedBookingId) {
      records = records.filter((r: any) => r.linkedBookingId === linkedBookingId);
    }
    if (segmentId) {
      records = records.filter((r: any) => r.linkedSegmentId === segmentId);
    }
    const shouldEnrich = Boolean(linkedBookingId);
    if (shouldEnrich) {
      records = await Promise.all(records.map((record: any) => enrichTruckingRecordWithLinkedTags(record)));
    }
    records.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    console.log(`Fetched ${records.length} trucking records`);
    return c.json({ success: true, data: records });
  } catch (error) {
    console.error("Error fetching trucking records:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get single trucking record
app.get("/make-server-ce0d67b8/trucking-records/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const rawRecord = await kv.get(`trucking-record:${id}`);
    if (!rawRecord) return c.json({ success: false, error: "Not found" }, 404);
    const record = normalizeTruckingRecord(rawRecord);
    const enriched = await enrichTruckingRecordWithLinkedTags(record);
    return c.json({ success: true, data: enriched });
  } catch (error) {
    console.error("Error fetching trucking record:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update trucking record
app.put("/make-server-ce0d67b8/trucking-records/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const existing = await kv.get(`trucking-record:${id}`);
    if (!existing) return c.json({ success: false, error: "Not found" }, 404);

    // If truckingRefNo is being changed, validate uniqueness
    if (updates.truckingRefNo && updates.truckingRefNo !== existing.truckingRefNo) {
      const allTrucking = await kv.getByPrefix("trucking-record:");
      const duplicate = allTrucking.find((r: any) => r.truckingRefNo === updates.truckingRefNo && r.id !== id);
      if (duplicate) {
        return c.json({ success: false, error: `Reference number ${updates.truckingRefNo} is already in use by another active record.` }, 409);
      }
    }

    const updated = { ...existing, ...updates, id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
    await kv.set(`trucking-record:${id}`, updated);
    console.log(`Updated trucking record: ${id}`);
    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating trucking record:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.put("/make-server-ce0d67b8/trucking-records/:id/update-booking-tags", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const newTags = dedupeTags(Array.isArray(body.shipmentTags) ? body.shipmentTags : []);
    const user = String(body.user || "Unknown");

    const record = await kv.get(`trucking-record:${id}`);
    if (!record) {
      return c.json({ success: false, error: "Trucking record not found" }, 404);
    }

    if (!record.linkedBookingId) {
      return c.json({ success: false, error: "No linked booking" }, 400);
    }

    const prefix = getLinkedBookingPrefix(record.linkedBookingType);
    if (!prefix) {
      return c.json({ success: false, error: "Linked booking type is unsupported" }, 400);
    }

    const linkedBooking = await kv.get(`${prefix}${record.linkedBookingId}`);
    if (!linkedBooking) {
      return c.json({ success: false, error: "Linked booking not found" }, 404);
    }

    const migratedBooking =
      prefix === "import_booking:"
        ? await migrateImportBookingIfNeeded(linkedBooking, record.linkedBookingId)
        : await migrateExportBookingIfNeeded(linkedBooking, record.linkedBookingId);

    const previousTags = dedupeTags(migratedBooking.shipmentTags || []);
    const historyEntries = createTagHistoryEntries(previousTags, newTags, user, "shipment");
    const updatedBooking = {
      ...migratedBooking,
      shipmentTags: newTags,
      tagHistory: [...(migratedBooking.tagHistory || []), ...historyEntries],
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`${prefix}${record.linkedBookingId}`, updatedBooking);

    return c.json({
      success: true,
      data: {
        shipmentTags: updatedBooking.shipmentTags || [],
        tagHistory: updatedBooking.tagHistory || [],
      },
    });
  } catch (error) {
    console.error("Error updating linked booking shipment tags:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete trucking record
app.delete("/make-server-ce0d67b8/trucking-records/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`trucking-record:${id}`);
    console.log(`Deleted trucking record: ${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting trucking record:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== EXPENSES API ====================

// Create a new expense
app.post("/make-server-ce0d67b8/expenses", async (c) => {
  try {
    const expense = await c.req.json();
    
    // Generate unique ID if not provided
    if (!expense.id) {
      expense.id = `EXP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Set timestamps
    expense.created_at = expense.created_at || new Date().toISOString();
    expense.updated_at = new Date().toISOString();
    
    // Set default status if not provided
    if (!expense.status) {
      expense.status = "Pending";
    }
    
    // Save to KV store with key: expense:{id}
    await kv.set(`expense:${expense.id}`, expense);
    
    console.log(`Created expense: ${expense.id} with status: ${expense.status}`);
    
    return c.json({ success: true, data: expense });
  } catch (error) {
    console.error("Error creating expense:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get all expenses (with optional filters)
app.get("/make-server-ce0d67b8/expenses", async (c) => {
  try {
    const status = c.req.query("status");
    const search = c.req.query("search");
    const booking_id = c.req.query("booking_id");
    const bookingId = c.req.query("bookingId"); // Add support for bookingId parameter
    const bookingNumber = c.req.query("bookingNumber");
    const projectId = c.req.query("projectId"); // Add support for projectId parameter
    const created_by = c.req.query("created_by");
    const date_from = c.req.query("date_from");
    const date_to = c.req.query("date_to");
    const sort_by = c.req.query("sort_by") || "updated_at";
    const sort_order = c.req.query("sort_order") || "desc";
    const limit = c.req.query("limit") ? parseInt(c.req.query("limit")!) : undefined;
    const offset = c.req.query("offset") ? parseInt(c.req.query("offset")!) : 0;
    const ids = c.req.query("ids"); // NEW: Support for fetching specific expenses by IDs
    const segmentId = c.req.query("segmentId");

    // Get all expenses with prefix
    const expenses = await kv.getByPrefix("expense:");
    
    let filtered = expenses;
    
    // NEW: If ids parameter is provided, filter to only those IDs
    if (ids) {
      const idArray = ids.split(',').map((id: string) => id.trim());
      filtered = filtered.filter((e: any) => 
        idArray.includes(e.id) || 
        idArray.includes(e.expenseId) || 
        idArray.includes(e.expenseNumber)
      );
      console.log(`Filtering expenses by IDs: ${idArray.join(', ')} - Found ${filtered.length} matches`);
    }
    
    // Filter by booking_id if provided
    if (booking_id) {
      filtered = filtered.filter((e: any) => e.booking_id === booking_id);
    }
    
    // Filter by bookingId if provided (handles both array and single value)
    if (bookingId) {
      filtered = filtered.filter((e: any) => {
        if (e.bookingIds && Array.isArray(e.bookingIds)) {
          return e.bookingIds.includes(bookingId);
        }
        return e.bookingId === bookingId;
      });
    }

    // Filter by segmentId if provided
    if (segmentId) {
      filtered = filtered.filter((e: any) => e.segmentId === segmentId);
    }

    // Filter by bookingNumber if provided
    if (bookingNumber) {
      filtered = filtered.filter((e: any) => 
        e.bookingIds && Array.isArray(e.bookingIds)
          ? e.bookingIds.includes(bookingNumber)
          : e.bookingId === bookingNumber || e.booking_number === bookingNumber
      );
    }
    
    // Cache for booking data to avoid duplicate fetches later in enrichment
    let cachedAllBookings: any[] | null = null;
    
    // Filter by projectId if provided (get all expenses for bookings in the project)
    if (projectId) {
      // First, get all bookings for this project (all booking types) - fetch in parallel
      const [
        allExportBookings,
        allImportBookings,
        allForwardingBookings,
        allTruckingBookings,
        allBrokerageBookings,
        allOthersBookings
      ] = await Promise.all([
        kv.getByPrefix("export_booking:"),
        kv.getByPrefix("import_booking:"),
        kv.getByPrefix("forwarding_booking:"),
        kv.getByPrefix("trucking_booking:"),
        kv.getByPrefix("brokerage_booking:"),
        kv.getByPrefix("others_booking:")
      ]);
      
      // Cache for reuse in enrichment later
      cachedAllBookings = [
        ...allExportBookings, 
        ...allImportBookings, 
        ...allForwardingBookings, 
        ...allTruckingBookings, 
        ...allBrokerageBookings, 
        ...allOthersBookings
      ];
      
      const projectBookingIds = cachedAllBookings
        .filter((b: any) => b.project_id === projectId || b.projectId === projectId)
        .map((b: any) => b.bookingId || b.id);
      
      console.log(`Filtering expenses for project ${projectId} - Found ${projectBookingIds.length} bookings in project`);
      
      // Filter expenses that are linked to this project (either directly or via bookings)
      filtered = filtered.filter((expense: any) => {
        // Direct project link
        if (expense.projectId === projectId || expense.project_id === projectId) {
          console.log(`Expense ${expense.id} matched via direct projectId`);
          return true;
        }
        // Via bookingIds array (new format)
        if (expense.bookingIds && Array.isArray(expense.bookingIds)) {
          const matched = expense.bookingIds.some((bookingId: string) => projectBookingIds.includes(bookingId));
          if (matched) console.log(`Expense ${expense.id} matched via bookingIds array`);
          return matched;
        }
        // Via linkedBookingIds array (expenses created from project context)
        if (expense.linkedBookingIds && Array.isArray(expense.linkedBookingIds)) {
          const matched = expense.linkedBookingIds.some((bookingId: string) => projectBookingIds.includes(bookingId));
          if (matched) console.log(`Expense ${expense.id} matched via linkedBookingIds array`);
          return matched;
        }
        // Legacy single bookingId
        if (expense.bookingId || expense.booking_id) {
          const matched = projectBookingIds.includes(expense.bookingId || expense.booking_id);
          if (matched) console.log(`Expense ${expense.id} matched via single bookingId`);
          return matched;
        }
        return false;
      });
      
      console.log(`After projectId filter: ${filtered.length} expenses found`);
    }
    
    // Filter by created_by if provided
    if (created_by) {
      filtered = filtered.filter((e: any) => e.created_by === created_by);
    }
    
    // Filter by date range
    if (date_from) {
      const fromDate = new Date(date_from);
      filtered = filtered.filter((e: any) => 
        new Date(e.created_at) >= fromDate
      );
    }
    
    if (date_to) {
      const toDate = new Date(date_to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((e: any) => 
        new Date(e.created_at) <= toDate
      );
    }
    
    // Filter by search query (searches expense_name and id)
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((e: any) => 
        e.expense_name?.toLowerCase().includes(searchLower) ||
        e.id?.toLowerCase().includes(searchLower) ||
        e.category?.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by status if provided
    if (status) {
      filtered = filtered.filter((e: any) => e.status === status);
    }
    
    const total = filtered.length;
    
    // Sort
    filtered.sort((a: any, b: any) => {
      let aVal, bVal;
      switch (sort_by) {
        case "created_at":
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case "updated_at":
        default:
          aVal = new Date(a.updated_at).getTime();
          bVal = new Date(b.updated_at).getTime();
          break;
      }
      return sort_order === "asc" 
        ? (aVal > bVal ? 1 : aVal < bVal ? -1 : 0)
        : (aVal < bVal ? 1 : aVal > bVal ? -1 : 0);
    });
    
    // Calculate amount from charges for each expense (if charges exist)
    const expensesWithCalculatedAmounts = filtered.map((expense: any) => {
      if (expense.charges && Array.isArray(expense.charges) && expense.charges.length > 0) {
        const calculatedAmount = expense.charges.reduce((sum: number, charge: any) => 
          sum + (charge.amount || 0), 0
        );
        console.log(`Expense ${expense.id || expense.expenseId}: calculated amount from ${expense.charges.length} charges = ${calculatedAmount}`);
        return {
          ...expense,
          amount: calculatedAmount
        };
      }
      // If no charges, keep existing amount or default to 0
      console.log(`Expense ${expense.id || expense.expenseId}: no charges array, using stored amount = ${expense.amount || 0}`);
      return {
        ...expense,
        amount: expense.amount || 0
      };
    });
    
    // Fetch vouchers, clients, and bookings for enrichment — all in parallel
    // Reuse cachedAllBookings if already fetched for projectId filter
    let allVouchers: any[] = [];
    let allClients: any[] = [];
    let allBookings: any[] = [];
    
    try {
      if (cachedAllBookings) {
        // Reuse booking data from projectId filter — only fetch vouchers and clients
        const [voucherResults, clientResults] = await Promise.all([
          kv.getByPrefix("voucher:"),
          kv.getByPrefix("client:")
        ]);
        allVouchers = voucherResults;
        allClients = clientResults;
        allBookings = cachedAllBookings;
      } else {
        // Fetch everything in one parallel batch
        const [
          voucherResults,
          clientResults,
          exportBookings,
          importBookings,
          forwardingBookings,
          truckingBookings,
          brokerageBookings,
          othersBookings
        ] = await Promise.all([
          kv.getByPrefix("voucher:"),
          kv.getByPrefix("client:"),
          kv.getByPrefix("export_booking:"),
          kv.getByPrefix("import_booking:"),
          kv.getByPrefix("forwarding_booking:"),
          kv.getByPrefix("trucking_booking:"),
          kv.getByPrefix("brokerage_booking:"),
          kv.getByPrefix("others_booking:")
        ]);
        allVouchers = voucherResults;
        allClients = clientResults;
        allBookings = [
          ...exportBookings, 
          ...importBookings, 
          ...forwardingBookings, 
          ...truckingBookings, 
          ...brokerageBookings, 
          ...othersBookings
        ];
      }
    } catch (enrichErr) {
      console.error("Error fetching enrichment data (vouchers/clients/bookings):", enrichErr);
      // Continue with empty arrays — expenses will still be returned without enrichment
    }
    
    // Create a lookup map for bookings
    const bookingMap = new Map();
    allBookings.forEach((b: any) => {
      const id = b.id || b.bookingId;
      if (id) bookingMap.set(id, b);
    });
    
    // Create a lookup map for clients
    const clientMap = new Map();
    allClients.forEach((c: any) => {
      if (c.id) clientMap.set(c.id, c);
    });
    
    // Enrich expenses with voucher data AND client data
    const expensesWithVouchers = expensesWithCalculatedAmounts.map((expense: any) => {
      // Find vouchers for this expense
      const expenseVouchers = allVouchers.filter((v: any) => v.expenseId === expense.id);
      // Only count PAID vouchers
      const totalVouchers = expenseVouchers
        .filter((v: any) => v.status === "Paid")
        .reduce((sum: number, v: any) => sum + (v.amount || 0), 0);
      const outstanding = expense.amount - totalVouchers;
      
      // Calculate payment status based on voucher coverage
      let paymentStatus = "Unpaid";
      if (totalVouchers > 0) {
        const coverage = expense.amount > 0 ? (totalVouchers / expense.amount) * 100 : 0;
        if (coverage >= 100) {
          paymentStatus = "Paid";
        } else {
          paymentStatus = "Partially Paid";
        }
      }

      // Determine client name
      let clientName = "";
      
      // Try to find client via booking
      let bookingIds: string[] = [];
      if (expense.bookingIds && Array.isArray(expense.bookingIds)) {
        bookingIds = expense.bookingIds;
      } else if (expense.bookingId) {
        bookingIds = [expense.bookingId];
      } else if (expense.linkedBookingIds && Array.isArray(expense.linkedBookingIds)) {
        bookingIds = expense.linkedBookingIds;
      }
      
      for (const bId of bookingIds) {
        const booking = bookingMap.get(bId);
        if (booking) {
          const clientId = booking.customer_id || booking.client_id;
          if (clientId) {
            const client = clientMap.get(clientId);
            if (client) {
              clientName = client.company_name || client.name;
              break; // Found a client, stop looking
            }
          } else {
             // Fallback to booking fields if no client ID
             clientName = booking.companyName || booking.company_name || booking.clientName || booking.client_name || booking.customerName || booking.customer_name || booking.shipper || "";
             if (clientName) break;
          }
        }
      }
      
      // Fallback: check if expense has clientShipper (export specific)
      if (!clientName && expense.clientShipper) {
        clientName = expense.clientShipper;
      }
      
      return {
        ...expense,
        totalVouchers,
        outstanding,
        pendingAmount: outstanding, // Add alias for frontend consistency
        paymentStatus,
        clientName: clientName || "—"
      };
    });
    
    // Calculate summary totals
    const totalExpenses = expensesWithVouchers.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    const totalVouchers = expensesWithVouchers.reduce((sum: number, e: any) => sum + (e.totalVouchers || 0), 0);
    const expensesOutstanding = totalExpenses - totalVouchers;
    
    const paginated = limit ? expensesWithVouchers.slice(offset, offset + limit) : expensesWithVouchers;
    
    console.log(`Fetched ${paginated.length}/${total} expenses (status: ${status}, search: ${search}, bookingId: ${bookingId}) - Total: ₱${totalExpenses.toFixed(2)}, Vouchers: ₱${totalVouchers.toFixed(2)}, Outstanding: ₱${expensesOutstanding.toFixed(2)}`);
    
    return c.json({ 
      success: true, 
      data: paginated,
      summary: {
        totalExpenses,
        totalVouchers,
        expensesOutstanding
      },
      pagination: {
        total,
        offset,
        limit: limit || total,
        hasMore: limit ? (offset + limit) < total : false
      }
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get single expense by ID
app.get("/make-server-ce0d67b8/expenses/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const expense = await kv.get(`expense:${id}`);
    
    if (!expense) {
      return c.json({ success: false, error: "Expense not found" }, 404);
    }
    
    // Fetch all vouchers for this expense
    const allVouchers = await kv.getByPrefix("voucher:");
    const expenseVouchers = allVouchers.filter((v: any) => v.expenseId === id);
    
    // Calculate total vouchers and pending amount
    // Only count PAID vouchers
    const totalVouchers = expenseVouchers
      .filter((v: any) => v.status === "Paid")
      .reduce((sum: number, v: any) => sum + (v.amount || 0), 0);
    const expenseAmount = expense.amount || 0;
    const outstanding = expenseAmount - totalVouchers;
    
    // Calculate payment status based on voucher coverage
    let paymentStatus = "Unpaid";
    if (totalVouchers > 0) {
      const coverage = expenseAmount > 0 ? (totalVouchers / expenseAmount) * 100 : 0;
      if (coverage >= 100) {
        paymentStatus = "Paid";
      } else {
        paymentStatus = "Partially Paid";
      }
    }
    
    // Enrich charges with voucher information
    let enrichedExpense = { 
      ...expense,
      totalVouchers,
      outstanding,
      pendingAmount: outstanding,
      paymentStatus
    };
    
    if (expense.charges && Array.isArray(expense.charges) && expense.charges.length > 0) {
      enrichedExpense.charges = expense.charges.map((charge: any, index: number) => {
        // Generate consistent charge ID (same logic as frontend and voucher creation)
        const chargeId = charge.id || `charge-${id}-${index}`;
        
        // Find vouchers that include this charge
        const matchingVouchers = expenseVouchers.filter((voucher: any) => 
          voucher.lineItemIds && Array.isArray(voucher.lineItemIds) && voucher.lineItemIds.includes(chargeId)
        );
        
        // If charge is paid via voucher(s), add voucher info
        if (matchingVouchers.length > 0) {
          // For now, show first voucher (can be enhanced to show multiple)
          const firstVoucher = matchingVouchers[0];
          return {
            ...charge,
            id: chargeId, // Ensure ID is set
            voucherNumber: firstVoucher.voucherNumber,
            voucherId: firstVoucher.id
          };
        }
        
        // No voucher for this charge
        return {
          ...charge,
          id: chargeId, // Ensure ID is set
          voucherNumber: null,
          voucherId: null
        };
      });
    }
    
    console.log(`Fetched expense: ${id} with ${expenseVouchers.length} vouchers`);
    
    return c.json({ success: true, data: enrichedExpense });
  } catch (error) {
    console.error("Error fetching expense:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update expense
app.patch("/make-server-ce0d67b8/expenses/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    
    // Get existing expense
    const existing = await kv.get(`expense:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Expense not found" }, 404);
    }
    
    // Merge updates
    const updated = {
      ...existing,
      ...updates,
      id, // Preserve ID
      created_at: existing.created_at, // Preserve created_at
      updated_at: new Date().toISOString()
    };
    
    // Save back
    await kv.set(`expense:${id}`, updated);
    
    console.log(`Updated expense: ${id}`);
    
    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating expense:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete expense
app.delete("/make-server-ce0d67b8/expenses/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    await kv.del(`expense:${id}`);
    
    console.log(`Deleted expense: ${id}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== VOUCHER ROUTES ====================

// Get all vouchers
app.get("/make-server-ce0d67b8/vouchers", async (c) => {
  try {
    const allVouchers = await kv.getByPrefix("voucher:");
    
    // Enrich vouchers with expenseNumber from linked expenses
    const allExpenses = await kv.getByPrefix("expense:");
    const expenseMap = new Map<string, string>();
    allExpenses.forEach((exp: any) => {
      if (exp.id && exp.expenseNumber) {
        expenseMap.set(exp.id, exp.expenseNumber);
      }
    });
    
    // Build reverse lookup: voucherId → expenseNumber
    // Covers both direct (expenseId) and indirect (lineItemIds referencing expense charges)
    const voucherToExpenseMap = new Map<string, string>();
    // Direct: voucher.expenseId → expense
    allVouchers.forEach((voucher: any) => {
      if (voucher.expenseId && expenseMap.has(voucher.expenseId)) {
        voucherToExpenseMap.set(voucher.id, expenseMap.get(voucher.expenseId)!);
      }
    });
    // Indirect: voucher.lineItemIds contain charge-{expenseId}-{index} patterns
    allExpenses.forEach((exp: any) => {
      if (!exp.id || !exp.expenseNumber) return;
      allVouchers.forEach((voucher: any) => {
        if (voucherToExpenseMap.has(voucher.id)) return;
        if (voucher.lineItemIds && Array.isArray(voucher.lineItemIds)) {
          const hasChargeFromExpense = voucher.lineItemIds.some((lid: string) =>
            lid.startsWith(`charge-${exp.id}-`)
          );
          if (hasChargeFromExpense) {
            voucherToExpenseMap.set(voucher.id, exp.expenseNumber);
          }
        }
      });
    });
    // Via booking: if voucher has bookingId, find the expense linked to that booking
    // (since there's typically 1 expense per booking, this is a reliable fallback)
    allVouchers.forEach((voucher: any) => {
      if (voucherToExpenseMap.has(voucher.id)) return;
      if (!voucher.bookingId) return;
      const matchingExpense = allExpenses.find((exp: any) => {
        if (!exp.id || !exp.expenseNumber) return false;
        if (exp.bookingIds && Array.isArray(exp.bookingIds)) {
          return exp.bookingIds.includes(voucher.bookingId);
        }
        if (exp.bookingId === voucher.bookingId || exp.booking_id === voucher.bookingId) {
          return true;
        }
        return false;
      });
      if (matchingExpense) {
        voucherToExpenseMap.set(voucher.id, matchingExpense.expenseNumber);
      }
    });
    
    const enrichedVouchers = allVouchers.map((voucher: any) => ({
      ...voucher,
      expenseNumber: voucher.expenseNumber
        || (voucher.expenseId ? expenseMap.get(voucher.expenseId) : null)
        || voucherToExpenseMap.get(voucher.id)
        || null,
    }));
    
    console.log(`Found ${enrichedVouchers.length} total vouchers (enriched with expense numbers)`);
    return c.json({ success: true, data: enrichedVouchers });
  } catch (error) {
    console.error("Error fetching all vouchers:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get a single voucher by ID
app.get("/make-server-ce0d67b8/vouchers/:voucherId", async (c) => {
  try {
    const voucherId = c.req.param("voucherId");
    const voucher = await kv.get(`voucher:${voucherId}`);
    
    if (!voucher) {
      console.log(`Voucher ${voucherId} not found`);
      return c.json({ success: false, error: "Voucher not found" }, 404);
    }
    
    // Fetch the linked expense to get expense number and line item details
    let enrichedVoucher = { ...voucher };
    
    if (voucher.expenseId) {
      const expense = await kv.get(`expense:${voucher.expenseId}`);
      if (expense) {
        enrichedVoucher.expenseNumber = expense.expenseNumber;
        
        // Get the actual line item details from the expense
        if (voucher.lineItemIds && Array.isArray(voucher.lineItemIds) && expense.charges) {
          // Map charges with generated IDs (same logic as frontend)
          const chargesWithIds = expense.charges.map((charge: any, index: number) => ({
            ...charge,
            id: charge.id || `charge-${voucher.expenseId}-${index}`
          }));
          
          // Filter to get only the selected line items
          enrichedVoucher.lineItems = chargesWithIds.filter((charge: any) => 
            voucher.lineItemIds.includes(charge.id)
          );
          
          // Recalculate total amount from line items
          const totalAmount = enrichedVoucher.lineItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
          enrichedVoucher.amount = totalAmount;
          
          // Get currency from first line item
          if (enrichedVoucher.lineItems.length > 0) {
            enrichedVoucher.currency = enrichedVoucher.lineItems[0].currency || "PHP";
          }
        }
      }
    }
    
    console.log(`Found voucher ${voucherId} with ${enrichedVoucher.lineItems?.length || 0} line items, total: ${enrichedVoucher.amount}`);
    return c.json({ success: true, data: enrichedVoucher });
  } catch (error) {
    console.error(`Error fetching voucher ${c.req.param("voucherId")}:`, error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get vouchers for an expense
app.get("/make-server-ce0d67b8/expenses/:expenseId/vouchers", async (c) => {
  try {
    const expenseId = c.req.param("expenseId");
    
    // Get all vouchers with this expense ID
    const allVouchers = await kv.getByPrefix("voucher:");
    const expenseVouchers = allVouchers.filter((v: any) => v.expenseId === expenseId);
    
    // Get the expense to recalculate amounts for each voucher
    const expense = await kv.get(`expense:${expenseId}`);
    
    // Enrich each voucher with recalculated amounts
    const enrichedVouchers = expenseVouchers.map((voucher: any) => {
      if (expense && voucher.lineItemIds && Array.isArray(voucher.lineItemIds) && expense.charges) {
        // Map charges with generated IDs (same logic as frontend)
        const chargesWithIds = expense.charges.map((charge: any, index: number) => ({
          ...charge,
          id: charge.id || `charge-${expenseId}-${index}`
        }));
        
        // Filter to get only the selected line items
        const lineItems = chargesWithIds.filter((charge: any) => 
          voucher.lineItemIds.includes(charge.id)
        );
        
        // Recalculate total amount from line items
        const totalAmount = lineItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
        
        return {
          ...voucher,
          amount: totalAmount,
          currency: lineItems.length > 0 ? (lineItems[0].currency || "PHP") : voucher.currency
        };
      }
      return voucher;
    });
    
    console.log(`Found ${enrichedVouchers.length} vouchers for expense ${expenseId}`);
    
    return c.json({ success: true, data: enrichedVouchers });
  } catch (error) {
    console.error("Error fetching vouchers:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create standalone voucher (Voucher-First)
app.post("/make-server-ce0d67b8/vouchers", async (c) => {
  try {
    const body = await c.req.json();

    // Voucher ref format: {companyCode} {voucherType} {year}-{number}
    // Bucket is per companyCode + voucherType + year
    let voucherNumber = body.voucherNumber;
    const companyCode = body.companyCode || "RVS";
    const voucherType = body.voucherType || "CV";
    const voucherYear = body.voucherYear || new Date().getFullYear();

    if (!voucherNumber) {
      const allVouchers = await kvRetry(() => kv.getByPrefix("voucher:"));
      const prefix = `${companyCode} ${voucherType} ${voucherYear}-`;
      const usedNumbers = new Set(allVouchers.map((v: any) => {
        const vn = v.voucherNumber || "";
        if (!vn.startsWith(prefix)) return null;
        const numStr = vn.slice(prefix.length);
        const n = parseInt(numStr, 10);
        return isNaN(n) ? null : n;
      }).filter((n: any) => n !== null));
      let next = 1;
      while (usedNumbers.has(next)) next++;
      voucherNumber = `${prefix}${next}`;
    }

    // Uniqueness check
    const allVouchers2 = await kvRetry(() => kv.getByPrefix("voucher:"));
    const duplicate = allVouchers2.find((v: any) => v.voucherNumber === voucherNumber);
    if (duplicate) {
      return c.json({ success: false, error: `Reference number ${voucherNumber} is already in use by another active record.` }, 409);
    }

    const voucherId = `voucher-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const voucher = {
      id: voucherId,
      voucherNumber,
      companyCode,
      voucherType,
      voucherYear,
      // Core fields from Voucher-First
      payee: body.payee || "",
      category: body.category || "",
      bank: body.bank || "",
      checkNo: body.checkNo || "",
      voucherDate: body.voucherDate || new Date().toISOString(),
      amount: body.amount || 0,
      status: body.status || "Draft",
      currency: body.currency || "PHP",

      // Booking Link
      bookingId: body.bookingId || null,

      // Line Items (Particulars + Distribution)
      lineItems: body.lineItems || [],

      // Legacy fields (optional)
      expenseId: body.expenseId || null,
      shipper: body.shipper || "",
      consignee: body.consignee || "",
      origin: body.origin || "",
      commodity: body.commodity || "",
      vesselVoy: body.vesselVoy || "",
      volume: body.volume || "",
      destination: body.destination || "",
      blNumber: body.blNumber || "",
      containerNumbers: body.containerNumbers || [],

      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await kv.set(`voucher:${voucherId}`, voucher);

    console.log(`Created voucher ${voucherNumber} (Voucher-First)`);

    return c.json({ success: true, data: voucher });
  } catch (error) {
    console.error("Error creating voucher:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create voucher for an expense
app.post("/make-server-ce0d67b8/expenses/:expenseId/vouchers", async (c) => {
  try {
    const expenseId = c.req.param("expenseId");
    const body = await c.req.json();
    
    // Get the expense to calculate total from line items
    const expense = await kv.get(`expense:${expenseId}`);
    if (!expense) {
      return c.json({ success: false, error: "Expense not found" }, 404);
    }

    // Calculate total amount from selected line items
    let totalAmount = 0;
    let currency = "PHP";
    
    if (body.lineItemIds && Array.isArray(body.lineItemIds) && body.lineItemIds.length > 0) {
      // Generate charges with consistent IDs (same logic as frontend)
      const chargesWithIds = (expense.charges || []).map((charge: any, index: number) => ({
        ...charge,
        id: charge.id || `charge-${expenseId}-${index}`
      }));
      
      body.lineItemIds.forEach((lineItemId: string) => {
        const charge = chargesWithIds.find((c: any) => c.id === lineItemId);
        if (charge) {
          totalAmount += charge.amount || 0;
          currency = charge.currency || "PHP";
        }
      });
    }

    // Auto-generate voucher number using gap-finding
    const allVouchers = await kv.getByPrefix("voucher:");
    const year = new Date().getFullYear();
    const prefix = `RVS CV ${year}-`;
    const usedNums = new Set(allVouchers.map((v: any) => {
      const m = (v.voucherNumber || "").match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`));
      return m ? parseInt(m[1], 10) : null;
    }).filter((n: any) => n !== null));
    let nextV = 1;
    while (usedNums.has(nextV)) nextV++;
    const voucherNumber = `${prefix}${nextV}`;
    
    const voucherId = `voucher-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const voucher = {
      id: voucherId,
      expenseId,
      voucherNumber,
      lineItemIds: body.lineItemIds || [],
      amount: totalAmount,
      currency,
      payee: body.payee || "",
      shipper: body.shipper || "",
      vesselVoy: body.vesselVoy || "",
      volume: body.volume || "",
      destination: body.destination || "",
      blNumber: body.blNumber || "",
      containerNumbers: body.containerNumbers || [],
      status: "Draft",
      voucherDate: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await kv.set(`voucher:${voucherId}`, voucher);
    
    console.log(`Created voucher ${voucherNumber} for expense ${expenseId} with ${body.lineItemIds?.length || 0} line items`);
    
    return c.json({ success: true, data: voucher });
  } catch (error) {
    console.error("Error creating voucher:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update voucher
app.patch("/make-server-ce0d67b8/vouchers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();

    const voucher = await kv.get(`voucher:${id}`);
    if (!voucher) {
      return c.json({ success: false, error: "Voucher not found" }, 404);
    }

    // If voucherNumber is being changed, validate uniqueness
    if (updates.voucherNumber && updates.voucherNumber !== voucher.voucherNumber) {
      const allVouchers = await kvRetry(() => kv.getByPrefix("voucher:"));
      const duplicate = allVouchers.find((v: any) => v.voucherNumber === updates.voucherNumber && v.id !== id);
      if (duplicate) {
        return c.json({ success: false, error: `Reference number ${updates.voucherNumber} is already in use by another active record.` }, 409);
      }
    }

    const updatedVoucher = {
      ...voucher,
      ...updates,
      updated_at: new Date().toISOString()
    };

    await kv.set(`voucher:${id}`, updatedVoucher);
    
    // Auto-update Expense Status based on Vouchers
    if (updates.status && voucher.expenseId) {
      const expenseId = voucher.expenseId;
      const expense = await kv.get(`expense:${expenseId}`);
      
      if (expense) {
        const allVouchers = await kv.getByPrefix("voucher:");
        const expenseVouchers = allVouchers.filter((v: any) => v.expenseId === expenseId);
        
        // Sum only vouchers with 'Paid' status
        const paidAmount = expenseVouchers
          .filter((v: any) => v.status === "Paid")
          .reduce((sum: number, v: any) => sum + (v.amount || 0), 0);
          
        const totalAmount = expense.totalAmount || 0;
        
        let newStatus = expense.status;
        
        if (paidAmount >= totalAmount && totalAmount > 0) {
          newStatus = "Paid";
        } else if (paidAmount > 0) {
          newStatus = "Partially Paid";
        } else {
          // Revert to Approved if previously Paid/Partial but now 0 paid
          if (["Paid", "Partially Paid"].includes(expense.status)) {
            newStatus = "Approved";
          }
        }
        
        if (newStatus !== expense.status) {
          expense.status = newStatus;
          expense.updated_at = new Date().toISOString();
          await kv.set(`expense:${expenseId}`, expense);
          console.log(`Auto-updated expense ${expenseId} status to ${newStatus}`);
        }
      }
    }
    
    console.log(`Updated voucher: ${id}`);
    
    return c.json({ success: true, data: updatedVoucher });
  } catch (error) {
    console.error("Error updating voucher:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete voucher
app.delete("/make-server-ce0d67b8/vouchers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    await kv.del(`voucher:${id}`);
    
    console.log(`Deleted voucher: ${id}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting voucher:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get vouchers for a booking (includes both direct booking-linked and expense-linked vouchers)
app.get("/make-server-ce0d67b8/bookings/:id/vouchers", async (c) => {
  try {
    const id = c.req.param("id");
    
    const allVouchers = await kv.getByPrefix("voucher:");
    
    const segmentId = c.req.query("segmentId");

    // 1. Direct booking-linked vouchers (standalone vouchers with bookingId)
    let directVouchers = allVouchers.filter((v: any) => v.bookingId === id);
    if (segmentId) {
      directVouchers = directVouchers.filter((v: any) => v.segmentId === segmentId);
    }
    
    // 2. Expense-linked vouchers: find all expenses for this booking, then their vouchers
    const allExpenses = await kv.getByPrefix("expense:");
    const bookingExpenses = allExpenses.filter((expense: any) => {
      if (expense.bookingIds && Array.isArray(expense.bookingIds)) {
        return expense.bookingIds.includes(id);
      }
      if (expense.bookingId === id || expense.booking_id === id) {
        return true;
      }
      return false;
    });
    const bookingExpenseIds = bookingExpenses.map((e: any) => e.id);
    const expenseLinkedVouchers = allVouchers.filter((v: any) => 
      v.expenseId && bookingExpenseIds.includes(v.expenseId)
    );
    
    // Build expense map for all expenses (not just booking ones) for reverse lookup
    const allExpenseMap = new Map<string, string>();
    allExpenses.forEach((exp: any) => {
      if (exp.id && exp.expenseNumber) {
        allExpenseMap.set(exp.id, exp.expenseNumber);
      }
    });
    
    // Merge and deduplicate
    const voucherMap = new Map<string, any>();
    [...directVouchers, ...expenseLinkedVouchers].forEach((v: any) => {
      if (!voucherMap.has(v.id)) {
        // Enrich with expense number - direct link first
        const linkedExpense = bookingExpenses.find((e: any) => e.id === v.expenseId);
        let resolvedExpenseNumber = linkedExpense?.expenseNumber || v.expenseNumber || null;
        
        // Reverse lookup: check if voucher's lineItemIds reference charges from any expense
        if (!resolvedExpenseNumber && v.lineItemIds && Array.isArray(v.lineItemIds)) {
          for (const exp of allExpenses) {
            if (!exp.id || !exp.expenseNumber) continue;
            const hasCharge = v.lineItemIds.some((lid: string) =>
              lid.startsWith(`charge-${exp.id}-`)
            );
            if (hasCharge) {
              resolvedExpenseNumber = exp.expenseNumber;
              break;
            }
          }
        }
        
        // Also try direct expenseId lookup from full map
        if (!resolvedExpenseNumber && v.expenseId) {
          resolvedExpenseNumber = allExpenseMap.get(v.expenseId) || null;
        }
        
        // Via booking: find expense linked to the voucher's bookingId
        // (since there's typically 1 expense per booking, this is a reliable fallback)
        if (!resolvedExpenseNumber && v.bookingId) {
          const matchingExp = allExpenses.find((exp: any) => {
            if (!exp.id || !exp.expenseNumber) return false;
            if (exp.bookingIds && Array.isArray(exp.bookingIds)) {
              return exp.bookingIds.includes(v.bookingId);
            }
            if (exp.bookingId === v.bookingId || exp.booking_id === v.bookingId) {
              return true;
            }
            return false;
          });
          if (matchingExp) {
            resolvedExpenseNumber = matchingExp.expenseNumber;
          }
        }
        
        voucherMap.set(v.id, {
          ...v,
          expenseNumber: resolvedExpenseNumber,
        });
      }
    });
    
    const bookingVouchers = Array.from(voucherMap.values());
    
    // Sort by voucherDate descending
    bookingVouchers.sort((a: any, b: any) => 
      new Date(b.voucherDate || b.created_at).getTime() - new Date(a.voucherDate || a.created_at).getTime()
    );
    
    console.log(`Fetched ${bookingVouchers.length} vouchers for booking ${id} (${directVouchers.length} direct, ${expenseLinkedVouchers.length} expense-linked)`);
    
    return c.json({ success: true, data: bookingVouchers });
  } catch (error) {
    console.error("Error fetching booking vouchers:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== BILLINGS API ====================

// NOTE: The main GET /billings route (with bookingId/projectId filtering) is defined
// later in the file under the "// ==================== BILLINGS ====================" section.
// Do NOT add a duplicate GET /billings route here.

// Get single billing by ID
app.get("/make-server-ce0d67b8/billings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    const billing = await kvRetry(() => kv.get(`billing:${id}`));
    
    if (!billing) {
      return c.json({ success: false, error: "Billing not found" }, 404);
    }
    
    console.log(`Fetched billing: ${id}`);
    
    return c.json({ success: true, data: billing });
  } catch (error) {
    console.error("Error fetching billing:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create billing
app.post("/make-server-ce0d67b8/billings", async (c) => {
  try {
    const body = await c.req.json();

    // Billing ref format: {companyCode} {year}-{number}
    // Bucket is per companyCode + year
    let billingNumber = body.billingNumber;
    const billingCompanyCode = body.billingCompanyCode || "RVS";
    const billingYear = body.billingYear || new Date().getFullYear();

    if (!billingNumber) {
      const allBillings = await kv.getByPrefix("billing:");
      const prefix = `${billingCompanyCode} ${billingYear}-`;
      const usedNumbers = new Set(allBillings.map((b: any) => {
        const bn = b.billingNumber || "";
        if (!bn.startsWith(prefix)) return null;
        const numStr = bn.slice(prefix.length);
        const n = parseInt(numStr, 10);
        return isNaN(n) ? null : n;
      }).filter((n: any) => n !== null));
      let next = 1;
      while (usedNumbers.has(next)) next++;
      billingNumber = `${prefix}${next}`;
    }

    // Uniqueness check
    const allBillings2 = await kv.getByPrefix("billing:");
    const duplicate = allBillings2.find((b: any) => b.billingNumber === billingNumber);
    if (duplicate) {
      return c.json({ success: false, error: `Reference number ${billingNumber} is already in use by another active record.` }, 409);
    }

    const billingId = `billing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const billing = {
      id: billingId,
      billingNumber,
      billingCompanyCode,
      billingYear,
      // Core fields
      clientName: body.clientName,
      companyName: body.companyName,
      voucherId: body.voucherId,
      voucherNumber: body.voucherNumber,
      clientId: body.clientId,
      expenseAmount: body.expenseAmount || 0,
      totalExpenses: body.totalExpenses || 0,
      particulars: body.particulars || [],
      margin: body.margin || 0,
      totalAmount: body.totalAmount || 0,
      currency: body.currency || "PHP",
      status: "Draft",
      billingDate: body.billingDate || new Date().toISOString(),
      // Project & Relationships
      projectId: body.projectId,
      projectNumber: body.projectNumber,
      projectName: body.projectName,
      bookingIds: body.bookingIds || [],
      expenseIds: body.expenseIds || [],
      // Shipment Details
      vessel: body.vessel,
      blNumber: body.blNumber,
      containerNumbers: body.containerNumbers || [],
      destination: body.destination,
      origin: body.origin,
      shipper: body.shipper,
      consignee: body.consignee,
      volume: body.volume,
      commodity: body.commodity,
      contractNumber: body.contractNumber,
      exchangeRate: body.exchangeRate,
      // Timestamps
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await kv.set(`billing:${billingId}`, billing);

    console.log(`Created billing ${billingNumber} for client ${body.clientName} with ${body.bookingIds?.length || 0} bookings and ${body.expenseIds?.length || 0} expenses`);

    return c.json({ success: true, data: billing });
  } catch (error) {
    console.error("Error creating billing:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update billing
app.patch("/make-server-ce0d67b8/billings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();

    const billing = await kv.get(`billing:${id}`);
    if (!billing) {
      return c.json({ success: false, error: "Billing not found" }, 404);
    }

    // If billingNumber is being changed, validate uniqueness
    if (updates.billingNumber && updates.billingNumber !== billing.billingNumber) {
      const allBillings = await kv.getByPrefix("billing:");
      const duplicate = allBillings.find((b: any) => b.billingNumber === updates.billingNumber && b.id !== id);
      if (duplicate) {
        return c.json({ success: false, error: `Reference number ${updates.billingNumber} is already in use by another active record.` }, 409);
      }
    }

    const updatedBilling = {
      ...billing,
      ...updates,
      id, // Preserve ID
      created_at: billing.created_at,
      updated_at: new Date().toISOString()
    };

    await kv.set(`billing:${id}`, updatedBilling);

    console.log(`Updated billing: ${id}`);

    return c.json({ success: true, data: updatedBilling });
  } catch (error) {
    console.error("Error updating billing:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete billing
app.delete("/make-server-ce0d67b8/billings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    await kv.del(`billing:${id}`);
    
    console.log(`Deleted billing: ${id}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting billing:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== COLLECTIONS API ====================

// Get all collections
app.get("/make-server-ce0d67b8/collections", async (c) => {
  try {
    const billingId = c.req.query("billingId");
    
    let collections = await kv.getByPrefix("collection:");
    
    // Filter by billingId if provided (check both legacy billingId and allocations array)
    if (billingId) {
      collections = collections.filter((col: any) => isCollectionLinkedToBilling(col, billingId));
    }
    
    // Sort by created_at descending
    collections.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    // Resolve Booking Numbers for Allocations
    // To do this efficiently, we need all billings
    const allBillings = await kv.getByPrefix("billing:");
    
    // Create a map of Billing ID -> Booking Number
    const billingBookingMap = new Map();
    allBillings.forEach((b: any) => {
        // Resolve booking number using same logic as GET /billings
        let bookingNum = b.bookingNumber;
        if (!bookingNum || bookingNum === "undefined") {
            if (b.bookingIds && Array.isArray(b.bookingIds) && b.bookingIds.length > 0) {
                 // We don't have the full booking map here efficiently without fetching all bookings.
                 // For now, let's use the ID itself if name isn't available, or rely on what's in billing.
                 // Ideally, we should do the same lookup as in GET /billings if we want names.
                 // But let's assume billing might have it or we use the ID.
                 bookingNum = b.bookingIds.join(", ");
            } else if (b.bookingId) {
                 bookingNum = b.bookingId;
            }
        }
        billingBookingMap.set(b.id, bookingNum);
    });

    // Enrich collections with resolved booking numbers in allocations
    // Also compute allocatedAmount when filtering by billingId
    const enrichedCollections = collections.map((col: any) => {
        let enriched = { ...col };
        
        if (col.allocations && Array.isArray(col.allocations)) {
            const enrichedAllocations = col.allocations.map((alloc: any) => {
                const resolvedBooking = billingBookingMap.get(alloc.billingId);
                return {
                    ...alloc,
                    bookingNumber: resolvedBooking || alloc.bookingNumber || alloc.projectNumber // Fallback hierarchy
                };
            });
            enriched = { ...enriched, allocations: enrichedAllocations };
        } else if (col.billingId && !col.bookingNumber) {
            // Legacy: Single billing link
            const resolvedBooking = billingBookingMap.get(col.billingId);
            if (resolvedBooking) {
                enriched = { ...enriched, bookingNumber: resolvedBooking };
            }
        }
        
        // When filtering by billingId, add the allocated amount for that specific billing
        if (billingId) {
            enriched.allocatedAmount = getAllocatedAmountForBilling(col, billingId);
        }
        
        return enriched;
    });
    
    console.log(`Fetched ${enrichedCollections.length} collections${billingId ? ` for billing ${billingId}` : ''}`);
    
    return c.json({ success: true, data: enrichedCollections });
  } catch (error) {
    console.error("Error fetching collections:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get single collection by ID
app.get("/make-server-ce0d67b8/collections/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    const collection = await kv.get(`collection:${id}`);
    
    if (!collection) {
      return c.json({ success: false, error: "Collection not found" }, 404);
    }
    
    console.log(`Fetched collection: ${id}`);
    
    return c.json({ success: true, data: collection });
  } catch (error) {
    console.error("Error fetching collection:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create collection
app.post("/make-server-ce0d67b8/collections", async (c) => {
  try {
    const body = await c.req.json();
    
    // Normalize input to support multiple billings (allocations)
    // body.allocations should be [{ billingId: string, amount: number }]
    let allocations = body.allocations || [];
    
    // Support legacy single-billing request
    if (allocations.length === 0 && body.billingId) {
      allocations = [{ billingId: body.billingId, amount: body.amount }];
    }

    if (allocations.length === 0) {
      return c.json({ success: false, error: "At least one billing must be selected" }, 400);
    }
    
    if (!body.amount || body.amount <= 0) {
      return c.json({ success: false, error: "Valid total amount is required" }, 400);
    }
    
    // Validate allocations sum matches total amount (approximate check for floats)
    const allocationsSum = allocations.reduce((sum: number, a: any) => sum + (a.amount || 0), 0);
    if (Math.abs(allocationsSum - body.amount) > 0.01) {
       return c.json({ success: false, error: "Sum of allocations does not match total amount" }, 400);
    }

    // Validate and Fetch All Billings
    const billingUpdates = [];
    const billingDetails = []; // To store billing info for the collection record

    for (const allocation of allocations) {
        const billing = await kv.get(`billing:${allocation.billingId}`);
        if (!billing) {
            return c.json({ success: false, error: `Billing ${allocation.billingId} not found` }, 404);
        }

        // Calculate current collections for this billing
        const allCollections = await kv.getByPrefix("collection:");
        
        // Use allocation-aware helper to compute collected so far for this billing
        const totalCollectedSoFar = computeCollectedForBillingIds([allocation.billingId], allCollections);

        const outstandingBalance = billing.totalAmount - totalCollectedSoFar;
        
        if (allocation.amount > outstandingBalance + 0.01) { // 0.01 tolerance
             return c.json({ 
                success: false, 
                error: `Amount ₱${allocation.amount.toLocaleString()} for billing ${billing.billingNumber} exceeds outstanding balance of ₱${outstandingBalance.toLocaleString()}` 
              }, 400);
        }

        billingUpdates.push({
            billing,
            currentCollected: totalCollectedSoFar,
            newAmount: allocation.amount
        });
        
        billingDetails.push({
            billingId: billing.id,
            billingNumber: billing.billingNumber,
            amount: allocation.amount,
            projectId: billing.projectId, // Store project ID for reference
            projectNumber: billing.projectNumber
        });
    }
    
    const collectionId = `collection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Generate collectionNumber using lowest-gap sequence — COL {year}-{number}
    let collectionNumber = body.collectionNumber;
    if (!collectionNumber) {
      const colYear = new Date().getFullYear();
      const colPrefix = `COL ${colYear}-`;
      const allCollections = await kv.getByPrefix("collection:");
      const usedNumbers = new Set(allCollections.map((r: any) => {
        const ref = r.collectionNumber || "";
        if (!ref.startsWith(colPrefix)) return null;
        const n = parseInt(ref.slice(colPrefix.length), 10);
        return isNaN(n) ? null : n;
      }).filter((n: any) => n !== null));
      let next = 1;
      while (usedNumbers.has(next)) next++;
      collectionNumber = `${colPrefix}${next}`;
    }

    // Uniqueness check
    const allCollections2 = await kv.getByPrefix("collection:");
    const colDuplicate = allCollections2.find((r: any) => r.collectionNumber === collectionNumber && r.id !== collectionId);
    if (colDuplicate) {
      return c.json({ success: false, error: `Reference number ${collectionNumber} is already in use by another active record.` }, 409);
    }

    // Use the first billing's client info for the collection header (assuming same client)
    const primaryBilling = billingUpdates[0].billing;

    const collection = {
      id: collectionId,
      collectionNumber,
      // Legacy fields for backward compatibility (pointing to primary/first billing)
      billingId: primaryBilling.id, 
      billingNumber: primaryBilling.billingNumber,
      projectId: primaryBilling.projectId,
      
      // New Allocations Field
      allocations: billingDetails,
      
      clientId: primaryBilling.clientId,
      clientName: primaryBilling.clientName,
      amount: body.amount,
      collectionDate: body.collectionDate || new Date().toISOString(),
      paymentMethod: body.paymentMethod,
      referenceNumber: body.referenceNumber || "",
      notes: body.notes || "",
      bankName: body.bankName || "",
      checkNumber: body.checkNumber || "",
      status: "Collected",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Save Collection
    await kv.set(`collection:${collectionId}`, collection);
    
    // Update All Affected Billings
    for (const update of billingUpdates) {
        const { billing, currentCollected, newAmount } = update;
        const newTotalCollected = currentCollected + newAmount;
        const newBalance = billing.totalAmount - newTotalCollected;
        
        const updatedBilling = {
            ...billing,
            collected: newTotalCollected,
            balance: newBalance,
            // If fully paid, mark Completed. If partially, mark Partial. Maintain existing status if not Draft/Submitted? 
            // Usually payment moves it to Partial or Completed.
            status: newBalance <= 0.01 ? "Completed" : "Partially Collected",
            updated_at: new Date().toISOString()
        };
        
        await kv.set(`billing:${billing.id}`, updatedBilling);
        console.log(`Updated billing ${billing.billingNumber}: Collected +${newAmount}, New Balance ${newBalance}`);
    }
    
    console.log(`Created multi-billing collection ${collection.collectionNumber}, total: ₱${body.amount.toLocaleString()}`);
    
    return c.json({ success: true, data: collection });
  } catch (error) {
    console.error("Error creating collection:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update collection
app.patch("/make-server-ce0d67b8/collections/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();

    const collection = await kv.get(`collection:${id}`);
    if (!collection) {
      return c.json({ success: false, error: "Collection not found" }, 404);
    }

    // If collectionNumber is being changed, validate uniqueness
    if (updates.collectionNumber && updates.collectionNumber !== collection.collectionNumber) {
      const allCollections = await kv.getByPrefix("collection:");
      const duplicate = allCollections.find((r: any) => r.collectionNumber === updates.collectionNumber && r.id !== id);
      if (duplicate) {
        return c.json({ success: false, error: `Reference number ${updates.collectionNumber} is already in use by another active record.` }, 409);
      }
    }

    const updatedCollection = {
      ...collection,
      ...updates,
      id, // Preserve ID
      billingId: collection.billingId, // Prevent changing billing link
      created_at: collection.created_at, // Preserve created_at
      updated_at: new Date().toISOString()
    };

    await kv.set(`collection:${id}`, updatedCollection);
    
    // Auto-update Billing Status based on Collections
    // Identify all involved billings
    const involvedBillingIds = new Set<string>();
    if (collection.billingId) involvedBillingIds.add(collection.billingId);
    if (collection.allocations) {
        collection.allocations.forEach((a: any) => involvedBillingIds.add(a.billingId));
    }

    if (updates.status) {
        const allCollections = await kv.getByPrefix("collection:");

        for (const billingId of involvedBillingIds) {
             const billing = await kv.get(`billing:${billingId}`);
             if (!billing) continue;

             // Use allocation-aware helper to compute collected amount for this billing
             const collectedAmount = computeCollectedForBillingIds([billingId], allCollections, "Collected");
               
             const totalAmount = billing.totalAmount || 0;
             let newStatus = billing.status;
             
             if (collectedAmount >= totalAmount - 0.01 && totalAmount > 0) { // Tolerance
               newStatus = "Completed";
             } else if (collectedAmount > 0.01) {
               newStatus = "Partially Collected";
             } else {
               if (["Completed", "Paid", "Partially Collected"].includes(billing.status)) {
                 newStatus = "Approved"; // Revert to Approved if balance cleared (e.g. collection cancelled)
               }
             }
             
             // Also update collected amount and balance fields
             const newBalance = totalAmount - collectedAmount;

             if (newStatus !== billing.status || Math.abs(billing.collected - collectedAmount) > 0.01) {
               billing.status = newStatus;
               billing.collected = collectedAmount;
               billing.balance = newBalance;
               billing.updated_at = new Date().toISOString();
               await kv.set(`billing:${billingId}`, billing);
               console.log(`Auto-updated billing ${billingId} status to ${newStatus}, Collected: ${collectedAmount}`);
             }
        }
    }
    
    console.log(`Updated collection: ${id}`);
    
    return c.json({ success: true, data: updatedCollection });
  } catch (error) {
    console.error("Error updating collection:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete collection
app.delete("/make-server-ce0d67b8/collections/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    const collection = await kv.get(`collection:${id}`);
    if (!collection) {
      return c.json({ success: false, error: "Collection not found" }, 404);
    }
    
    await kv.del(`collection:${id}`);
    
    // Identify all billings involved in this collection
    const involvedBillingIds = new Set<string>();
    if (collection.billingId) involvedBillingIds.add(collection.billingId);
    if (collection.allocations) {
        collection.allocations.forEach((a: any) => involvedBillingIds.add(a.billingId));
    }
    
    // Recalculate balances for all involved billings
    const allCollections = await kv.getByPrefix("collection:");
    // Filter out the deleted one
    const activeCollections = allCollections.filter((col: any) => col.id !== id);

    for (const billingId of involvedBillingIds) {
        const billing = await kv.get(`billing:${billingId}`);
        if (!billing) continue;
        
        // Use allocation-aware helper with remaining collections (excluding deleted one)
        const totalCollected = computeCollectedForBillingIds([billingId], activeCollections);
        
        const newBalance = billing.totalAmount - totalCollected;
        
        const updatedBilling = {
            ...billing,
            collected: totalCollected,
            balance: newBalance,
            // Revert status if needed. If Completed -> Partial or Approved.
            status: newBalance <= 0.01 ? "Completed" : newBalance < billing.totalAmount ? "Partially Collected" : "Approved",
            updated_at: new Date().toISOString()
        };
        
        await kv.set(`billing:${billingId}`, updatedBilling);
        console.log(`Restored balance for billing ${billing.billingNumber}: ${newBalance}`);
    }
    
    console.log(`Deleted collection: ${id}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting collection:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== SEED DATA API ====================

// Seed all entity types with test data
app.post("/make-server-ce0d67b8/entities/seed", async (c) => {
  try {
    const results = {
      customers: [],
      contacts: [],
      quotations: [],
      bookings: [],
      expenses: [],
      projects: []
    };
    
    // === SEED CUSTOMERS ===
    const customers = [
      {
        id: "customer-1",
        company_name: "ABC Logistics Corp",
        industry: "Logistics",
        status: "Active",
        registered_address: "123 Ayala Avenue, Makati City",
        email: "info@abclogistics.ph",
        phone: "+63 2 8123 4567",
        created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "customer-2",
        company_name: "XYZ Manufacturing Inc",
        industry: "Manufacturing",
        status: "Active",
        registered_address: "456 Ortigas Avenue, Pasig City",
        email: "contact@xyzmanufacturing.ph",
        phone: "+63 2 8234 5678",
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "customer-3",
        company_name: "Global Trading Solutions",
        industry: "Trading",
        status: "Active",
        registered_address: "789 BGC, Taguig City",
        email: "hello@globaltrading.ph",
        phone: "+63 2 8345 6789",
        created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "customer-4",
        company_name: "Pacific Import Export",
        industry: "Import/Export",
        status: "Prospect",
        registered_address: "321 Roxas Boulevard, Manila",
        email: "info@pacificimport.ph",
        phone: "+63 2 8456 7890",
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "customer-5",
        company_name: "Metro Retail Group",
        industry: "Retail",
        status: "Active",
        registered_address: "654 Shaw Boulevard, Mandaluyong",
        email: "procurement@metroretail.ph",
        phone: "+63 2 8567 8901",
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    for (const customer of customers) {
      await kv.set(`customer:${customer.id}`, customer);
      results.customers.push(customer);
    }
    
    // === SEED CONTACTS ===
    // ⚠️ REMOVED: Contact seed data has been removed to prevent fake data pollution
    // Users should create real contacts through the UI instead
    
    // === SEED QUOTATIONS ===
    const quotations = [
      {
        id: "QUO-1734500000-abc123",
        quote_number: "QUO-1734500000-abc123",
        quotation_name: "Container Shipment - Manila to Cebu",
        customer_id: "customer-1",
        customer_name: "ABC Logistics Corp",
        contact_person_id: "contact-1",
        contact_person_name: "Juan Dela Cruz",
        status: "Draft",
        origin: "Manila",
        destination: "Cebu",
        cargo_type: "General Cargo",
        container_size: "20ft",
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "QUO-1734400000-def456",
        quote_number: "QUO-1734400000-def456",
        quotation_name: "Air Freight - Manila to Singapore",
        customer_id: "customer-2",
        customer_name: "XYZ Manufacturing Inc",
        contact_person_id: "contact-3",
        contact_person_name: "Pedro Reyes",
        status: "Pending Pricing",
        origin: "Manila",
        destination: "Singapore",
        cargo_type: "Electronics",
        weight: "500kg",
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "QUO-1734300000-ghi789",
        quote_number: "QUO-1734300000-ghi789",
        quotation_name: "Sea Freight - Davao to Hong Kong",
        customer_id: "customer-3",
        customer_name: "Global Trading Solutions",
        contact_person_id: "contact-4",
        contact_person_name: "Ana Garcia",
        status: "Quotation",
        origin: "Davao",
        destination: "Hong Kong",
        cargo_type: "Agricultural Products",
        container_size: "40ft",
        ocean_freight_rate: 1200,
        local_charges: 300,
        total_price: 1500,
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "QUO-1734200000-jkl012",
        quote_number: "QUO-1734200000-jkl012",
        quotation_name: "LCL Shipment - Manila to Japan",
        customer_id: "customer-1",
        customer_name: "ABC Logistics Corp",
        contact_person_id: "contact-2",
        contact_person_name: "Maria Santos",
        status: "Rejected",
        origin: "Manila",
        destination: "Tokyo",
        cargo_type: "Consumer Goods",
        weight: "2000kg",
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "QUO-1734100000-mno345",
        quote_number: "QUO-1734100000-mno345",
        quotation_name: "Express Delivery - Manila to Cebu",
        customer_id: "customer-5",
        customer_name: "Metro Retail Group",
        contact_person_id: "contact-6",
        contact_person_name: "Sofia Rodriguez",
        status: "Draft",
        origin: "Manila",
        destination: "Cebu",
        cargo_type: "Retail Products",
        weight: "100kg",
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "QUO-1734050000-pqr678",
        quote_number: "QUO-1734050000-pqr678",
        quotation_name: "Bulk Cargo - Subic to Vietnam",
        customer_id: "customer-2",
        customer_name: "XYZ Manufacturing Inc",
        contact_person_id: "contact-3",
        contact_person_name: "Pedro Reyes",
        status: "Quotation",
        origin: "Subic",
        destination: "Ho Chi Minh",
        cargo_type: "Raw Materials",
        weight: "5000kg",
        ocean_freight_rate: 2500,
        local_charges: 600,
        total_price: 3100,
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "QUO-1734000000-stu901",
        quote_number: "QUO-1734000000-stu901",
        quotation_name: "Refrigerated Container - Manila to USA",
        customer_id: "customer-3",
        customer_name: "Global Trading Solutions",
        contact_person_id: "contact-4",
        contact_person_name: "Ana Garcia",
        status: "Pending Pricing",
        origin: "Manila",
        destination: "Los Angeles",
        cargo_type: "Perishable Goods",
        container_size: "20ft Reefer",
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "QUO-1733900000-vwx234",
        quote_number: "QUO-1733900000-vwx234",
        quotation_name: "Multimodal Transport - Cebu to Europe",
        customer_id: "customer-4",
        customer_name: "Pacific Import Export",
        contact_person_id: "contact-5",
        contact_person_name: "Carlos Mendoza",
        status: "Draft",
        origin: "Cebu",
        destination: "Rotterdam",
        cargo_type: "Mixed Cargo",
        container_size: "40ft HC",
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    for (const quotation of quotations) {
      await kv.set(`quotation:${quotation.id}`, quotation);
      results.quotations.push(quotation);
    }
    
    // === SEED BOOKINGS ===
    const bookings = [
      {
        id: "BKG-1734600000-aaa111",
        tracking_number: "ABCL-2024-001",
        booking_name: "Container to Cebu - ABC Logistics",
        customer_id: "customer-1",
        customer_name: "ABC Logistics Corp",
        quotation_id: "QUO-1734300000-ghi789",
        status: "In Transit",
        origin: "Manila",
        destination: "Cebu",
        departure_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        eta: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "BKG-1734500000-bbb222",
        tracking_number: "XYZM-2024-045",
        booking_name: "Air Freight to Singapore - XYZ Manufacturing",
        customer_id: "customer-2",
        customer_name: "XYZ Manufacturing Inc",
        quotation_id: "QUO-1734050000-pqr678",
        status: "Delivered",
        origin: "Manila",
        destination: "Singapore",
        departure_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        eta: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
        delivery_date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "BKG-1734400000-ccc333",
        tracking_number: "GLTS-2024-089",
        booking_name: "Sea Freight to Hong Kong - Global Trading",
        customer_id: "customer-3",
        customer_name: "Global Trading Solutions",
        quotation_id: "QUO-1734300000-ghi789",
        status: "Completed",
        origin: "Davao",
        destination: "Hong Kong",
        departure_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        eta: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000).toISOString(),
        delivery_date: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "BKG-1734300000-ddd444",
        tracking_number: "METR-2024-012",
        booking_name: "Express Delivery - Metro Retail",
        customer_id: "customer-5",
        customer_name: "Metro Retail Group",
        status: "Processing",
        origin: "Manila",
        destination: "Cebu",
        departure_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        eta: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "BKG-1734200000-eee555",
        tracking_number: "PACI-2024-034",
        booking_name: "Import Cargo - Pacific Import Export",
        customer_id: "customer-4",
        customer_name: "Pacific Import Export",
        status: "Draft",
        origin: "Shanghai",
        destination: "Manila",
        departure_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        eta: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    for (const booking of bookings) {
      await kv.set(`booking:${booking.id}`, booking);
      results.bookings.push(booking);
    }
    
    // === SEED EXPENSES ===
    const expenses = [
      {
        id: "EXP-1734700000-xxx111",
        expense_name: "Ocean Freight Charges",
        booking_id: "BKG-1734600000-aaa111",
        category: "Transportation",
        amount: 1200,
        currency: "PHP",
        status: "Approved",
        vendor: "Maersk Line",
        description: "Ocean freight from Manila to Cebu",
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "EXP-1734600000-yyy222",
        expense_name: "Local Port Charges",
        booking_id: "BKG-1734600000-aaa111",
        category: "Port Fees",
        amount: 300,
        currency: "PHP",
        status: "Approved",
        vendor: "Manila Port Authority",
        description: "Local handling and port fees",
        created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "EXP-1734500000-zzz333",
        expense_name: "Customs Clearance",
        booking_id: "BKG-1734500000-bbb222",
        category: "Customs",
        amount: 450,
        currency: "PHP",
        status: "Paid",
        vendor: "ABC Customs Broker",
        description: "Import customs clearance Singapore",
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "EXP-1734400000-www444",
        expense_name: "Trucking Service",
        booking_id: "BKG-1734400000-ccc333",
        category: "Transportation",
        amount: 180,
        currency: "PHP",
        status: "Paid",
        vendor: "FastTrack Logistics",
        description: "Inland transport from port to warehouse",
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "EXP-1734300000-vvv555",
        expense_name: "Warehouse Storage",
        booking_id: "BKG-1734300000-ddd444",
        category: "Storage",
        amount: 120,
        currency: "PHP",
        status: "Pending",
        vendor: "Metro Warehouse Inc",
        description: "7 days storage fee",
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "EXP-1734200000-uuu666",
        expense_name: "Insurance Premium",
        booking_id: "BKG-1734500000-bbb222",
        category: "Insurance",
        amount: 250,
        currency: "PHP",
        status: "Approved",
        vendor: "Marine Insurance Co",
        description: "Cargo insurance coverage",
        created_at: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    for (const expense of expenses) {
      await kv.set(`expense:${expense.id}`, expense);
      results.expenses.push(expense);
    }
    
    // === SEED PROJECTS ===
    const projects = [
      {
        id: "PRJ-2024-001",
        project_number: "PRJ-2024-001",
        quotation_id: "QUO-1734300000-ghi789",
        quotation_number: "QUO-1734300000-ghi789",
        quotation_name: "Manila to Cebu Electronics Export",
        customer_id: "customer-1",
        customer_name: "ABC Logistics Corp",
        contact_person_name: "Juan Dela Cruz",
        status: "Active",
        booking_status: "No Bookings Yet",
        bd_owner_user_id: "user-bd-rep-001",
        bd_owner_user_name: "Juan Dela Cruz",
        bd_owner_email: "bd.rep@neuron.ph",
        ops_assigned_user_id: "user-ops-rep-001",
        ops_assigned_user_name: "Carlos Mendoza",
        // Route information
        movement: "EXPORT",
        category: "SEA FREIGHT",
        shipment_type: "FCL",
        pol_aol: "Manila",
        pod_aod: "Cebu",
        carrier: "Maersk",
        transit_days: 3,
        incoterm: "FOB",
        commodity: "Electronics",
        // Service list
        services: ["Forwarding"],
        services_metadata: [
          {
            service_type: "Forwarding",
            service_details: {
              mode: "Ocean",
              incoterms: "FOB",
              cargo_type: "General",
              commodity: "Electronics",
              pol: "Manila",
              pod: "Cebu"
            }
          }
        ],
        // Cargo details
        volume_cbm: 28.5,
        volume_containers: "2x20' STD",
        volume_packages: 40,
        gross_weight: 12500,
        chargeable_weight: 12500,
        cargo_type: "General",
        stackability: "Stackable",
        // Project details
        client_po_number: "PO-ABC-2024-158",
        client_po_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        shipment_ready_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        requested_etd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        special_instructions: "Handle with care - fragile electronics",
        // Financial
        currency: "PHP",
        total: 85000,
        // Tracking
        linkedBookings: [],
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "PRJ-2024-002",
        project_number: "PRJ-2024-002",
        quotation_id: "QUO-1734050000-pqr678",
        quotation_number: "QUO-1734050000-pqr678",
        quotation_name: "Subic to Ho Chi Minh Raw Materials",
        customer_id: "customer-2",
        customer_name: "XYZ Manufacturing Inc",
        contact_person_name: "Maria Santos",
        status: "Active",
        booking_status: "Partially Booked",
        bd_owner_user_id: "user-bd-manager-001",
        bd_owner_user_name: "Maria Santos",
        bd_owner_email: "bd.manager@neuron.ph",
        ops_assigned_user_id: null,
        ops_assigned_user_name: null,
        // Route information
        movement: "EXPORT",
        category: "SEA FREIGHT",
        shipment_type: "FCL",
        pol_aol: "Subic",
        pod_aod: "Ho Chi Minh",
        carrier: "ONE Line",
        transit_days: 5,
        incoterm: "CIF",
        commodity: "Raw Materials",
        // Service list
        services: ["Forwarding", "Trucking"],
        services_metadata: [
          {
            service_type: "Forwarding",
            service_details: {
              mode: "Ocean",
              incoterms: "CIF",
              cargo_type: "General",
              commodity: "Raw Materials",
              pol: "Subic",
              pod: "Ho Chi Minh"
            }
          },
          {
            service_type: "Trucking",
            service_details: {
              pull_out: "Factory A, Subic Bay Freeport Zone",
              delivery_address: "Subic Port Terminal",
              truck_type: "10W"
            }
          }
        ],
        // Cargo details
        volume_cbm: 67.2,
        volume_containers: "1x40' HC",
        volume_packages: 80,
        gross_weight: 22000,
        chargeable_weight: 22000,
        cargo_type: "General",
        stackability: "Stackable",
        // Project details
        client_po_number: "PO-XYZ-2024-089",
        client_po_date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
        shipment_ready_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        requested_etd: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
        special_instructions: "Coordinate with factory for pickup schedule",
        // Financial
        currency: "PHP",
        total: 120000,
        // Tracking - One service booked (Forwarding)
        linkedBookings: [
          {
            bookingId: "FOR-2024-001",
            bookingNumber: "FOR-2024-001",
            serviceType: "Forwarding",
            status: "Draft",
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            createdBy: "Carlos Mendoza"
          }
        ],
        created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "PRJ-2024-003",
        project_number: "PRJ-2024-003",
        quotation_id: "QUO-1734000000-abc123",
        quotation_number: "QUO-1734000000-abc123",
        quotation_name: "Manila to Singapore Textile Air Freight",
        customer_id: "customer-3",
        customer_name: "Global Trading Solutions",
        contact_person_name: "Robert Lee",
        status: "Completed",
        booking_status: "Fully Booked",
        bd_owner_user_id: "user-bd-rep-001",
        bd_owner_user_name: "Juan Dela Cruz",
        bd_owner_email: "bd.rep@neuron.ph",
        ops_assigned_user_id: "user-ops-rep-001",
        ops_assigned_user_name: "Carlos Mendoza",
        // Route information
        movement: "EXPORT",
        category: "AIR FREIGHT",
        shipment_type: "Consolidation",
        pol_aol: "Manila",
        pod_aod: "Singapore",
        carrier: "Singapore Airlines",
        transit_days: 1,
        incoterm: "EXW",
        commodity: "Textile Products",
        // Service list
        services: ["Forwarding"],
        services_metadata: [
          {
            service_type: "Forwarding",
            service_details: {
              mode: "Air",
              incoterms: "EXW",
              cargo_type: "General",
              commodity: "Textile Products",
              aol: "Manila",
              aod: "Singapore",
              pol: "Manila",
              pod: "Singapore"
            }
          }
        ],
        // Cargo details
        volume_cbm: 2.5,
        gross_weight: 500,
        chargeable_weight: 500,
        cargo_type: "General",
        stackability: "Stackable",
        // Project details
        client_po_number: "PO-GTS-2024-042",
        client_po_date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        shipment_ready_date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        requested_etd: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
        actual_etd: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
        eta: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
        actual_delivery_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        // Financial
        currency: "PHP",
        total: 65000,
        // Tracking - Fully booked
        linkedBookings: [
          {
            bookingId: "FOR-2024-099",
            bookingNumber: "FOR-2024-099",
            serviceType: "Forwarding",
            status: "Completed",
            createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
            createdBy: "Carlos Mendoza"
          }
        ],
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    for (const project of projects) {
      await kv.set(`project:${project.id}`, project);
      results.projects.push(project);
    }
    
    console.log(`Seeded ${results.customers.length} customers, ${results.contacts.length} contacts, ${results.quotations.length} quotations, ${results.bookings.length} bookings, ${results.expenses.length} expenses, ${results.projects.length} projects`);
    
    return c.json({
      success: true,
      message: "Successfully seeded all entity data",
      data: {
        customers: results.customers.length,
        contacts: results.contacts.length,
        quotations: results.quotations.length,
        bookings: results.bookings.length,
        expenses: results.expenses.length,
        projects: results.projects.length,
        total: results.customers.length + results.contacts.length + results.quotations.length + results.bookings.length + results.expenses.length + results.projects.length
      }
    });
  } catch (error) {
    console.error("Error seeding entity data:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== OPERATIONS MODULE API ====================

// Helper function to generate booking ID
function generateBookingId(type: string): string {
  const prefix = type.toUpperCase().substring(0, 3);
  const year = new Date().getFullYear();
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${year}-${random}`;
}

type TagHistoryEntry = {
  id: string;
  timestamp: string;
  user: string;
  action: "tag_added" | "tag_removed";
  tag: string;
  tagLabel: string;
  layer: "shipment" | "operational";
};

const STATUS_TAG_LABELS: Record<string, string> = {
  "awaiting-discharge": "Awaiting Discharge",
  "ready-gatepass": "Ready Gatepass / For Delivery",
  "for-gatepass": "For Gatepass",
  "delivered": "Delivered",
  "awaiting-stowage": "Awaiting Stowage",
  "awaiting-signed-docs": "Awaiting Signed Docs",
  "cro": "CRO",
  "for-web": "For WEB",
  "for-debit": "For Debit",
  "for-final": "For Final",
  "for-lodgement": "For Lodgement",
  "with-eta": "With ETA",
  "without-eta": "Without ETA",
  "returned": "Returned",
  "awaiting-discharge-cro": "Awaiting Discharge & CRO",
  "with-stowage-discharged": "With Stowage / Discharged & Awaiting Signed Docs",
  "for-debit-for-final": "For Debit For Final",
  "awaiting-trucking": "Awaiting Trucking",
  "checking-trucking": "Checking Trucking",
  "looking-truck": "Looking for a Truck",
  "requesting-rates": "Requesting Rates",
  "booked": "Booked",
  "schedule": "Schedule",
  "re-schedule": "Re-Schedule",
  "awaiting-address": "Awaiting Address",
  "awaiting-schedule": "Awaiting Schedule",
  "client-will-handle": "Client Will Handle",
  "client-will-handle-trucking": "Client Will Handle the Trucking",
};

const SHIPMENT_TAG_KEYS = new Set([
  "awaiting-discharge",
  "ready-gatepass",
  "for-gatepass",
  "delivered",
  "awaiting-stowage",
  "awaiting-signed-docs",
  "cro",
  "for-web",
  "for-debit",
  "for-final",
  "for-lodgement",
  "with-eta",
  "without-eta",
  "returned",
  "awaiting-discharge-cro",
  "with-stowage-discharged",
  "for-debit-for-final",
]);

const LEGACY_IMPORT_STATUS_TO_TAGS: Record<string, string[]> = {
  "For Gatepass": ["for-gatepass"],
  "Awaiting Discharge & CRO": ["awaiting-discharge", "cro"],
  "For Debit For Final": ["for-debit", "for-final"],
  "For Lodgement": ["for-lodgement"],
  "Awaiting Stowage": ["awaiting-stowage"],
  "With Stowage / Discharged & Awaiting Signed Docs": ["with-stowage-discharged"],
  "With ETA": ["with-eta"],
  "Without ETA": ["without-eta"],
  "Delivered": ["delivered"],
  "Returned": ["returned"],
};

const LEGACY_EXPORT_STATUS_TO_TAGS: Record<string, string[]> = {
  Delivered: ["delivered"],
  Completed: ["delivered"],
};

function dedupeTags(tags: string[]): string[] {
  return Array.from(new Set((tags || []).filter(Boolean)));
}

function getTagLabel(tagKey: string): string {
  return STATUS_TAG_LABELS[tagKey] || tagKey;
}

function createTagHistoryEntries(
  oldTags: string[],
  newTags: string[],
  user: string,
  layer: "shipment" | "operational" = "shipment",
): TagHistoryEntry[] {
  const oldSet = new Set(oldTags || []);
  const newSet = new Set(newTags || []);
  const now = new Date().toISOString();
  const actor = user || "Unknown";
  const entries: TagHistoryEntry[] = [];

  for (const tag of newSet) {
    if (!oldSet.has(tag)) {
      entries.push({
        id: crypto.randomUUID(),
        timestamp: now,
        user: actor,
        action: "tag_added",
        tag,
        tagLabel: getTagLabel(tag),
        layer,
      });
    }
  }

  for (const tag of oldSet) {
    if (!newSet.has(tag)) {
      entries.push({
        id: crypto.randomUUID(),
        timestamp: now,
        user: actor,
        action: "tag_removed",
        tag,
        tagLabel: getTagLabel(tag),
        layer,
      });
    }
  }

  return entries;
}

async function migrateImportBookingIfNeeded(booking: any, id: string): Promise<any> {
  if (!booking) return booking;
  if (Array.isArray(booking.shipmentTags)) return booking;

  const mappedTags = LEGACY_IMPORT_STATUS_TO_TAGS[String(booking.status || "")] || [];
  const migrated = {
    ...booking,
    shipmentTags: dedupeTags(mappedTags),
    tagHistory: Array.isArray(booking.tagHistory) ? booking.tagHistory : [],
  };
  await kv.set(`import_booking:${id}`, migrated);
  return migrated;
}

async function migrateExportBookingIfNeeded(booking: any, id: string): Promise<any> {
  if (!booking) return booking;
  let migrated = booking;
  let dirty = false;

  // Step 1: Migrate legacy status -> shipmentTags
  if (!Array.isArray(migrated.shipmentTags)) {
    const mappedTags = LEGACY_EXPORT_STATUS_TO_TAGS[String(migrated.status || "")] || [];
    migrated = {
      ...migrated,
      shipmentTags: dedupeTags(mappedTags),
      tagHistory: Array.isArray(migrated.tagHistory) ? migrated.tagHistory : [],
    };
    dirty = true;
  }

  // Step 2: Migrate to segments if missing
  if (!Array.isArray(migrated.segments) || migrated.segments.length === 0) {
    const containerNos = typeof migrated.containerNo === "string"
      ? migrated.containerNo.split(",").map((s: string) => s.trim()).filter(Boolean)
      : Array.isArray(migrated.containerNo) ? migrated.containerNo : [];

    const defaultSegment = {
      segmentId: `${id}-seg-1`,
      segmentLabel: "Main Voyage",
      legOrder: 1,
      containerNos,
      origin: migrated.origin || "",
      pod: migrated.pod || "",
      destination: migrated.destination || "",
      vesselVoyage: migrated.vesselVoyage || "",
      shippingLine: migrated.shippingLine || "",
      etd: migrated.etd || "",
      etdTime: migrated.etdTime || "",
      atd: migrated.atd || "",
      atdTime: migrated.atdTime || "",
      eta: migrated.eta || "",
      etaTime: migrated.etaTime || "",
      vesselStatus: migrated.vesselStatus || "",
      lctEdArrastre: migrated.lctEdArrastre || "",
      lctEdArrastreTime: migrated.lctEdArrastreTime || "",
      lctCargo: migrated.lctCargo || "",
      lctCargoTime: migrated.lctCargoTime || "",
      blNumber: migrated.blNumber || "",
      mblMawb: migrated.mblMawb || "",
      domesticFreight: migrated.domesticFreight || "",
      hustlingStripping: migrated.hustlingStripping || "",
      forkliftOperator: migrated.forkliftOperator || "",
      exportDivision: migrated.exportDivision || "",
      lodgmentCdsFee: migrated.lodgmentCdsFee || "",
      formE: migrated.formE || "",
      oceanFreight: migrated.oceanFreight || "",
      sealFee: migrated.sealFee || "",
      docsFee: migrated.docsFee || "",
      lssFee: migrated.lssFee || "",
      storageCost: migrated.storageCost || "",
      arrastre: migrated.arrastre || "",
      shutOut: migrated.shutOut || "",
      royaltyFee: migrated.royaltyFee || "",
      lona: migrated.lona || "",
      lalamove: migrated.lalamove || "",
      bir: migrated.bir || "",
      labor: migrated.labor || "",
      otherCharges: migrated.otherCharges || "",
      createdAt: migrated.createdAt || new Date().toISOString(),
      updatedAt: migrated.updatedAt || new Date().toISOString(),
    };
    migrated = { ...migrated, segments: [defaultSegment] };
    dirty = true;
  }

  if (dirty) {
    await kv.set(`export_booking:${id}`, migrated);
  }
  return migrated;
}

/** Sync top-level fields from segments[0] for backward compatibility */
function syncTopLevelFromSegment0(booking: any): any {
  const seg = booking.segments?.[0];
  if (!seg) return booking;
  return {
    ...booking,
    origin: seg.origin,
    pod: seg.pod,
    destination: seg.destination,
    vesselVoyage: seg.vesselVoyage,
    shippingLine: seg.shippingLine,
    etd: seg.etd,
    etdTime: seg.etdTime,
    atd: seg.atd,
    atdTime: seg.atdTime,
    eta: seg.eta,
    etaTime: seg.etaTime,
    vesselStatus: seg.vesselStatus,
    lctEdArrastre: seg.lctEdArrastre,
    lctEdArrastreTime: seg.lctEdArrastreTime,
    lctCargo: seg.lctCargo,
    lctCargoTime: seg.lctCargoTime,
    blNumber: seg.blNumber,
    mblMawb: seg.mblMawb,
    domesticFreight: seg.domesticFreight,
    hustlingStripping: seg.hustlingStripping,
    forkliftOperator: seg.forkliftOperator,
    exportDivision: seg.exportDivision,
    lodgmentCdsFee: seg.lodgmentCdsFee,
    formE: seg.formE,
    oceanFreight: seg.oceanFreight,
    sealFee: seg.sealFee,
    docsFee: seg.docsFee,
    lssFee: seg.lssFee,
    storageCost: seg.storageCost,
    arrastre: seg.arrastre,
    shutOut: seg.shutOut,
    royaltyFee: seg.royaltyFee,
    lona: seg.lona,
    lalamove: seg.lalamove,
    bir: seg.bir,
    labor: seg.labor,
    otherCharges: seg.otherCharges,
  };
}

function getLinkedBookingPrefix(linkedBookingType?: string): "import_booking:" | "export_booking:" | null {
  const type = String(linkedBookingType || "").toLowerCase();
  if (type.includes("import")) return "import_booking:";
  if (type.includes("export")) return "export_booking:";
  return null;
}

async function fetchLinkedBooking(record: any): Promise<any | null> {
  if (!record?.linkedBookingId) return null;
  const prefix = getLinkedBookingPrefix(record?.linkedBookingType);
  if (!prefix) return null;
  const booking = await kv.get(`${prefix}${record.linkedBookingId}`);
  if (!booking) return null;

  if (prefix === "import_booking:") {
    return await migrateImportBookingIfNeeded(booking, record.linkedBookingId);
  }
  return await migrateExportBookingIfNeeded(booking, record.linkedBookingId);
}

async function migrateShipmentTagsFromTruckingRemarks(record: any): Promise<any> {
  if (!record || !Array.isArray(record.remarks) || !record.linkedBookingId) return record;
  const prefix = getLinkedBookingPrefix(record.linkedBookingType);
  if (!prefix) return record;

  const shipmentTags = dedupeTags(record.remarks.filter((tag: string) => SHIPMENT_TAG_KEYS.has(tag)));
  if (shipmentTags.length === 0) return record;

  const operationalTags = dedupeTags(record.remarks.filter((tag: string) => !SHIPMENT_TAG_KEYS.has(tag)));
  const linkedBooking = await kv.get(`${prefix}${record.linkedBookingId}`);
  if (!linkedBooking) return record;

  const migratedBooking =
    prefix === "import_booking:"
      ? await migrateImportBookingIfNeeded(linkedBooking, record.linkedBookingId)
      : await migrateExportBookingIfNeeded(linkedBooking, record.linkedBookingId);

  const mergedShipmentTags = dedupeTags([...(migratedBooking.shipmentTags || []), ...shipmentTags]);
  const mergedHistory = [
    ...(migratedBooking.tagHistory || []),
    ...createTagHistoryEntries(
      migratedBooking.shipmentTags || [],
      mergedShipmentTags,
      "System migration",
      "shipment",
    ),
  ];
  const updatedBooking = {
    ...migratedBooking,
    shipmentTags: mergedShipmentTags,
    tagHistory: mergedHistory,
    updatedAt: new Date().toISOString(),
  };
  await kv.set(`${prefix}${record.linkedBookingId}`, updatedBooking);

  const updatedRecord = {
    ...record,
    remarks: operationalTags,
    updatedAt: new Date().toISOString(),
  };
  await kv.set(`trucking-record:${record.id}`, updatedRecord);
  return updatedRecord;
}

async function enrichTruckingRecordWithLinkedTags(record: any): Promise<any> {
  const migratedRecord = await migrateShipmentTagsFromTruckingRemarks(record);
  const linkedBooking = await fetchLinkedBooking(migratedRecord);
  if (!linkedBooking) {
    return {
      ...migratedRecord,
      linkedBookingShipmentTags: [],
      linkedBookingTagHistory: [],
    };
  }
  return {
    ...migratedRecord,
    linkedBookingShipmentTags: linkedBooking.shipmentTags || [],
    linkedBookingTagHistory: linkedBooking.tagHistory || [],
  };
}

// ==================== EXPORT BOOKINGS ====================

// Get all export bookings
app.get("/make-server-ce0d67b8/export-bookings", async (c) => {
  try {
    const bookingsRaw = await kv.getByPrefix("export_booking:");
    const bookings = await Promise.all(
      bookingsRaw.map((booking: any) => migrateExportBookingIfNeeded(booking, booking.bookingId || booking.id)),
    );
    
    // Sort by createdAt descending (newest first)
    bookings.sort((a: any, b: any) => 
      new Date(b.createdAt || b.created_at).getTime() - new Date(a.createdAt || a.created_at).getTime()
    );
    
    console.log(`Fetched ${bookings.length} export bookings`);
    
    return c.json({ success: true, data: bookings });
  } catch (error) {
    console.error("Error fetching export bookings:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get single export booking
app.get("/make-server-ce0d67b8/export-bookings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const bookingRaw = await kv.get(`export_booking:${id}`);
    
    if (!bookingRaw) {
      return c.json({ success: false, error: "Booking not found" }, 404);
    }
    const booking = await migrateExportBookingIfNeeded(bookingRaw, id);
    return c.json({ success: true, data: booking });
  } catch (error) {
    console.error("Error fetching export booking:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create export booking
app.post("/make-server-ce0d67b8/export-bookings", async (c) => {
  try {
    const bookingData = await c.req.json();

    // Generate booking ID using lowest-gap sequence — EXP {year}-{number}
    let bookingId = bookingData.bookingId;
    if (!bookingId) {
      const expYear = new Date().getFullYear();
      const expPrefix = `EXP ${expYear}-`;
      const allExports = await kv.getByPrefix("export_booking:");
      const usedNumbers = new Set(allExports.map((b: any) => {
        const ref = b.bookingId || "";
        if (!ref.startsWith(expPrefix)) return null;
        const n = parseInt(ref.slice(expPrefix.length), 10);
        return isNaN(n) ? null : n;
      }).filter((n: any) => n !== null));
      let next = 1;
      while (usedNumbers.has(next)) next++;
      bookingId = `${expPrefix}${next}`;
    }

    // Uniqueness check
    const allExports2 = await kv.getByPrefix("export_booking:");
    const duplicate = allExports2.find((b: any) => b.bookingId === bookingId);
    if (duplicate) {
      return c.json({ success: false, error: `Reference number ${bookingId} is already in use by another active record.` }, 409);
    }

    const timestamp = new Date().toISOString();

    const newBooking = {
      ...bookingData,
      bookingId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await kv.set(`export_booking:${bookingId}`, newBooking);

    console.log(`Created export booking ${bookingId}`);

    return c.json({ success: true, data: newBooking });
  } catch (error) {
    console.error("Error creating export booking:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== EXPORT DOCUMENT GENERATORS ====================
// NOTE: These routes MUST be registered before the generic PUT /export-bookings/:id
// route below, otherwise Hono's order-dependent matching will swallow /documents/:docType

app.get("/make-server-ce0d67b8/export-bookings/:id/documents", async (c) => {
  try {
    const id = decodeURIComponent(c.req.param("id"));
    const booking = await kv.get(`export_booking:${id}`);
    if (!booking) return c.json({ success: false, error: "Booking not found" }, 404);
    return c.json({ success: true, data: booking.exportDocuments || {} });
  } catch (error) {
    console.error("Error fetching export documents:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.put("/make-server-ce0d67b8/export-bookings/:id/documents/:docType", async (c) => {
  try {
    const id = decodeURIComponent(c.req.param("id"));
    const docType = c.req.param("docType");
    const body = await c.req.json();

    const validTypes = ["sales-contract", "commercial-invoice", "packing-list", "declaration", "form-e"];
    if (!validTypes.includes(docType)) {
      return c.json({ success: false, error: `Invalid document type: ${docType}` }, 400);
    }

    const booking = await kv.get(`export_booking:${id}`);
    if (!booking) return c.json({ success: false, error: "Booking not found" }, 404);

    const docs = booking.exportDocuments || {};
    const camelKey = docType === "sales-contract" ? "salesContract"
      : docType === "commercial-invoice" ? "commercialInvoice"
      : docType === "packing-list" ? "packingList"
      : docType === "form-e" ? "formE"
      : "declaration";

    const now = new Date().toISOString();
    const existing = docs[camelKey];

    if (existing) {
      docs[camelKey] = { ...existing, ...body, createdAt: existing.createdAt, updatedAt: now };
    } else {
      docs[camelKey] = { ...body, createdAt: now, updatedAt: now };
    }

    // Sync ref number across all 4 documents when any one is saved
    const savedRefNo = camelKey === "commercialInvoice"
      ? docs[camelKey].invoiceNo
      : docs[camelKey].refNo;
    if (savedRefNo) {
      if (docs.salesContract) docs.salesContract.refNo = savedRefNo;
      if (docs.commercialInvoice) docs.commercialInvoice.invoiceNo = savedRefNo;
      if (docs.declaration) docs.declaration.refNo = savedRefNo;
      if (docs.packingList) docs.packingList.refNo = savedRefNo;
    }

    booking.exportDocuments = docs;
    booking.updatedAt = now;
    await kv.set(`export_booking:${id}`, booking);

    console.log(`${existing ? "Updated" : "Created"} ${docType} for export booking ${id}`);
    return c.json({ success: true, data: docs[camelKey] });
  } catch (error) {
    console.error("Error saving export document:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.delete("/make-server-ce0d67b8/export-bookings/:id/documents/:docType", async (c) => {
  try {
    const id = decodeURIComponent(c.req.param("id"));
    const docType = c.req.param("docType");

    const validTypes = ["sales-contract", "commercial-invoice", "packing-list", "declaration", "form-e"];
    if (!validTypes.includes(docType)) {
      return c.json({ success: false, error: `Invalid document type: ${docType}` }, 400);
    }

    const booking = await kv.get(`export_booking:${id}`);
    if (!booking) return c.json({ success: false, error: "Booking not found" }, 404);

    const docs = booking.exportDocuments || {};
    const camelKey = docType === "sales-contract" ? "salesContract"
      : docType === "commercial-invoice" ? "commercialInvoice"
      : docType === "packing-list" ? "packingList"
      : docType === "form-e" ? "formE"
      : "declaration";

    delete docs[camelKey];
    booking.exportDocuments = docs;
    booking.updatedAt = new Date().toISOString();
    await kv.set(`export_booking:${id}`, booking);

    console.log(`Deleted ${docType} for export booking ${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting export document:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update export booking
app.put("/make-server-ce0d67b8/export-bookings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();

    const existing = await kv.get(`export_booking:${id}`);

    if (!existing) {
      return c.json({ success: false, error: "Booking not found" }, 404);
    }

    // If bookingId is being changed, validate uniqueness
    const newBookingId = updates.bookingId || id;
    if (newBookingId !== id) {
      const allExports = await kv.getByPrefix("export_booking:");
      const duplicate = allExports.find((b: any) => b.bookingId === newBookingId);
      if (duplicate) {
        return c.json({ success: false, error: `Reference number ${newBookingId} is already in use by another active record.` }, 409);
      }
    }

    const updated = {
      ...existing,
      ...updates,
      bookingId: newBookingId,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    if (newBookingId !== id) {
      await kv.delete(`export_booking:${id}`);
    }
    await kv.set(`export_booking:${newBookingId}`, updated);

    console.log(`Updated export booking ${id}${newBookingId !== id ? ` -> ${newBookingId}` : ""}`);

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating export booking:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.put("/make-server-ce0d67b8/export-bookings/:id/shipment-tags", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const newTags = dedupeTags(Array.isArray(body.shipmentTags) ? body.shipmentTags : []);
    const user = String(body.user || "Unknown");

    const existingRaw = await kv.get(`export_booking:${id}`);
    if (!existingRaw) {
      return c.json({ success: false, error: "Booking not found" }, 404);
    }
    const existing = await migrateExportBookingIfNeeded(existingRaw, id);

    const oldTags = dedupeTags(existing.shipmentTags || []);
    const historyEntries = createTagHistoryEntries(oldTags, newTags, user, "shipment");
    const updated = {
      ...existing,
      shipmentTags: newTags,
      tagHistory: [...(existing.tagHistory || []), ...historyEntries],
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`export_booking:${id}`, updated);

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating export booking shipment tags:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== EXPORT BOOKING SEGMENTS ====================

// Add a new segment to an export booking
app.post("/make-server-ce0d67b8/export-bookings/:id/segments", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    const existingRaw = await kv.get(`export_booking:${id}`);
    if (!existingRaw) return c.json({ success: false, error: "Booking not found" }, 404);
    const existing = await migrateExportBookingIfNeeded(existingRaw, id);

    const segments = Array.isArray(existing.segments) ? existing.segments : [];
    const maxOrder = segments.reduce((max: number, s: any) => Math.max(max, s.legOrder || 0), 0);

    const newSegment = {
      segmentId: body.segmentId || crypto.randomUUID(),
      segmentLabel: body.segmentLabel || `Leg ${maxOrder + 1}`,
      legOrder: maxOrder + 1,
      containerNos: Array.isArray(body.containerNos) ? body.containerNos : [],
      origin: body.origin || "",
      pod: body.pod || "",
      destination: body.destination || "",
      vesselVoyage: body.vesselVoyage || "",
      shippingLine: body.shippingLine || "",
      etd: body.etd || "", etdTime: body.etdTime || "",
      atd: body.atd || "", atdTime: body.atdTime || "",
      eta: body.eta || "", etaTime: body.etaTime || "",
      vesselStatus: body.vesselStatus || "",
      lctEdArrastre: body.lctEdArrastre || "", lctEdArrastreTime: body.lctEdArrastreTime || "",
      lctCargo: body.lctCargo || "", lctCargoTime: body.lctCargoTime || "",
      blNumber: body.blNumber || "", mblMawb: body.mblMawb || "",
      domesticFreight: body.domesticFreight || "", hustlingStripping: body.hustlingStripping || "",
      forkliftOperator: body.forkliftOperator || "",
      exportDivision: body.exportDivision || "", lodgmentCdsFee: body.lodgmentCdsFee || "",
      formE: body.formE || "",
      oceanFreight: body.oceanFreight || "", sealFee: body.sealFee || "",
      docsFee: body.docsFee || "", lssFee: body.lssFee || "", storageCost: body.storageCost || "",
      arrastre: body.arrastre || "", shutOut: body.shutOut || "",
      royaltyFee: body.royaltyFee || "", lona: body.lona || "",
      lalamove: body.lalamove || "", bir: body.bir || "",
      labor: body.labor || "", otherCharges: body.otherCharges || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = {
      ...existing,
      segments: [...segments, newSegment],
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`export_booking:${id}`, syncTopLevelFromSegment0(updated));

    console.log(`Added segment ${newSegment.segmentId} to export booking ${id}`);
    return c.json({ success: true, data: newSegment });
  } catch (error) {
    console.error("Error adding segment:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update a segment within an export booking
app.put("/make-server-ce0d67b8/export-bookings/:id/segments/:segmentId", async (c) => {
  try {
    const id = c.req.param("id");
    const segmentId = c.req.param("segmentId");
    const updates = await c.req.json();

    const existingRaw = await kv.get(`export_booking:${id}`);
    if (!existingRaw) return c.json({ success: false, error: "Booking not found" }, 404);
    const existing = await migrateExportBookingIfNeeded(existingRaw, id);

    const segments = Array.isArray(existing.segments) ? existing.segments : [];
    const segIdx = segments.findIndex((s: any) => s.segmentId === segmentId);
    if (segIdx === -1) return c.json({ success: false, error: "Segment not found" }, 404);

    segments[segIdx] = { ...segments[segIdx], ...updates, segmentId, updatedAt: new Date().toISOString() };

    const updated = { ...existing, segments, updatedAt: new Date().toISOString() };
    await kv.set(`export_booking:${id}`, syncTopLevelFromSegment0(updated));

    console.log(`Updated segment ${segmentId} in export booking ${id}`);
    return c.json({ success: true, data: segments[segIdx] });
  } catch (error) {
    console.error("Error updating segment:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete a segment from an export booking (minimum 1 must remain)
app.delete("/make-server-ce0d67b8/export-bookings/:id/segments/:segmentId", async (c) => {
  try {
    const id = c.req.param("id");
    const segmentId = c.req.param("segmentId");

    const existingRaw = await kv.get(`export_booking:${id}`);
    if (!existingRaw) return c.json({ success: false, error: "Booking not found" }, 404);
    const existing = await migrateExportBookingIfNeeded(existingRaw, id);

    const segments = Array.isArray(existing.segments) ? existing.segments : [];
    if (segments.length <= 1) return c.json({ success: false, error: "Cannot delete the last segment" }, 400);

    const filtered = segments.filter((s: any) => s.segmentId !== segmentId);
    if (filtered.length === segments.length) return c.json({ success: false, error: "Segment not found" }, 404);

    // Re-number legOrder
    filtered.sort((a: any, b: any) => (a.legOrder || 0) - (b.legOrder || 0));
    filtered.forEach((s: any, i: number) => { s.legOrder = i + 1; });

    const updated = { ...existing, segments: filtered, updatedAt: new Date().toISOString() };
    await kv.set(`export_booking:${id}`, syncTopLevelFromSegment0(updated));

    console.log(`Deleted segment ${segmentId} from export booking ${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting segment:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete export booking
app.delete("/make-server-ce0d67b8/export-bookings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    const existing = await kv.get(`export_booking:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Booking not found" }, 404);
    }
    
    // Unlink from project if linked
    if (existing.projectId) {
      const project = await kv.get(`project:${existing.projectId}`);
      if (project && project.linkedBookings) {
        project.linkedBookings = project.linkedBookings.filter((b: any) => b.bookingId !== id);
        
        // Recalculate booking status
        const totalServices = project.services?.length || 0;
        const bookedServices = new Set(project.linkedBookings.map((b: any) => b.serviceType)).size;
        
        if (bookedServices === 0) {
          project.booking_status = "No Bookings Yet";
        } else if (bookedServices >= totalServices) {
          project.booking_status = "Fully Booked";
        } else {
          project.booking_status = "Partially Booked";
        }
        
        project.updated_at = new Date().toISOString();
        await kv.set(`project:${existing.projectId}`, project);
        console.log(`Unlinked booking ${id} from project ${existing.projectId}`);
      }
    }
    
    await kv.del(`export_booking:${id}`);
    
    // Also delete associated billings and expenses
    const billings = await kv.getByPrefix(`billing:`);
    const expenses = await kv.getByPrefix(`expense:`);
    
    for (const billing of billings) {
      if (billing.bookingId === id) {
        await kv.del(`billing:${billing.billingId}`);
      }
    }
    
    for (const expense of expenses) {
      if (expense.bookingId === id) {
        await kv.del(`expense:${expense.expenseId}`);
      }
    }
    
    console.log(`Deleted export booking ${id} and associated records`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting export booking:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== NEXT REFERENCE NUMBER ====================

// Returns the next available (lowest gap) number for a given ref type
app.get("/make-server-ce0d67b8/next-ref/:type", async (c) => {
  try {
    const type = c.req.param("type");
    // Optional query params for voucher/billing buckets
    const companyCode = c.req.query("companyCode") || "RVS";
    const voucherType = c.req.query("voucherType") || "CV";
    const year = c.req.query("year") || String(new Date().getFullYear());

    let nextNumber = 1;

    if (type === "import") {
      const prefix = `IMP ${year}-`;
      const all = await kv.getByPrefix("import_booking:");
      const used = new Set(all.map((b: any) => { const ref = b.bookingId || ""; if (!ref.startsWith(prefix)) return null; const n = parseInt(ref.slice(prefix.length), 10); return isNaN(n) ? null : n; }).filter((n: any) => n !== null));
      while (used.has(nextNumber)) nextNumber++;
    } else if (type === "export") {
      const prefix = `EXP ${year}-`;
      const all = await kv.getByPrefix("export_booking:");
      const used = new Set(all.map((b: any) => { const ref = b.bookingId || ""; if (!ref.startsWith(prefix)) return null; const n = parseInt(ref.slice(prefix.length), 10); return isNaN(n) ? null : n; }).filter((n: any) => n !== null));
      while (used.has(nextNumber)) nextNumber++;
    } else if (type === "trucking") {
      const prefix = `TRK ${year}-`;
      const all = await kv.getByPrefix("trucking-record:");
      const used = new Set(all.map((r: any) => { const ref = r.truckingRefNo || ""; if (!ref.startsWith(prefix)) return null; const n = parseInt(ref.slice(prefix.length), 10); return isNaN(n) ? null : n; }).filter((n: any) => n !== null));
      while (used.has(nextNumber)) nextNumber++;
    } else if (type === "collection") {
      const prefix = `COL ${year}-`;
      const all = await kv.getByPrefix("collection:");
      const used = new Set(all.map((r: any) => { const ref = r.collectionNumber || ""; if (!ref.startsWith(prefix)) return null; const n = parseInt(ref.slice(prefix.length), 10); return isNaN(n) ? null : n; }).filter((n: any) => n !== null));
      while (used.has(nextNumber)) nextNumber++;
    } else if (type === "voucher") {
      const all = await kvRetry(() => kv.getByPrefix("voucher:"));
      const prefix = `${companyCode} ${voucherType} ${year}-`;
      const used = new Set(all.map((v: any) => { const vn = v.voucherNumber || ""; if (!vn.startsWith(prefix)) return null; const n = parseInt(vn.slice(prefix.length), 10); return isNaN(n) ? null : n; }).filter((n: any) => n !== null));
      while (used.has(nextNumber)) nextNumber++;
    } else if (type === "billing") {
      const all = await kv.getByPrefix("billing:");
      const prefix = `${companyCode} ${year}-`;
      const used = new Set(all.map((b: any) => { const bn = b.billingNumber || ""; if (!bn.startsWith(prefix)) return null; const n = parseInt(bn.slice(prefix.length), 10); return isNaN(n) ? null : n; }).filter((n: any) => n !== null));
      while (used.has(nextNumber)) nextNumber++;
    } else if (type === "export-document") {
      const prefix = `${companyCode} ${year}-`;
      const all = await kv.getByPrefix("export_booking:");
      const used = new Set(all.map((b: any) => { const ref = b.exportDocuments?.salesContract?.refNo || ""; if (!ref.startsWith(prefix)) return null; const n = parseInt(ref.slice(prefix.length), 10); return isNaN(n) ? null : n; }).filter((n: any) => n !== null));
      while (used.has(nextNumber)) nextNumber++;
    } else {
      return c.json({ success: false, error: "Unknown type" }, 400);
    }

    return c.json({ success: true, nextNumber });
  } catch (error) {
    console.error("Error getting next ref:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== IMPORT BOOKINGS ====================

// Get all import bookings
app.get("/make-server-ce0d67b8/import-bookings", async (c) => {
  try {
    const bookingsRaw = await kv.getByPrefix("import_booking:");
    const bookings = await Promise.all(
      bookingsRaw.map((booking: any) => migrateImportBookingIfNeeded(booking, booking.bookingId || booking.id)),
    );
    
    // Sort by createdAt descending (newest first)
    bookings.sort((a: any, b: any) => 
      new Date(b.createdAt || b.created_at).getTime() - new Date(a.createdAt || a.created_at).getTime()
    );
    
    console.log(`Fetched ${bookings.length} import bookings`);
    
    return c.json({ success: true, data: bookings });
  } catch (error) {
    console.error("Error fetching import bookings:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get single import booking
app.get("/make-server-ce0d67b8/import-bookings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const bookingRaw = await kv.get(`import_booking:${id}`);
    
    if (!bookingRaw) {
      return c.json({ success: false, error: "Booking not found" }, 404);
    }
    const booking = await migrateImportBookingIfNeeded(bookingRaw, id);
    return c.json({ success: true, data: booking });
  } catch (error) {
    console.error("Error fetching import booking:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create import booking
app.post("/make-server-ce0d67b8/import-bookings", async (c) => {
  try {
    const bookingData = await c.req.json();

    // Generate booking ID using lowest-gap sequence — IMP {year}-{number}
    let bookingId = bookingData.bookingId;
    if (!bookingId) {
      const impYear = new Date().getFullYear();
      const impPrefix = `IMP ${impYear}-`;
      const allImports = await kv.getByPrefix("import_booking:");
      const usedNumbers = new Set(allImports.map((b: any) => {
        const ref = b.bookingId || "";
        if (!ref.startsWith(impPrefix)) return null;
        const n = parseInt(ref.slice(impPrefix.length), 10);
        return isNaN(n) ? null : n;
      }).filter((n: any) => n !== null));
      let next = 1;
      while (usedNumbers.has(next)) next++;
      bookingId = `${impPrefix}${next}`;
    }

    // Uniqueness check
    const allImports2 = await kv.getByPrefix("import_booking:");
    const duplicate = allImports2.find((b: any) => b.bookingId === bookingId);
    if (duplicate) {
      return c.json({ success: false, error: `Reference number ${bookingId} is already in use by another active record.` }, 409);
    }

    const timestamp = new Date().toISOString();

    const newBooking = {
      ...bookingData,
      bookingId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await kv.set(`import_booking:${bookingId}`, newBooking);

    console.log(`Created import booking ${bookingId}`);

    return c.json({ success: true, data: newBooking });
  } catch (error) {
    console.error("Error creating import booking:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update import booking
app.put("/make-server-ce0d67b8/import-bookings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();

    const existing = await kv.get(`import_booking:${id}`);

    if (!existing) {
      return c.json({ success: false, error: "Booking not found" }, 404);
    }

    // If bookingId is being changed, validate uniqueness
    const newBookingId = updates.bookingId || id;
    if (newBookingId !== id) {
      const allImports = await kv.getByPrefix("import_booking:");
      const duplicate = allImports.find((b: any) => b.bookingId === newBookingId);
      if (duplicate) {
        return c.json({ success: false, error: `Reference number ${newBookingId} is already in use by another active record.` }, 409);
      }
    }

    const updated = {
      ...existing,
      ...updates,
      bookingId: newBookingId,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    // If ID changed, delete old key and write new one
    if (newBookingId !== id) {
      await kv.delete(`import_booking:${id}`);
    }
    await kv.set(`import_booking:${newBookingId}`, updated);

    console.log(`Updated import booking ${id}${newBookingId !== id ? ` -> ${newBookingId}` : ""}`);

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating import booking:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.put("/make-server-ce0d67b8/import-bookings/:id/shipment-tags", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const newTags = dedupeTags(Array.isArray(body.shipmentTags) ? body.shipmentTags : []);
    const user = String(body.user || "Unknown");

    const existingRaw = await kv.get(`import_booking:${id}`);
    if (!existingRaw) {
      return c.json({ success: false, error: "Booking not found" }, 404);
    }
    const existing = await migrateImportBookingIfNeeded(existingRaw, id);

    const oldTags = dedupeTags(existing.shipmentTags || []);
    const historyEntries = createTagHistoryEntries(oldTags, newTags, user, "shipment");
    const updated = {
      ...existing,
      shipmentTags: newTags,
      tagHistory: [...(existing.tagHistory || []), ...historyEntries],
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`import_booking:${id}`, updated);

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating import booking shipment tags:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete import booking
app.delete("/make-server-ce0d67b8/import-bookings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    const existing = await kv.get(`import_booking:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Booking not found" }, 404);
    }
    
    // Unlink from project if linked
    if (existing.projectId) {
      const project = await kv.get(`project:${existing.projectId}`);
      if (project && project.linkedBookings) {
        project.linkedBookings = project.linkedBookings.filter((b: any) => b.bookingId !== id);
        
        // Recalculate booking status
        const totalServices = project.services?.length || 0;
        const bookedServices = new Set(project.linkedBookings.map((b: any) => b.serviceType)).size;
        
        if (bookedServices === 0) {
          project.booking_status = "No Bookings Yet";
        } else if (bookedServices >= totalServices) {
          project.booking_status = "Fully Booked";
        } else {
          project.booking_status = "Partially Booked";
        }
        
        project.updated_at = new Date().toISOString();
        await kv.set(`project:${existing.projectId}`, project);
        console.log(`Unlinked booking ${id} from project ${existing.projectId}`);
      }
    }
    
    await kv.del(`import_booking:${id}`);
    
    // Also delete associated billings and expenses
    const billings = await kv.getByPrefix(`billing:`);
    const expenses = await kv.getByPrefix(`expense:`);
    
    for (const billing of billings) {
      if (billing.bookingId === id) {
        await kv.del(`billing:${billing.billingId}`);
      }
    }
    
    for (const expense of expenses) {
      if (expense.bookingId === id) {
        await kv.del(`expense:${expense.expenseId}`);
      }
    }
    
    console.log(`Deleted import booking ${id} and associated records`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting import booking:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== TRUCKING BOOKINGS ====================

// Get all trucking bookings
app.get("/make-server-ce0d67b8/trucking-bookings", async (c) => {
  try {
    const bookings = await kv.getByPrefix("trucking_booking:");
    
    // Sort by createdAt descending (newest first)
    bookings.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    console.log(`Retrieved ${bookings.length} trucking bookings`);
    
    return c.json({ success: true, data: bookings });
  } catch (error) {
    console.error("Error fetching trucking bookings:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get single trucking booking
app.get("/make-server-ce0d67b8/trucking-bookings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const booking = await kv.get(`trucking_booking:${id}`);
    
    if (!booking) {
      return c.json({ success: false, error: "Booking not found" }, 404);
    }
    
    return c.json({ success: true, data: booking });
  } catch (error) {
    console.error("Error fetching trucking booking:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create trucking booking
app.post("/make-server-ce0d67b8/trucking-bookings", async (c) => {
  try {
    const bookingData = await c.req.json();
    
    // Get counter for booking number
    const counter = await kv.get("trucking_booking_counter") || 0;
    const newCounter = counter + 1;
    await kv.set("trucking_booking_counter", newCounter);
    
    // Generate booking ID: TRK-YYYY-NNN
    const year = new Date().getFullYear();
    const bookingId = `TRK-${year}-${String(newCounter).padStart(3, '0')}`;
    
    const timestamp = new Date().toISOString();
    
    const newBooking = {
      ...bookingData,
      bookingId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    
    await kv.set(`trucking_booking:${bookingId}`, newBooking);
    
    console.log(`Created trucking booking ${bookingId}`);
    
    return c.json({ success: true, data: newBooking });
  } catch (error) {
    console.error("Error creating trucking booking:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update trucking booking
app.put("/make-server-ce0d67b8/trucking-bookings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    
    const existing = await kv.get(`trucking_booking:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Booking not found" }, 404);
    }
    
    const updated = {
      ...existing,
      ...updates,
      bookingId: id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`trucking_booking:${id}`, updated);
    
    console.log(`Updated trucking booking ${id}`);
    
    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating trucking booking:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete trucking booking
app.delete("/make-server-ce0d67b8/trucking-bookings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    const existing = await kv.get(`trucking_booking:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Booking not found" }, 404);
    }
    
    // Unlink from project if linked
    if (existing.projectId) {
      const project = await kv.get(`project:${existing.projectId}`);
      if (project && project.linkedBookings) {
        project.linkedBookings = project.linkedBookings.filter((b: any) => b.bookingId !== id);
        
        // Recalculate booking status
        const totalServices = project.services?.length || 0;
        const bookedServices = new Set(project.linkedBookings.map((b: any) => b.serviceType)).size;
        
        if (bookedServices === 0) {
          project.booking_status = "No Bookings Yet";
        } else if (bookedServices >= totalServices) {
          project.booking_status = "Fully Booked";
        } else {
          project.booking_status = "Partially Booked";
        }
        
        project.updated_at = new Date().toISOString();
        await kv.set(`project:${existing.projectId}`, project);
        console.log(`Unlinked booking ${id} from project ${existing.projectId}`);
      }
    }
    
    await kv.del(`trucking_booking:${id}`);
    
    // Also delete associated billings and expenses
    const billings = await kv.getByPrefix(`billing:`);
    const expenses = await kv.getByPrefix(`expense:`);
    
    for (const billing of billings) {
      if (billing.bookingId === id) {
        await kv.del(`billing:${billing.billingId}`);
      }
    }
    
    for (const expense of expenses) {
      if (expense.bookingId === id) {
        await kv.del(`expense:${expense.expenseId}`);
      }
    }
    
    console.log(`Deleted trucking booking ${id} and associated records`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting trucking booking:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== TRUCKING LEGS ====================

// Get trucking legs for a booking
app.get("/make-server-ce0d67b8/trucking-legs", async (c) => {
  try {
    const bookingId = c.req.query("bookingId");
    const bookingType = c.req.query("bookingType");
    
    if (!bookingId || !bookingType) {
      return c.json({ success: false, error: "bookingId and bookingType are required" }, 400);
    }
    
    const allLegs = await kv.getByPrefix("trucking_leg:");
    
    // Filter by parent booking
    const filteredLegs = allLegs.filter((leg: any) => 
      leg.parentBookingId === bookingId && leg.parentBookingType === bookingType
    );
    
    // Sort by createdAt descending (newest first)
    filteredLegs.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    console.log(`Retrieved ${filteredLegs.length} trucking legs for ${bookingType} booking ${bookingId}`);
    
    return c.json({ success: true, data: filteredLegs });
  } catch (error) {
    console.error("Error fetching trucking legs:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get single trucking leg
app.get("/make-server-ce0d67b8/trucking-legs/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const leg = await kv.get(`trucking_leg:${id}`);
    
    if (!leg) {
      return c.json({ success: false, error: "Trucking leg not found" }, 404);
    }
    
    return c.json({ success: true, data: leg });
  } catch (error) {
    console.error("Error fetching trucking leg:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create trucking leg
app.post("/make-server-ce0d67b8/trucking-legs", async (c) => {
  try {
    const legData = await c.req.json();
    
    // Get counter for trucking leg ID
    const counter = await kv.get("trucking_leg_counter") || 0;
    const newCounter = counter + 1;
    await kv.set("trucking_leg_counter", newCounter);
    
    // Generate trucking leg ID: TLEG-YYYY-NNN
    const year = new Date().getFullYear();
    const legId = `TLEG-${year}-${String(newCounter).padStart(3, '0')}`;
    
    const timestamp = new Date().toISOString();
    
    const newLeg = {
      ...legData,
      truckingLegId: legId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    
    await kv.set(`trucking_leg:${legId}`, newLeg);
    
    console.log(`Created trucking leg ${legId} for ${legData.parentBookingType} booking ${legData.parentBookingId}`);
    
    return c.json({ success: true, data: newLeg });
  } catch (error) {
    console.error("Error creating trucking leg:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update trucking leg
app.put("/make-server-ce0d67b8/trucking-legs/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    
    const existing = await kv.get(`trucking_leg:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Trucking leg not found" }, 404);
    }
    
    const updated = {
      ...existing,
      ...updates,
      truckingLegId: id,
      parentBookingId: existing.parentBookingId, // Don't allow changing parent
      parentBookingType: existing.parentBookingType, // Don't allow changing parent type
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`trucking_leg:${id}`, updated);
    
    console.log(`Updated trucking leg ${id}`);
    
    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating trucking leg:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete trucking leg
app.delete("/make-server-ce0d67b8/trucking-legs/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    const existing = await kv.get(`trucking_leg:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Trucking leg not found" }, 404);
    }
    
    await kv.del(`trucking_leg:${id}`);
    
    console.log(`Deleted trucking leg ${id}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting trucking leg:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== MARINE INSURANCE BOOKINGS ====================

// Get all marine insurance bookings
app.get("/make-server-ce0d67b8/marine-insurance-bookings", async (c) => {
  try {
    const bookings = await kv.getByPrefix("marine_insurance_booking:");
    
    // Sort by createdAt descending (newest first)
    bookings.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    console.log(`Retrieved ${bookings.length} marine insurance bookings`);
    
    return c.json({ success: true, data: bookings });
  } catch (error) {
    console.error("Error fetching marine insurance bookings:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get single marine insurance booking
app.get("/make-server-ce0d67b8/marine-insurance-bookings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const booking = await kv.get(`marine_insurance_booking:${id}`);
    
    if (!booking) {
      return c.json({ success: false, error: "Booking not found" }, 404);
    }
    
    return c.json({ success: true, data: booking });
  } catch (error) {
    console.error("Error fetching marine insurance booking:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create marine insurance booking
app.post("/make-server-ce0d67b8/marine-insurance-bookings", async (c) => {
  try {
    const bookingData = await c.req.json();
    
    // Get counter for booking number
    const counter = await kv.get("marine_insurance_booking_counter") || 0;
    const newCounter = counter + 1;
    await kv.set("marine_insurance_booking_counter", newCounter);
    
    // Generate booking ID: INS-YYYY-NNN
    const year = new Date().getFullYear();
    const bookingId = `INS-${year}-${String(newCounter).padStart(3, '0')}`;
    
    const timestamp = new Date().toISOString();
    
    const newBooking = {
      ...bookingData,
      bookingId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    
    await kv.set(`marine_insurance_booking:${bookingId}`, newBooking);
    
    console.log(`Created marine insurance booking ${bookingId}`);
    
    return c.json({ success: true, data: newBooking });
  } catch (error) {
    console.error("Error creating marine insurance booking:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update marine insurance booking
app.put("/make-server-ce0d67b8/marine-insurance-bookings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    
    const existing = await kv.get(`marine_insurance_booking:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Booking not found" }, 404);
    }
    
    const updated = {
      ...existing,
      ...updates,
      bookingId: id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`marine_insurance_booking:${id}`, updated);
    
    console.log(`Updated marine insurance booking ${id}`);
    
    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating marine insurance booking:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete marine insurance booking
app.delete("/make-server-ce0d67b8/marine-insurance-bookings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    const existing = await kv.get(`marine_insurance_booking:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Booking not found" }, 404);
    }
    
    // Unlink from project if linked
    if (existing.projectId) {
      const project = await kv.get(`project:${existing.projectId}`);
      if (project && project.linkedBookings) {
        project.linkedBookings = project.linkedBookings.filter((b: any) => b.bookingId !== id);
        
        // Recalculate booking status
        const totalServices = project.services?.length || 0;
        const bookedServices = new Set(project.linkedBookings.map((b: any) => b.serviceType)).size;
        
        if (bookedServices === 0) {
          project.booking_status = "No Bookings Yet";
        } else if (bookedServices >= totalServices) {
          project.booking_status = "Fully Booked";
        } else {
          project.booking_status = "Partially Booked";
        }
        
        project.updated_at = new Date().toISOString();
        await kv.set(`project:${existing.projectId}`, project);
        console.log(`Unlinked booking ${id} from project ${existing.projectId}`);
      }
    }
    
    await kv.del(`marine_insurance_booking:${id}`);
    
    // Also delete associated billings and expenses
    const billings = await kv.getByPrefix(`billing:`);
    const expenses = await kv.getByPrefix(`expense:`);
    
    for (const billing of billings) {
      if (billing.bookingId === id) {
        await kv.del(`billing:${billing.billingId}`);
      }
    }
    
    for (const expense of expenses) {
      if (expense.bookingId === id) {
        await kv.del(`expense:${expense.expenseId}`);
      }
    }
    
    console.log(`Deleted marine insurance booking ${id} and associated records`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting marine insurance booking:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== OTHERS BOOKINGS ====================

// Get all others bookings
app.get("/make-server-ce0d67b8/others-bookings", async (c) => {
  try {
    const bookings = await kv.getByPrefix("others_booking:");
    
    // Sort by createdAt descending (newest first)
    bookings.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    console.log(`Retrieved ${bookings.length} others bookings`);
    
    return c.json({ success: true, data: bookings });
  } catch (error) {
    console.error("Error fetching others bookings:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get single others booking
app.get("/make-server-ce0d67b8/others-bookings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const booking = await kv.get(`others_booking:${id}`);
    
    if (!booking) {
      return c.json({ success: false, error: "Booking not found" }, 404);
    }
    
    return c.json({ success: true, data: booking });
  } catch (error) {
    console.error("Error fetching others booking:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create others booking
app.post("/make-server-ce0d67b8/others-bookings", async (c) => {
  try {
    const bookingData = await c.req.json();
    
    // Get counter for booking number
    const counter = await kv.get("others_booking_counter") || 0;
    const newCounter = counter + 1;
    await kv.set("others_booking_counter", newCounter);
    
    // Generate booking ID: OTH-YYYY-NNN
    const year = new Date().getFullYear();
    const bookingId = `OTH-${year}-${String(newCounter).padStart(3, '0')}`;
    
    const timestamp = new Date().toISOString();
    
    const newBooking = {
      ...bookingData,
      bookingId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    
    await kv.set(`others_booking:${bookingId}`, newBooking);
    
    console.log(`Created others booking ${bookingId}`);
    
    return c.json({ success: true, data: newBooking });
  } catch (error) {
    console.error("Error creating others booking:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update others booking
app.put("/make-server-ce0d67b8/others-bookings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    
    const existing = await kv.get(`others_booking:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Booking not found" }, 404);
    }
    
    const updated = {
      ...existing,
      ...updates,
      bookingId: id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`others_booking:${id}`, updated);
    
    console.log(`Updated others booking ${id}`);
    
    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating others booking:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete others booking
app.delete("/make-server-ce0d67b8/others-bookings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    const existing = await kv.get(`others_booking:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Booking not found" }, 404);
    }
    
    // Unlink from project if linked
    if (existing.projectId) {
      const project = await kv.get(`project:${existing.projectId}`);
      if (project && project.linkedBookings) {
        project.linkedBookings = project.linkedBookings.filter((b: any) => b.bookingId !== id);
        
        // Recalculate booking status
        const totalServices = project.services?.length || 0;
        const bookedServices = new Set(project.linkedBookings.map((b: any) => b.serviceType)).size;
        
        if (bookedServices === 0) {
          project.booking_status = "No Bookings Yet";
        } else if (bookedServices >= totalServices) {
          project.booking_status = "Fully Booked";
        } else {
          project.booking_status = "Partially Booked";
        }
        
        project.updated_at = new Date().toISOString();
        await kv.set(`project:${existing.projectId}`, project);
        console.log(`Unlinked booking ${id} from project ${existing.projectId}`);
      }
    }
    
    await kv.del(`others_booking:${id}`);
    
    // Also delete associated billings and expenses
    const billings = await kv.getByPrefix(`billing:`);
    const expenses = await kv.getByPrefix(`expense:`);
    
    for (const billing of billings) {
      if (billing.bookingId === id) {
        await kv.del(`billing:${billing.billingId}`);
      }
    }
    
    for (const expense of expenses) {
      if (expense.bookingId === id) {
        await kv.del(`expense:${expense.expenseId}`);
      }
    }
    
    console.log(`Deleted others booking ${id} and associated records`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting others booking:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== BILLINGS ====================

// Get billings by booking ID or project ID
app.get("/make-server-ce0d67b8/billings", async (c) => {
  try {
    const bookingId = c.req.query("bookingId");
    const projectId = c.req.query("projectId");
    const bookingNumber = c.req.query("bookingNumber");
    
    const allBillings = await kv.getByPrefix("billing:");
    const allCollections = await kv.getByPrefix("collection:");
    
    // Fetch all bookings to resolve booking numbers for display
    const [
      genBookings,
      expBookings,
      impBookings,
      fwdBookings,
      trkBookings,
      brkBookings,
      marBookings,
      othBookings
    ] = await Promise.all([
      kv.getByPrefix("booking:"),
      kv.getByPrefix("export_booking:"),
      kv.getByPrefix("import_booking:"),
      kv.getByPrefix("forwarding_booking:"),
      kv.getByPrefix("trucking_booking:"),
      kv.getByPrefix("brokerage_booking:"),
      kv.getByPrefix("marine_insurance_booking:"),
      kv.getByPrefix("others_booking:")
    ]);

    const allBookingsMap = new Map();
    const addToMap = (list: any[]) => {
      list.forEach(b => {
        const display = b.trackingNumber || b.tracking_number || b.bookingNumber || b.booking_number || b.id;
        if (b.id) allBookingsMap.set(b.id, display);
        if (b.bookingId) allBookingsMap.set(b.bookingId, display);
      });
    };
    
    addToMap(genBookings);
    addToMap(expBookings);
    addToMap(impBookings);
    addToMap(fwdBookings);
    addToMap(trkBookings);
    addToMap(brkBookings);
    addToMap(marBookings);
    addToMap(othBookings);
    
    let filteredBillings = allBillings;
    
    // Filter by bookingId if provided (legacy support)
    if (bookingId) {
      console.log(`🔍 Filtering billings by bookingId: ${bookingId}`);
      console.log(`📊 Total billings before filter: ${allBillings.length}`);
      
      filteredBillings = allBillings.filter((b: any) => {
        const hasInArray = b.bookingIds && Array.isArray(b.bookingIds) && b.bookingIds.includes(bookingId);
        const hasLegacy = b.bookingId === bookingId;
        const matches = hasInArray || hasLegacy;
        
        if (matches) {
          console.log(`✅ Billing ${b.billingNumber} matches - bookingIds: ${JSON.stringify(b.bookingIds)}, bookingId: ${b.bookingId}`);
        }
        
        return matches;
      });
      
      console.log(`📊 Billings after filter: ${filteredBillings.length}`);
    }
    
    // Filter by bookingNumber if provided
    if (bookingNumber) {
      filteredBillings = allBillings.filter((b: any) => 
        b.bookingIds && Array.isArray(b.bookingIds) 
          ? b.bookingIds.includes(bookingNumber)
          : b.bookingId === bookingNumber || b.bookingNumber === bookingNumber
      );
    }
    
    // Filter by projectId if provided
    if (projectId) {
      filteredBillings = allBillings.filter((b: any) => b.projectId === projectId);
    }
    
    // Calculate outstanding for each billing (allocation-aware)
    const billingsWithOutstanding = filteredBillings.map((billing: any) => {
      const totalCollected = computeCollectedForBillingIds([billing.id], allCollections, "Collected");
      const outstanding = (billing.totalAmount || 0) - totalCollected;
      
      // Resolve Booking Number
      let resolvedBookingNumber = billing.bookingNumber;
      if (!resolvedBookingNumber) {
           if (billing.bookingIds && Array.isArray(billing.bookingIds) && billing.bookingIds.length > 0) {
               resolvedBookingNumber = billing.bookingIds
                   .map((id: string) => allBookingsMap.get(id))
                   .filter(Boolean)
                   .join(", ");
           } else if (billing.bookingId) {
               resolvedBookingNumber = allBookingsMap.get(billing.bookingId);
           }
      }

      return {
        ...billing,
        bookingNumber: resolvedBookingNumber, // Override/Set bookingNumber
        totalCollected,
        outstanding,
        pendingAmount: outstanding  // Add pendingAmount as alias for consistency
      };
    });
    
    // Sort by createdAt descending
    billingsWithOutstanding.sort((a: any, b: any) => 
      new Date(b.createdAt || b.created_at).getTime() - new Date(a.createdAt || a.created_at).getTime()
    );
    
    // Calculate totals for the filtered set
    const totalBilled = billingsWithOutstanding.reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0);
    const totalCollections = billingsWithOutstanding.reduce((sum: number, b: any) => sum + (b.totalCollected || 0), 0);
    const billingsOutstanding = totalBilled - totalCollections;
    
    console.log(`Fetched ${billingsWithOutstanding.length} billings ${bookingId ? `for booking ${bookingId}` : bookingNumber ? `for booking number ${bookingNumber}` : projectId ? `for project ${projectId}` : ''} - Total: ₱${totalBilled.toFixed(2)}, Collected: ₱${totalCollections.toFixed(2)}, Outstanding: ₱${billingsOutstanding.toFixed(2)}`);
    
    return c.json({ 
      success: true, 
      data: billingsWithOutstanding,
      summary: {
        totalBilled,
        totalCollections,
        billingsOutstanding
      }
    });
  } catch (error) {
    console.error("Error fetching billings:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update billing
app.put("/make-server-ce0d67b8/billings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();

    const existing = await kv.get(`billing:${id}`);

    if (!existing) {
      return c.json({ success: false, error: "Billing not found" }, 404);
    }

    // If billingNumber is being changed, validate uniqueness
    if (updates.billingNumber && updates.billingNumber !== existing.billingNumber) {
      const allBillings = await kv.getByPrefix("billing:");
      const duplicate = allBillings.find((b: any) => b.billingNumber === updates.billingNumber && b.id !== id);
      if (duplicate) {
        return c.json({ success: false, error: `Reference number ${updates.billingNumber} is already in use by another active record.` }, 409);
      }
    }

    const updated = {
      ...existing,
      ...updates,
      billingId: id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`billing:${id}`, updated);

    console.log(`Updated billing ${id}`);

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating billing:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete billing
app.delete("/make-server-ce0d67b8/billings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    const existing = await kv.get(`billing:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Billing not found" }, 404);
    }
    
    await kv.del(`billing:${id}`);
    
    console.log(`Deleted billing ${id}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting billing:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== FORM E (Certificate of Origin) ====================

// Get Form E by booking ID
app.get("/make-server-ce0d67b8/form-e", async (c) => {
  try {
    const bookingId = c.req.query("bookingId");
    
    if (!bookingId) {
      return c.json({ success: false, error: "bookingId parameter required" }, 400);
    }
    
    const allFormE = await kv.getByPrefix("form-e:");
    const formE = allFormE.find((f: any) => f.bookingId === bookingId);
    
    console.log(`Fetched Form E for booking ${bookingId}`);
    
    return c.json({ success: true, data: formE || null });
  } catch (error) {
    console.error("Error fetching Form E:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create Form E
app.post("/make-server-ce0d67b8/form-e", async (c) => {
  try {
    const formEData = await c.req.json();
    
    const formEId = `form-e-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newFormE = {
      ...formEData,
      id: formEId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`form-e:${formEId}`, newFormE);
    
    console.log(`Created Form E ${formEId} for booking ${formEData.bookingId}`);
    
    return c.json({ success: true, data: newFormE });
  } catch (error) {
    console.error("Error creating Form E:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update Form E
app.put("/make-server-ce0d67b8/form-e/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const formEData = await c.req.json();
    
    const existing = await kv.get(`form-e:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Form E not found" }, 404);
    }
    
    const updatedFormE = {
      ...existing,
      ...formEData,
      id,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`form-e:${id}`, updatedFormE);
    
    console.log(`Updated Form E ${id}`);
    
    return c.json({ success: true, data: updatedFormE });
  } catch (error) {
    console.error("Error updating Form E:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete Form E
app.delete("/make-server-ce0d67b8/form-e/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    const existing = await kv.get(`form-e:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Form E not found" }, 404);
    }
    
    await kv.del(`form-e:${id}`);
    
    console.log(`Deleted Form E ${id}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting Form E:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== FSI (Final Shipping Instructions) ====================

// Get FSI by booking ID
app.get("/make-server-ce0d67b8/fsi", async (c) => {
  try {
    const bookingId = c.req.query("bookingId");
    
    if (!bookingId) {
      return c.json({ success: false, error: "bookingId parameter required" }, 400);
    }
    
    const allFSI = await kv.getByPrefix("fsi:");
    const fsi = allFSI.find((f: any) => f.bookingId === bookingId);
    
    console.log(`Fetched FSI for booking ${bookingId}`);
    
    return c.json({ success: true, data: fsi || null });
  } catch (error) {
    console.error("Error fetching FSI:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create FSI
app.post("/make-server-ce0d67b8/fsi", async (c) => {
  try {
    const fsiData = await c.req.json();
    
    const fsiId = `fsi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newFSI = {
      ...fsiData,
      id: fsiId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`fsi:${fsiId}`, newFSI);
    
    console.log(`Created FSI ${fsiId} for booking ${fsiData.bookingId}`);
    
    return c.json({ success: true, data: newFSI });
  } catch (error) {
    console.error("Error creating FSI:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update FSI
app.put("/make-server-ce0d67b8/fsi/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const fsiData = await c.req.json();
    
    const existing = await kv.get(`fsi:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "FSI not found" }, 404);
    }
    
    const updatedFSI = {
      ...existing,
      ...fsiData,
      id,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`fsi:${id}`, updatedFSI);
    
    console.log(`Updated FSI ${id}`);
    
    return c.json({ success: true, data: updatedFSI });
  } catch (error) {
    console.error("Error updating FSI:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete FSI
app.delete("/make-server-ce0d67b8/fsi/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    const existing = await kv.get(`fsi:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "FSI not found" }, 404);
    }
    
    await kv.del(`fsi:${id}`);
    
    console.log(`Deleted FSI ${id}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting FSI:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== COMPREHENSIVE SEED DATA ====================
// This creates realistic data showing the new workflow: Projects → Bookings

import { seedNewWorkflowData } from "./new_seed_data.tsx";

app.post("/make-server-ce0d67b8/seed/comprehensive", async (c) => {
  try {
    console.log("Starting new workflow seed...");
    
    const result = await seedNewWorkflowData();
    
    return c.json({ 
      success: true, 
      message: "New workflow seed completed successfully!",
      summary: result.summary
    });
  } catch (error) {
    console.error("Error during seed:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Clear all seed data (for testing)
app.delete("/make-server-ce0d67b8/seed/clear", async (c) => {
  try {
    console.log("Clearing all seed data...");
    
    // Clear clients
    const clients = await kv.getByPrefix("client:");
    for (const client of clients) {
      await kv.del(`client:${client.id}`);
    }
    
    // Clear customers (legacy)
    const customers = await kv.getByPrefix("customer:");
    for (const customer of customers) {
      await kv.del(`customer:${customer.id}`);
    }
    
    // Clear quotations (legacy - for old workflow)
    const quotations = await kv.getByPrefix("quotation:");
    for (const quotation of quotations) {
      await kv.del(`quotation:${quotation.id}`);
    }
    
    // Clear projects
    const projects = await kv.getByPrefix("project:");
    for (const project of projects) {
      await kv.del(`project:${project.id}`);
    }
    
    // Clear export bookings
    const exportBookings = await kv.getByPrefix("export_booking:");
    for (const booking of exportBookings) {
      await kv.del(`export_booking:${booking.id}`);
    }
    
    // Clear import bookings
    const importBookings = await kv.getByPrefix("import_booking:");
    for (const booking of importBookings) {
      await kv.del(`import_booking:${booking.id}`);
    }
    
    // Clear legacy service bookings
    const forwardingBookings = await kv.getByPrefix("forwarding_booking:");
    for (const booking of forwardingBookings) {
      await kv.del(`forwarding_booking:${booking.id}`);
    }
    
    const brokerageBookings = await kv.getByPrefix("brokerage_booking:");
    for (const booking of brokerageBookings) {
      await kv.del(`brokerage_booking:${booking.id}`);
    }
    
    const truckingBookings = await kv.getByPrefix("trucking_booking:");
    for (const booking of truckingBookings) {
      await kv.del(`trucking_booking:${booking.id}`);
    }
    
    const insuranceBookings = await kv.getByPrefix("marine_insurance_booking:");
    for (const booking of insuranceBookings) {
      await kv.del(`marine_insurance_booking:${booking.id}`);
    }
    
    const othersBookings = await kv.getByPrefix("others_booking:");
    for (const booking of othersBookings) {
      await kv.del(`others_booking:${booking.id}`);
    }
    
    // Also clear any legacy bookings with old prefix
    const legacyBookings = await kv.getByPrefix("booking:");
    for (const booking of legacyBookings) {
      await kv.del(`booking:${booking.id}`);
    }
    
    const totalBookings = forwardingBookings.length + brokerageBookings.length + 
                          truckingBookings.length + insuranceBookings.length + 
                          othersBookings.length + legacyBookings.length;
    
    console.log(`Cleared ${customers.length} customers, ${quotations.length} quotations, ${projects.length} projects, and ${totalBookings} bookings`);
    
    return c.json({ 
      success: true, 
      message: "Seed data cleared successfully",
      summary: {
        customers_cleared: customers.length,
        quotations_cleared: quotations.length,
        projects_cleared: projects.length,
        bookings_cleared: totalBookings
      }
    });
  } catch (error) {
    console.error("Error clearing seed data:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== CLIENTS API ====================

// Get all clients
app.get("/make-server-ce0d67b8/clients", async (c) => {
  try {
    const searchQuery = c.req.query("search")?.toLowerCase() || "";
    const industryFilter = c.req.query("industry") || "";
    const statusFilter = c.req.query("status") || "";
    const roleFilter = c.req.query("role") || "";
    
    let customers = await kv.getByPrefix("client:");
    
    // Apply filters
    if (searchQuery) {
      customers = customers.filter((customer: any) => 
        customer.name?.toLowerCase().includes(searchQuery) ||
        customer.company_name?.toLowerCase().includes(searchQuery) ||
        customer.email?.toLowerCase().includes(searchQuery) ||
        customer.phone?.toLowerCase().includes(searchQuery)
      );
    }
    
    if (industryFilter) {
      customers = customers.filter((customer: any) => 
        customer.industry === industryFilter
      );
    }
    
    if (statusFilter) {
      customers = customers.filter((customer: any) => 
        customer.status === statusFilter
      );
    }
    
    // Sort by created_at descending
    customers.sort((a: any, b: any) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    console.log(`Fetched ${customers.length} clients (filtered from query)`);
    
    return c.json({ success: true, data: customers });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get single client by ID
app.get("/make-server-ce0d67b8/clients/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const customer = await kv.get(`client:${id}`);
    
    if (!customer) {
      return c.json({ success: false, error: "Customer not found" }, 404);
    }
    
    // Fetch all contacts for this customer
    const allContacts = await kv.getByPrefix("contact:");
    const customerContacts = allContacts.filter((contact: any) => contact.customer_id === id);
    
    // Sort contacts by created_at descending
    customerContacts.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    // Fetch all quotations for this customer
    const allQuotations = await kv.getByPrefix("quotation:");
    const customerQuotations = allQuotations.filter((q: any) => q.customer_id === id);
    
    // Sort quotations by created_at descending
    customerQuotations.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    console.log(`Fetched customer ${id} with ${customerContacts.length} contacts and ${customerQuotations.length} quotations`);
    
    return c.json({ 
      success: true, 
      data: {
        ...customer,
        contacts: customerContacts,
        quotations: customerQuotations
      }
    });
  } catch (error) {
    console.error("Error fetching customer:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create client
app.post("/make-server-ce0d67b8/clients", async (c) => {
  try {
    const data = await c.req.json();
    
    // Generate client ID
    const timestamp = Date.now();
    const id = `client-${timestamp}`;
    
    const client = {
      id,
      name: data.name || data.company_name,
      company_name: data.company_name || data.name,
      client_name: data.client_name || null,
      industry: data.industry || null,
      registered_address: data.registered_address || data.address || null,
      address: data.address || data.registered_address || null,
      status: data.status || "Prospect",
      lead_source: data.lead_source || null,
      credit_terms: data.credit_terms || "Net 30",
      phone: data.phone || null,
      email: data.email || null,
      notes: data.notes || null,
      owner_id: data.owner_id || null,
      created_at: new Date().toISOString(),
      created_by: data.created_by || null,
      updated_at: new Date().toISOString(),
    };
    
    await kv.set(`client:${id}`, client);
    
    console.log(`✅ Created client: ${id} - ${client.name}`);
    
    return c.json({ success: true, data: client });
  } catch (error) {
    console.error("❌ Error creating client:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update client
app.put("/make-server-ce0d67b8/clients/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    
    const existing = await kv.get(`client:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Client not found" }, 404);
    }
    
    const client = {
      ...existing,
      ...data,
      id, // Ensure ID doesn't change
      created_at: existing.created_at, // Preserve creation date
      updated_at: new Date().toISOString(),
    };
    
    await kv.set(`client:${id}`, client);
    
    console.log(`✅ Updated client: ${id}`);
    
    return c.json({ success: true, data: client });
  } catch (error) {
    console.error("❌ Error updating client:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete client
app.delete("/make-server-ce0d67b8/clients/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    const existing = await kv.get(`client:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Client not found" }, 404);
    }
    
    await kv.del(`client:${id}`);
    
    console.log(`✅ Deleted client: ${id}`);
    
    return c.json({ success: true, message: "Client deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting client:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Seed clients
app.post("/make-server-ce0d67b8/clients/seed", async (c) => {
  try {
    // Clear existing clients
    const existingCustomers = await kv.getByPrefix("client:");
    for (const customer of existingCustomers) {
      await kv.del(`client:${customer.id}`);
    }
    
    const seedCustomers = [
      {
        id: "CUST-001",
        name: "Manila Electronics Corp",
        company_name: "Manila Electronics Corp",
        client_name: "Maria Santos",
        industry: "Electronics",
        registered_address: "123 Ayala Avenue, Makati City",
        address: "123 Ayala Avenue, Makati City",
        status: "Active",
        lead_source: "Referral",
        credit_terms: "Net 30",
        phone: "+63 2 8123 4567",
        email: "procurement@mec.com.ph",
        notes: null,
        created_at: new Date().toISOString(),
        created_by: "user-bd-rep-001",
        updated_at: new Date().toISOString(),
      },
      {
        id: "CUST-002",
        name: "Pacific Trading Inc",
        company_name: "Pacific Trading Inc",
        client_name: "Juan Dela Cruz",
        industry: "General Merchandise",
        registered_address: "456 Roxas Boulevard, Pasay City",
        address: "456 Roxas Boulevard, Pasay City",
        status: "Active",
        lead_source: "Cold Outreach",
        credit_terms: "Net 45",
        phone: "+63 2 8234 5678",
        email: "operations@pacifictrade.ph",
        notes: null,
        created_at: new Date().toISOString(),
        created_by: "user-bd-rep-001",
        updated_at: new Date().toISOString(),
      },
      {
        id: "CUST-003",
        name: "Global Garments Ltd",
        company_name: "Global Garments Ltd",
        client_name: "Elena Rodriguez",
        industry: "Garments",
        registered_address: "789 Ortigas Center, Pasig City",
        address: "789 Ortigas Center, Pasig City",
        status: "Active",
        lead_source: "Website Inquiry",
        credit_terms: "Net 30",
        phone: "+63 2 8345 6789",
        email: "logistics@globalgarments.ph",
        notes: null,
        created_at: new Date().toISOString(),
        created_by: "user-bd-manager-001",
        updated_at: new Date().toISOString(),
      },
      {
        id: "CUST-004",
        name: "Prime Pharmaceuticals",
        company_name: "Prime Pharmaceuticals",
        client_name: "Roberto Garcia",
        industry: "Pharmaceutical",
        registered_address: "321 BGC, Taguig City",
        address: "321 BGC, Taguig City",
        status: "Prospect",
        lead_source: "Trade Show",
        credit_terms: "Net 15",
        phone: "+63 2 8456 7890",
        email: "supply@primepharma.ph",
        notes: null,
        created_at: new Date().toISOString(),
        created_by: "user-bd-rep-001",
        updated_at: new Date().toISOString(),
      },
      {
        id: "CUST-005",
        name: "Metro Food Distributors",
        company_name: "Metro Food Distributors",
        client_name: "Sofia Reyes",
        industry: "Food & Beverage",
        registered_address: "654 Quezon Avenue, Quezon City",
        address: "654 Quezon Avenue, Quezon City",
        status: "Active",
        lead_source: "Referral",
        credit_terms: "Net 30",
        phone: "+63 2 8567 8901",
        email: "procurement@metrofood.ph",
        notes: null,
        created_at: new Date().toISOString(),
        created_by: "user-bd-manager-001",
        updated_at: new Date().toISOString(),
      },
    ];
    
    for (const customer of seedCustomers) {
      await kv.set(`client:${customer.id}`, customer);
      console.log(`Seeded client: ${customer.id} - ${customer.name}`);
    }
    
    return c.json({ 
      success: true, 
      message: "Clients seeded successfully",
      data: seedCustomers 
    });
  } catch (error) {
    console.error("Error seeding clients:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Clear all clients
app.delete("/make-server-ce0d67b8/clients/clear", async (c) => {
  try {
    const existingCustomers = await kv.getByPrefix("client:");
    let count = 0;
    
    for (const customer of existingCustomers) {
      await kv.del(`client:${customer.id}`);
      count++;
    }
    
    console.log(`Cleared ${count} clients`);
    
    return c.json({ 
      success: true, 
      message: `Cleared ${count} clients`,
      count 
    });
  } catch (error) {
    console.error("Error clearing customers:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== PAYEES API ====================

// Get all payees
app.get("/make-server-ce0d67b8/payees", async (c) => {
  try {
    const payees = await kv.getByPrefix("payee:");
    payees.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
    return c.json({ success: true, data: payees });
  } catch (error) {
    console.error("Error fetching payees:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create a payee
app.post("/make-server-ce0d67b8/payees", async (c) => {
  try {
    const body = await c.req.json();
    if (!body.name || !body.name.trim()) {
      return c.json({ success: false, error: "Payee name is required" }, 400);
    }
    const id = body.id || `payee-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const payee = {
      id,
      name: body.name.trim(),
      type: body.type || "",
      status: body.status || "Active",
      created_at: new Date().toISOString(),
    };
    await kv.set(`payee:${id}`, payee);
    return c.json({ success: true, data: payee });
  } catch (error) {
    console.error("Error creating payee:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete a payee
app.delete("/make-server-ce0d67b8/payees/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`payee:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting payee:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Seed default payees (common freight forwarding payees in the Philippines)
app.post("/make-server-ce0d67b8/payees/seed", async (c) => {
  try {
    const seedPayees = [
      { id: "payee-001", name: "2GO Group Inc.", type: "Shipping Line" },
      { id: "payee-002", name: "Maersk Philippines", type: "Shipping Line" },
      { id: "payee-003", name: "Evergreen Shipping", type: "Shipping Line" },
      { id: "payee-004", name: "ONE (Ocean Network Express)", type: "Shipping Line" },
      { id: "payee-005", name: "MSC (Mediterranean Shipping)", type: "Shipping Line" },
      { id: "payee-006", name: "CMA CGM Philippines", type: "Shipping Line" },
      { id: "payee-007", name: "PIL Philippines", type: "Shipping Line" },
      { id: "payee-008", name: "SITC Container Lines", type: "Shipping Line" },
      { id: "payee-009", name: "LF Logistics", type: "Trucker" },
      { id: "payee-010", name: "Fast Cargo Logistics", type: "Trucker" },
      { id: "payee-011", name: "JRS Express", type: "Trucker" },
      { id: "payee-012", name: "Royal Cargo", type: "Trucker" },
      { id: "payee-013", name: "Air21", type: "Trucker" },
      { id: "payee-014", name: "Bureau of Customs", type: "Government" },
      { id: "payee-015", name: "Philippine Ports Authority", type: "Government" },
      { id: "payee-016", name: "Asian Terminals Inc.", type: "Port Operator" },
      { id: "payee-017", name: "International Container Terminal Services (ICTSI)", type: "Port Operator" },
      { id: "payee-018", name: "Manila North Harbour Port Inc.", type: "Port Operator" },
    ];

    for (const p of seedPayees) {
      await kv.set(`payee:${p.id}`, {
        ...p,
        status: "Active",
        created_at: new Date().toISOString(),
      });
    }

    return c.json({ success: true, message: `Seeded ${seedPayees.length} payees`, data: seedPayees });
  } catch (error) {
    console.error("Error seeding payees:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== CONTACTS API ====================

// Get all contacts (optionally filter by customer_id)
app.get("/make-server-ce0d67b8/contacts", async (c) => {
  try {
    const customer_id = c.req.query("customer_id");
    
    let contacts = await kv.getByPrefix("contact:");
    
    // Filter by customer if provided
    if (customer_id) {
      contacts = contacts.filter((contact: any) => contact.customer_id === customer_id);
    }
    
    // Enrich contacts with company names
    const enrichedContacts = await Promise.all(
      contacts.map(async (contact: any) => {
        if (contact.customer_id) {
          const customer = await kv.get(`customer:${contact.customer_id}`);
          return {
            ...contact,
            company: customer?.name || ''
          };
        }
        return {
          ...contact,
          company: ''
        };
      })
    );
    
    // Sort by created_at descending
    enrichedContacts.sort((a: any, b: any) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    console.log(`Fetched ${enrichedContacts.length} contacts${customer_id ? ` for customer ${customer_id}` : ''}`);
    
    return c.json({ success: true, data: enrichedContacts });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get single contact by ID
app.get("/make-server-ce0d67b8/contacts/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const contact = await kv.get(`contact:${id}`);
    
    if (!contact) {
      return c.json({ success: false, error: "Contact not found" }, 404);
    }
    
    // Enrich with company name
    let enrichedContact = contact;
    if (contact.customer_id) {
      const customer = await kv.get(`customer:${contact.customer_id}`);
      enrichedContact = {
        ...contact,
        company: customer?.name || ''
      };
    } else {
      enrichedContact = {
        ...contact,
        company: ''
      };
    }
    
    return c.json({ success: true, data: enrichedContact });
  } catch (error) {
    console.error("Error fetching contact:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create contact
app.post("/make-server-ce0d67b8/contacts", async (c) => {
  try {
    const data = await c.req.json();
    
    // Generate contact ID
    const timestamp = Date.now();
    const id = `CONTACT-${timestamp}`;
    
    const now = new Date().toISOString();
    const dateOnly = now.split('T')[0];
    
    const contact = {
      id,
      first_name: data.first_name || null,
      last_name: data.last_name || null,
      title: data.title || null,
      email: data.email || null,
      phone: data.phone || null,
      customer_id: data.customer_id || null, // Optional - can be standalone
      lifecycle_stage: data.lifecycle_stage || "Lead",
      lead_status: data.lead_status || "New",
      company: data.company || "",
      status: data.status || "Lead",
      last_activity: now,
      created_date: dateOnly,
      notes: data.notes || null,
      created_at: now,
      created_by: data.created_by || null,
      updated_at: now,
    };
    
    const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
    
    await kv.set(`contact:${id}`, contact);
    
    console.log(`Created contact: ${id} - ${fullName}${contact.customer_id ? ` for customer ${contact.customer_id}` : ''}`);
    
    return c.json({ success: true, data: contact });
  } catch (error) {
    console.error("Error creating contact:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update contact
app.put("/make-server-ce0d67b8/contacts/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    
    const existing = await kv.get(`contact:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Contact not found" }, 404);
    }
    
    const contact = {
      ...existing,
      ...data,
      id, // Ensure ID doesn't change
      created_at: existing.created_at, // Preserve creation date
      updated_at: new Date().toISOString(),
    };
    
    await kv.set(`contact:${id}`, contact);
    
    console.log(`Updated contact: ${id}`);
    
    return c.json({ success: true, data: contact });
  } catch (error) {
    console.error("Error updating contact:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ⚠️ IMPORTANT: Specific routes must come BEFORE parameterized routes
// Clear all contacts - must be before /contacts/:id
app.delete("/make-server-ce0d67b8/contacts/clear", async (c) => {
  try {
    const existingContacts = await kv.getByPrefix("contact:");
    let count = 0;
    
    for (const contact of existingContacts) {
      await kv.del(`contact:${contact.id}`);
      count++;
    }
    
    console.log(`Cleared ${count} contacts`);
    
    return c.json({ 
      success: true, 
      message: `Cleared ${count} contacts`,
      count 
    });
  } catch (error) {
    console.error("Error clearing contacts:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Migrate contacts from old schema (name field) to new schema (first_name, last_name)
app.post("/make-server-ce0d67b8/contacts/migrate-names", async (c) => {
  try {
    const contacts = await kv.getByPrefix("contact:");
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const contact of contacts) {
      // Check if contact has old 'name' field but no first_name/last_name
      if (contact.name && (!contact.first_name || !contact.last_name)) {
        // Split name into first and last name
        const nameParts = contact.name.trim().split(' ');
        const first_name = nameParts[0] || '';
        const last_name = nameParts.slice(1).join(' ') || '';
        
        // Update contact with new schema
        const updatedContact = {
          ...contact,
          first_name,
          last_name,
          updated_at: new Date().toISOString()
        };
        
        // Remove old 'name' field
        delete updatedContact.name;
        
        await kv.set(`contact:${contact.id}`, updatedContact);
        console.log(`Migrated contact ${contact.id}: "${contact.name}" → first_name: "${first_name}", last_name: "${last_name}"`);
        migratedCount++;
      } else {
        skippedCount++;
      }
    }
    
    console.log(`Migration complete: ${migratedCount} migrated, ${skippedCount} skipped`);
    
    return c.json({ 
      success: true, 
      message: `Migrated ${migratedCount} contacts from old schema to new schema`,
      migrated: migratedCount,
      skipped: skippedCount
    });
  } catch (error) {
    console.error("Error migrating contacts:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete contact (parameterized route must come after specific routes)
app.delete("/make-server-ce0d67b8/contacts/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    const existing = await kv.get(`contact:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Contact not found" }, 404);
    }
    
    await kv.del(`contact:${id}`);
    
    console.log(`Deleted contact: ${id}`);
    
    return c.json({ success: true, message: "Contact deleted successfully" });
  } catch (error) {
    console.error("Error deleting contact:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ⚠️ REMOVED: Seed contacts endpoint
// Contact seed data endpoint has been removed to prevent fake data pollution
// Users should create real contacts through the UI instead

// ==================== TASKS API ====================

// Get all tasks (optionally filter by customer_id, contact_id, or status)
app.get("/make-server-ce0d67b8/tasks", async (c) => {
  try {
    const customerId = c.req.query("customer_id");
    const contactId = c.req.query("contact_id");
    const status = c.req.query("status");
    
    let tasks = await kv.getByPrefix("task:");
    
    // Apply filters
    if (customerId) {
      tasks = tasks.filter((task: any) => task.customer_id === customerId);
    }
    if (contactId) {
      tasks = tasks.filter((task: any) => task.contact_id === contactId);
    }
    if (status) {
      tasks = tasks.filter((task: any) => task.status === status);
    }
    
    // Sort by due_date ascending (earliest first), then by created_at descending
    tasks.sort((a: any, b: any) => {
      const dueDateDiff = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      if (dueDateDiff !== 0) return dueDateDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    console.log(`Fetched ${tasks.length} tasks`);
    
    return c.json({ success: true, data: tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get single task by ID
app.get("/make-server-ce0d67b8/tasks/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const task = await kv.get(`task:${id}`);
    
    if (!task) {
      return c.json({ success: false, error: "Task not found" }, 404);
    }
    
    return c.json({ success: true, data: task });
  } catch (error) {
    console.error("Error fetching task:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create task
app.post("/make-server-ce0d67b8/tasks", async (c) => {
  try {
    const data = await c.req.json();
    
    // Generate task ID
    const timestamp = Date.now();
    const id = `TASK-${timestamp}`;
    
    const task = {
      id,
      title: data.title,
      type: data.type,
      due_date: data.due_date,
      priority: data.priority || "Medium",
      status: data.status || "Pending",
      cancel_reason: data.cancel_reason || null,
      remarks: data.remarks || null,
      contact_id: data.contact_id || null,
      customer_id: data.customer_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    await kv.set(`task:${id}`, task);
    
    console.log(`Created task: ${id} - ${task.title}`);
    
    return c.json({ success: true, data: task });
  } catch (error) {
    console.error("Error creating task:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update task
app.put("/make-server-ce0d67b8/tasks/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    
    const existing = await kv.get(`task:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Task not found" }, 404);
    }
    
    const task = {
      ...existing,
      ...data,
      id, // Ensure ID doesn't change
      created_at: existing.created_at, // Preserve creation date
      updated_at: new Date().toISOString(),
    };
    
    await kv.set(`task:${id}`, task);
    
    console.log(`Updated task: ${id}`);
    
    return c.json({ success: true, data: task });
  } catch (error) {
    console.error("Error updating task:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete task
app.delete("/make-server-ce0d67b8/tasks/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    const existing = await kv.get(`task:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Task not found" }, 404);
    }
    
    await kv.del(`task:${id}`);
    
    console.log(`Deleted task: ${id}`);
    
    return c.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== ACTIVITIES API ====================

// Get all activities (optionally filter by customer_id, contact_id, or user_id)
app.get("/make-server-ce0d67b8/activities", async (c) => {
  try {
    const customerId = c.req.query("customer_id");
    const contactId = c.req.query("contact_id");
    const userId = c.req.query("user_id");
    
    let activities = await kv.getByPrefix("activity:");
    
    // Apply filters
    if (customerId) {
      activities = activities.filter((activity: any) => activity.customer_id === customerId);
    }
    if (contactId) {
      activities = activities.filter((activity: any) => activity.contact_id === contactId);
    }
    if (userId) {
      activities = activities.filter((activity: any) => activity.user_id === userId);
    }
    
    // Sort by date descending (most recent first)
    activities.sort((a: any, b: any) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    
    console.log(`Fetched ${activities.length} activities`);
    
    return c.json({ success: true, data: activities });
  } catch (error) {
    console.error("Error fetching activities:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get single activity by ID
app.get("/make-server-ce0d67b8/activities/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const activity = await kv.get(`activity:${id}`);
    
    if (!activity) {
      return c.json({ success: false, error: "Activity not found" }, 404);
    }
    
    return c.json({ success: true, data: activity });
  } catch (error) {
    console.error("Error fetching activity:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create activity
app.post("/make-server-ce0d67b8/activities", async (c) => {
  try {
    const data = await c.req.json();
    
    // Generate activity ID
    const timestamp = Date.now();
    const id = `ACTIVITY-${timestamp}`;
    
    const activity = {
      id,
      type: data.type,
      description: data.description,
      date: data.date || new Date().toISOString(),
      contact_id: data.contact_id || null,
      customer_id: data.customer_id || null,
      task_id: data.task_id || null,
      user_id: data.user_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    await kv.set(`activity:${id}`, activity);
    
    console.log(`Created activity: ${id} - ${activity.type}`);
    
    return c.json({ success: true, data: activity });
  } catch (error) {
    console.error("Error creating activity:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete activity
app.delete("/make-server-ce0d67b8/activities/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    // Check if activity exists
    const activity = await kv.get(`activity:${id}`);
    if (!activity) {
      return c.json({ success: false, error: "Activity not found" }, 404);
    }
    
    // Delete the activity
    await kv.del(`activity:${id}`);
    
    console.log(`Deleted activity: ${id}`);
    
    return c.json({ success: true, message: "Activity deleted successfully" });
  } catch (error) {
    console.error("Error deleting activity:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== BUDGET REQUESTS API ====================

// Get all budget requests (optionally filter by customer_id or status)
app.get("/make-server-ce0d67b8/budget-requests", async (c) => {
  try {
    const customerId = c.req.query("customer_id");
    const status = c.req.query("status");
    
    let budgetRequests = await kv.getByPrefix("budget_request:");
    
    // Apply filters
    if (customerId) {
      budgetRequests = budgetRequests.filter((br: any) => br.customer_id === customerId);
    }
    if (status) {
      budgetRequests = budgetRequests.filter((br: any) => br.status === status);
    }
    
    // Sort by created_at descending
    budgetRequests.sort((a: any, b: any) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    console.log(`Fetched ${budgetRequests.length} budget requests`);
    
    return c.json({ success: true, data: budgetRequests });
  } catch (error) {
    console.error("Error fetching budget requests:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get single budget request by ID
app.get("/make-server-ce0d67b8/budget-requests/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const budgetRequest = await kv.get(`budget_request:${id}`);
    
    if (!budgetRequest) {
      return c.json({ success: false, error: "Budget request not found" }, 404);
    }
    
    return c.json({ success: true, data: budgetRequest });
  } catch (error) {
    console.error("Error fetching budget request:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create budget request
app.post("/make-server-ce0d67b8/budget-requests", async (c) => {
  try {
    const data = await c.req.json();
    
    // Generate budget request ID
    const timestamp = Date.now();
    const id = `BR-${timestamp}`;
    
    const budgetRequest = {
      id,
      type: data.type,
      amount: data.amount,
      justification: data.justification,
      status: data.status || "Pending",
      customer_id: data.customer_id || null,
      requested_by: data.requested_by,
      approved_by: data.approved_by || null,
      approved_at: data.approved_at || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    await kv.set(`budget_request:${id}`, budgetRequest);
    
    console.log(`Created budget request: ${id} - ${budgetRequest.type} - ${budgetRequest.amount}`);
    
    return c.json({ success: true, data: budgetRequest });
  } catch (error) {
    console.error("Error creating budget request:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update budget request (typically for approval/rejection)
app.put("/make-server-ce0d67b8/budget-requests/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    
    const existing = await kv.get(`budget_request:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Budget request not found" }, 404);
    }
    
    const budgetRequest = {
      ...existing,
      ...data,
      id, // Ensure ID doesn't change
      created_at: existing.created_at, // Preserve creation date
      updated_at: new Date().toISOString(),
    };
    
    await kv.set(`budget_request:${id}`, budgetRequest);
    
    console.log(`Updated budget request: ${id} - Status: ${budgetRequest.status}`);
    
    return c.json({ success: true, data: budgetRequest });
  } catch (error) {
    console.error("Error updating budget request:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== VENDORS API ====================

// Get all vendors (optionally filter by type)
app.get("/make-server-ce0d67b8/vendors", async (c) => {
  try {
    const type = c.req.query("type");
    const search = c.req.query("search");
    
    let vendors = await kv.getByPrefix("vendor:");
    
    // Apply filters
    if (type && type !== "All") {
      vendors = vendors.filter((vendor: any) => vendor.type === type);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      vendors = vendors.filter((vendor: any) => 
        vendor.company_name.toLowerCase().includes(searchLower) ||
        vendor.country.toLowerCase().includes(searchLower) ||
        vendor.contact_person?.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort by company name
    vendors.sort((a: any, b: any) => a.company_name.localeCompare(b.company_name));
    
    console.log(`Fetched ${vendors.length} vendors`);
    
    return c.json({ success: true, data: vendors });
  } catch (error) {
    console.error("Error fetching vendors:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get single vendor by ID
app.get("/make-server-ce0d67b8/vendors/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const vendor = await kv.get(`vendor:${id}`);
    
    if (!vendor) {
      return c.json({ success: false, error: "Vendor not found" }, 404);
    }
    
    return c.json({ success: true, data: vendor });
  } catch (error) {
    console.error("Error fetching vendor:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create vendor
app.post("/make-server-ce0d67b8/vendors", async (c) => {
  try {
    const data = await c.req.json();
    
    // Generate vendor ID
    const timestamp = Date.now();
    const id = `VENDOR-${timestamp}`;
    
    const now = new Date().toISOString();
    
    const vendor = {
      id,
      type: data.type || "Local Agent",
      company_name: data.company_name,
      country: data.country,
      territory: data.territory || "",
      wca_number: data.wca_number || "",
      contact_person: data.contact_person || "",
      contact_email: data.contact_email || "",
      contact_phone: data.contact_phone || "",
      address: data.address || "",
      services_offered: data.services_offered || [],
      total_shipments: 0,
      notes: data.notes || "",
      created_at: now,
      updated_at: now,
    };
    
    await kv.set(`vendor:${id}`, vendor);
    
    console.log(`Created vendor: ${id} - ${vendor.company_name}`);
    
    return c.json({ success: true, data: vendor });
  } catch (error) {
    console.error("Error creating vendor:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update vendor
app.put("/make-server-ce0d67b8/vendors/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    
    const existing = await kv.get(`vendor:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Vendor not found" }, 404);
    }
    
    const updated = {
      ...existing,
      ...data,
      id, // Ensure ID doesn't change
      updated_at: new Date().toISOString(),
    };
    
    await kv.set(`vendor:${id}`, updated);
    
    console.log(`Updated vendor: ${id}`);
    
    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating vendor:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete vendor
app.delete("/make-server-ce0d67b8/vendors/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    const existing = await kv.get(`vendor:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Vendor not found" }, 404);
    }
    
    await kv.del(`vendor:${id}`);
    
    console.log(`Deleted vendor: ${id}`);
    
    return c.json({ success: true, message: "Vendor deleted successfully" });
  } catch (error) {
    console.error("Error deleting vendor:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Seed vendors
app.post("/make-server-ce0d67b8/vendors/seed", async (c) => {
  try {
    // Clear existing vendors
    const existingVendors = await kv.getByPrefix("vendor:");
    for (const vendor of existingVendors) {
      await kv.del(`vendor:${vendor.id}`);
    }
    
    const now = new Date().toISOString();
    
    const seedVendors = [
      {
        id: "VENDOR-001",
        type: "Overseas Agent",
        company_name: "Global Freight Solutions",
        country: "Singapore",
        territory: "Southeast Asia",
        wca_number: "WCA-SG-001",
        contact_person: "Michael Tan",
        contact_email: "michael.tan@globalfreight.sg",
        contact_phone: "+65 6123 4567",
        address: "123 Marina Bay, Singapore 018956",
        services_offered: ["Forwarding", "Brokerage"],
        total_shipments: 156,
        notes: "Preferred partner for Singapore shipments",
        created_at: now,
        updated_at: now,
      },
      {
        id: "VENDOR-002",
        type: "Overseas Agent",
        company_name: "Pacific Logistics Network",
        country: "China",
        territory: "East Asia",
        wca_number: "WCA-CN-045",
        contact_person: "Li Wei",
        contact_email: "liwei@pacificlog.cn",
        contact_phone: "+86 21 1234 5678",
        address: "456 Pudong Avenue, Shanghai 200120, China",
        services_offered: ["Forwarding", "Trucking"],
        total_shipments: 234,
        notes: "Strong consolidation services from Shanghai",
        created_at: now,
        updated_at: now,
      },
      {
        id: "VENDOR-003",
        type: "Local Agent",
        company_name: "Manila Port Services",
        country: "Philippines",
        territory: "Metro Manila",
        wca_number: "",
        contact_person: "Juan Reyes",
        contact_email: "juan.reyes@manilaport.ph",
        contact_phone: "+63 2 8123 4567",
        address: "Port Area, Manila 1018, Philippines",
        services_offered: ["Brokerage", "Trucking"],
        total_shipments: 89,
        notes: "Excellent port handling and local customs clearance",
        created_at: now,
        updated_at: now,
      },
      {
        id: "VENDOR-004",
        type: "Subcontractor",
        company_name: "FastTrack Customs Brokers",
        country: "Philippines",
        territory: "Nationwide",
        wca_number: "",
        contact_person: "Maria Santos",
        contact_email: "maria@fasttrackph.com",
        contact_phone: "+63 917 123 4567",
        address: "Makati City, Metro Manila, Philippines",
        services_offered: ["Brokerage"],
        total_shipments: 312,
        notes: "BOC-accredited broker, fast processing",
        created_at: now,
        updated_at: now,
      },
      {
        id: "VENDOR-005",
        type: "Overseas Agent",
        company_name: "American Express Cargo",
        country: "United States",
        territory: "North America",
        wca_number: "WCA-US-112",
        contact_person: "John Miller",
        contact_email: "jmiller@amexcargo.com",
        contact_phone: "+1 310 555 1234",
        address: "Los Angeles, CA 90001, USA",
        services_offered: ["Forwarding", "Marine Insurance"],
        total_shipments: 67,
        notes: "West Coast operations, good for consolidations",
        created_at: now,
        updated_at: now,
      },
      {
        id: "VENDOR-006",
        type: "Subcontractor",
        company_name: "Metro Trucking Solutions",
        country: "Philippines",
        territory: "Luzon",
        wca_number: "",
        contact_person: "Roberto Cruz",
        contact_email: "roberto@metrotruck.ph",
        contact_phone: "+63 918 234 5678",
        address: "Valenzuela City, Metro Manila, Philippines",
        services_offered: ["Trucking"],
        total_shipments: 445,
        notes: "Large fleet, 24/7 operations",
        created_at: now,
        updated_at: now,
      },
      {
        id: "VENDOR-007",
        type: "Local Agent",
        company_name: "Cebu Logistics Hub",
        country: "Philippines",
        territory: "Visayas",
        wca_number: "",
        contact_person: "Anna Garcia",
        contact_email: "anna@cebuhub.ph",
        contact_phone: "+63 32 234 5678",
        address: "Cebu City 6000, Philippines",
        services_offered: ["Forwarding", "Trucking", "Brokerage"],
        total_shipments: 178,
        notes: "Comprehensive Visayas coverage",
        created_at: now,
        updated_at: now,
      },
      {
        id: "VENDOR-008",
        type: "Overseas Agent",
        company_name: "Tokyo International Freight",
        country: "Japan",
        territory: "Northeast Asia",
        wca_number: "WCA-JP-078",
        contact_person: "Takeshi Yamamoto",
        contact_email: "yamamoto@tokyofreight.jp",
        contact_phone: "+81 3 1234 5678",
        address: "Tokyo 100-0001, Japan",
        services_offered: ["Forwarding", "Marine Insurance"],
        total_shipments: 92,
        notes: "Premium service, strong airline connections",
        created_at: now,
        updated_at: now,
      },
    ];
    
    for (const vendor of seedVendors) {
      await kv.set(`vendor:${vendor.id}`, vendor);
      console.log(`Seeded vendor: ${vendor.id} - ${vendor.company_name}`);
    }
    
    return c.json({ 
      success: true, 
      message: "Vendors seeded successfully",
      data: seedVendors 
    });
  } catch (error) {
    console.error("Error seeding vendors:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Clear all vendors
app.delete("/make-server-ce0d67b8/vendors/clear", async (c) => {
  try {
    const existingVendors = await kv.getByPrefix("vendor:");
    let count = 0;
    
    for (const vendor of existingVendors) {
      await kv.del(`vendor:${vendor.id}`);
      count++;
    }
    
    console.log(`Cleared ${count} vendors`);
    
    return c.json({ 
      success: true, 
      message: `Cleared ${count} vendors`,
      count 
    });
  } catch (error) {
    console.error("Error clearing vendors:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== BD REPORTS API ====================

// Get available report templates
app.get("/make-server-ce0d67b8/reports/templates", async (c) => {
  try {
    const templates = [
      {
        id: "quotation-performance",
        name: "Quotation Performance Report",
        description: "Overview of quotation metrics, win rates, and conversion statistics",
        icon: "📊",
        category: "Performance"
      },
      {
        id: "customer-activity",
        name: "Customer Activity Report",
        description: "Customer engagement, quotations, and lifetime value analysis",
        icon: "👥",
        category: "Customers"
      },
      {
        id: "rep-performance",
        name: "BD Rep Performance Report",
        description: "Individual and team performance metrics and comparisons",
        icon: "🎯",
        category: "Performance"
      },
      {
        id: "pipeline-health",
        name: "Pipeline Health Report",
        description: "Pipeline stages, conversion rates, and velocity metrics",
        icon: "💼",
        category: "Pipeline"
      },
      {
        id: "budget-requests",
        name: "Budget Request Report",
        description: "Overview of budget requests, approvals, and spending",
        icon: "📈",
        category: "Finance"
      }
    ];

    return c.json({ success: true, data: templates });
  } catch (error) {
    console.error("Error fetching report templates:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Generate report based on configuration
app.post("/make-server-ce0d67b8/reports/generate", async (c) => {
  try {
    const config = await c.req.json();
    const { templateId, dataSource, columns, filters, groupBy, aggregations, sortBy, dateRange } = config;

    // Fetch data based on dataSource
    let rawData: any[] = [];
    
    if (dataSource === "quotations" || templateId === "quotation-performance" || templateId === "pipeline-health") {
      const quotations = await kv.getByPrefix("quotation:");
      rawData = quotations;
    } else if (dataSource === "customers" || templateId === "customer-activity") {
      const customers = await kv.getByPrefix("customer:");
      rawData = customers;
    } else if (dataSource === "budget_requests" || templateId === "budget-requests") {
      const budgetRequests = await kv.getByPrefix("budget_request:");
      rawData = budgetRequests;
    } else if (dataSource === "contacts") {
      const contacts = await kv.getByPrefix("contact:");
      rawData = contacts;
    } else if (dataSource === "activities") {
      const activities = await kv.getByPrefix("activity:");
      rawData = activities;
    }

    // Apply filters
    let filteredData = rawData;
    if (filters && filters.length > 0) {
      filteredData = rawData.filter(item => {
        return filters.every((filter: any) => {
          const { field, operator, value } = filter;
          const fieldValue = item[field];

          switch (operator) {
            case "equals":
              return fieldValue === value;
            case "not_equals":
              return fieldValue !== value;
            case "contains":
              return String(fieldValue || "").toLowerCase().includes(String(value).toLowerCase());
            case "greater_than":
              return Number(fieldValue) > Number(value);
            case "less_than":
              return Number(fieldValue) < Number(value);
            case "in":
              return Array.isArray(value) && value.includes(fieldValue);
            case "between":
              return Number(fieldValue) >= Number(value[0]) && Number(fieldValue) <= Number(value[1]);
            case "date_after":
              return new Date(fieldValue) > new Date(value);
            case "date_before":
              return new Date(fieldValue) < new Date(value);
            case "date_between":
              return new Date(fieldValue) >= new Date(value[0]) && new Date(fieldValue) <= new Date(value[1]);
            default:
              return true;
          }
        });
      });
    }

    // Apply date range filter if provided
    if (dateRange && dateRange.field && dateRange.start && dateRange.end) {
      filteredData = filteredData.filter(item => {
        const date = new Date(item[dateRange.field]);
        return date >= new Date(dateRange.start) && date <= new Date(dateRange.end);
      });
    }

    // Calculate metrics based on template
    let metrics: any = {};
    let chartData: any = {};

    if (templateId === "quotation-performance") {
      const total = filteredData.length;
      const wonCount = filteredData.filter(q => q.status === "Won").length;
      const lostCount = filteredData.filter(q => q.status === "Lost").length;
      const sentCount = filteredData.filter(q => q.status === "Sent to Client").length;
      const draftCount = filteredData.filter(q => q.status === "Draft").length;
      
      const totalValue = filteredData.reduce((sum, q) => sum + (q.total_amount || 0), 0);
      const avgValue = total > 0 ? totalValue / total : 0;
      const winRate = (wonCount + lostCount) > 0 ? (wonCount / (wonCount + lostCount)) * 100 : 0;

      metrics = {
        total_quotations: total,
        won_count: wonCount,
        lost_count: lostCount,
        sent_count: sentCount,
        draft_count: draftCount,
        total_value: totalValue,
        average_value: avgValue,
        win_rate: winRate.toFixed(1)
      };

      // Chart data: Status distribution
      chartData.statusDistribution = [
        { name: "Won", value: wonCount },
        { name: "Lost", value: lostCount },
        { name: "Sent", value: sentCount },
        { name: "Draft", value: draftCount }
      ];

      // Chart data: Monthly trend
      const monthlyData: any = {};
      filteredData.forEach(q => {
        const month = new Date(q.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        monthlyData[month] = (monthlyData[month] || 0) + 1;
      });
      chartData.monthlyTrend = Object.entries(monthlyData).map(([month, count]) => ({
        month,
        count
      }));

    } else if (templateId === "customer-activity") {
      // Get all quotations and contacts for calculations
      const allQuotations = await kv.getByPrefix("quotation:");
      const allContacts = await kv.getByPrefix("contact:");
      
      metrics = {
        total_customers: filteredData.length,
        total_quotations: allQuotations.length,
        active_customers: filteredData.filter((c: any) => {
          const customerQuotations = allQuotations.filter((q: any) => q.customer_id === c.id);
          return customerQuotations.length > 0;
        }).length
      };

      // Top customers by quotation count
      const customerQuotationCounts: any = {};
      allQuotations.forEach((q: any) => {
        customerQuotationCounts[q.customer_id] = (customerQuotationCounts[q.customer_id] || 0) + 1;
      });
      
      chartData.topCustomers = Object.entries(customerQuotationCounts)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 10)
        .map(([customerId, count]) => {
          const customer = filteredData.find((c: any) => c.id === customerId);
          return {
            name: customer?.company_name || "Unknown",
            count
          };
        });

    } else if (templateId === "rep-performance") {
      const allQuotations = await kv.getByPrefix("quotation:");
      const allUsers = await kv.getByPrefix("user:");
      const bdUsers = allUsers.filter((u: any) => u.department === "Business Development");

      const repStats: any = {};
      bdUsers.forEach((user: any) => {
        const userQuotations = allQuotations.filter((q: any) => q.created_by === user.id);
        const wonQuotations = userQuotations.filter((q: any) => q.status === "Won");
        const lostQuotations = userQuotations.filter((q: any) => q.status === "Lost");
        const totalDecided = wonQuotations.length + lostQuotations.length;
        const winRate = totalDecided > 0 ? (wonQuotations.length / totalDecided) * 100 : 0;

        repStats[user.id] = {
          name: user.name,
          total_quotations: userQuotations.length,
          won_count: wonQuotations.length,
          win_rate: winRate,
          total_value: userQuotations.reduce((sum: number, q: any) => sum + (q.total_amount || 0), 0)
        };
      });

      metrics = {
        total_reps: bdUsers.length,
        total_quotations: allQuotations.length,
        avg_quotations_per_rep: bdUsers.length > 0 ? allQuotations.length / bdUsers.length : 0
      };

      chartData.repPerformance = Object.values(repStats);

    } else if (templateId === "pipeline-health") {
      const statusCounts: any = {
        "Draft": 0,
        "Inquiry Submitted": 0,
        "Sent to Client": 0,
        "Won": 0,
        "Lost": 0
      };

      const statusValues: any = {
        "Draft": 0,
        "Inquiry Submitted": 0,
        "Sent to Client": 0,
        "Won": 0,
        "Lost": 0
      };

      filteredData.forEach(q => {
        if (statusCounts.hasOwnProperty(q.status)) {
          statusCounts[q.status]++;
          statusValues[q.status] += (q.total_amount || 0);
        }
      });

      const totalValue = Object.values(statusValues).reduce((sum: number, val: any) => sum + val, 0);

      metrics = {
        total_pipeline_value: totalValue,
        active_opportunities: statusCounts["Sent to Client"] + statusCounts["Inquiry Submitted"],
        won_count: statusCounts["Won"],
        lost_count: statusCounts["Lost"]
      };

      chartData.pipelineStages = Object.entries(statusCounts).map(([stage, count]) => ({
        stage,
        count,
        value: statusValues[stage]
      }));

    } else if (templateId === "budget-requests") {
      const approved = filteredData.filter(br => br.status === "Approved").length;
      const pending = filteredData.filter(br => br.status === "Pending").length;
      const rejected = filteredData.filter(br => br.status === "Rejected").length;
      const totalAmount = filteredData.reduce((sum, br) => sum + (br.amount || 0), 0);

      metrics = {
        total_requests: filteredData.length,
        approved_count: approved,
        pending_count: pending,
        rejected_count: rejected,
        total_amount: totalAmount,
        approval_rate: (approved + rejected) > 0 ? (approved / (approved + rejected)) * 100 : 0
      };

      chartData.statusDistribution = [
        { name: "Approved", value: approved },
        { name: "Pending", value: pending },
        { name: "Rejected", value: rejected }
      ];
    }

    // Select columns if specified
    let tableData = filteredData;
    if (columns && columns.length > 0) {
      tableData = filteredData.map(item => {
        const row: any = {};
        columns.forEach((col: string) => {
          row[col] = item[col];
        });
        return row;
      });
    }

    // Apply sorting
    if (sortBy && sortBy.length > 0) {
      tableData.sort((a: any, b: any) => {
        for (const sort of sortBy) {
          const { field, direction } = sort;
          const aVal = a[field];
          const bVal = b[field];
          
          if (aVal < bVal) return direction === "asc" ? -1 : 1;
          if (aVal > bVal) return direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return c.json({
      success: true,
      data: {
        metrics,
        chartData,
        tableData: tableData.slice(0, 1000), // Limit to 1000 rows for performance
        totalRows: filteredData.length
      }
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get user's saved reports
app.get("/make-server-ce0d67b8/reports/saved", async (c) => {
  try {
    const userId = c.req.query("user_id");
    
    if (!userId) {
      return c.json({ success: false, error: "User ID required" }, 400);
    }

    const savedReports = await kv.getByPrefix(`saved_report:${userId}:`);
    
    return c.json({ success: true, data: savedReports });
  } catch (error) {
    console.error("Error fetching saved reports:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Save report configuration
app.post("/make-server-ce0d67b8/reports/save", async (c) => {
  try {
    const { userId, name, description, config } = await c.req.json();
    
    if (!userId || !name || !config) {
      return c.json({ success: false, error: "Missing required fields" }, 400);
    }

    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const savedReport = {
      id: reportId,
      user_id: userId,
      name,
      description: description || "",
      config,
      created_at: new Date().toISOString(),
      last_run: null
    };

    await kv.set(`saved_report:${userId}:${reportId}`, savedReport);
    
    return c.json({ success: true, data: savedReport });
  } catch (error) {
    console.error("Error saving report:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete saved report
app.delete("/make-server-ce0d67b8/reports/saved/:id", async (c) => {
  try {
    const reportId = c.req.param("id");
    const userId = c.req.query("user_id");
    
    if (!userId) {
      return c.json({ success: false, error: "User ID required" }, 400);
    }

    await kv.del(`saved_report:${userId}:${reportId}`);
    
    return c.json({ success: true, message: "Report deleted successfully" });
  } catch (error) {
    console.error("Error deleting saved report:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Export report to CSV/Excel/PDF
app.post("/make-server-ce0d67b8/reports/export", async (c) => {
  try {
    const { format, data, filename } = await c.req.json();
    
    if (format === "csv") {
      // Generate CSV
      if (!data || data.length === 0) {
        return c.json({ success: false, error: "No data to export" }, 400);
      }

      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(","),
        ...data.map((row: any) => 
          headers.map(header => {
            const value = row[header];
            // Escape quotes and wrap in quotes if contains comma
            const stringValue = String(value || "");
            if (stringValue.includes(",") || stringValue.includes('"')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          }).join(",")
        )
      ];

      const csvContent = csvRows.join("\n");
      
      return c.json({
        success: true,
        data: {
          content: csvContent,
          filename: filename || "report.csv",
          mimeType: "text/csv"
        }
      });
    } else if (format === "excel") {
      // For Excel, we'll return CSV with .xlsx extension
      // In a production app, you'd use a library like xlsx
      if (!data || data.length === 0) {
        return c.json({ success: false, error: "No data to export" }, 400);
      }

      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join("\t"), // Tab-separated for Excel
        ...data.map((row: any) => 
          headers.map(header => String(row[header] || "")).join("\t")
        )
      ];

      const content = csvRows.join("\n");
      
      return c.json({
        success: true,
        data: {
          content,
          filename: filename || "report.xlsx",
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
      });
    } else if (format === "pdf") {
      // For PDF, return a simple text representation
      // In production, use a PDF generation library
      return c.json({
        success: true,
        data: {
          content: JSON.stringify(data, null, 2),
          filename: filename || "report.pdf",
          mimeType: "application/pdf",
          note: "PDF generation requires additional library - returning JSON for now"
        }
      });
    } else {
      return c.json({ success: false, error: "Invalid export format" }, 400);
    }
  } catch (error) {
    console.error("Error exporting report:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== CONTROL CENTER REPORTS API ====================

// Helper function to apply filter operators
function applyFilterOperator(fieldValue: any, operator: string, filterValue: any): boolean {
  switch (operator) {
    case 'equals':
      return fieldValue === filterValue;
    case 'not_equals':
      return fieldValue !== filterValue;
    case 'contains':
      return String(fieldValue || '').toLowerCase().includes(String(filterValue).toLowerCase());
    case 'starts_with':
      return String(fieldValue || '').toLowerCase().startsWith(String(filterValue).toLowerCase());
    case 'greater_than':
      return Number(fieldValue) > Number(filterValue);
    case 'less_than':
      return Number(fieldValue) < Number(filterValue);
    case 'greater_than_or_equal':
      return Number(fieldValue) >= Number(filterValue);
    case 'less_than_or_equal':
      return Number(fieldValue) <= Number(filterValue);
    case 'date_after':
      return new Date(fieldValue) > new Date(filterValue);
    case 'date_before':
      return new Date(fieldValue) < new Date(filterValue);
    default:
      return true;
  }
}

// Generate report from Control Center (cross-entity queries)
app.post("/make-server-ce0d67b8/reports/control-center", async (c) => {
  try {
    const { selectedFields, filters, groupBy, aggregations } = await c.req.json();
    
    console.log('[Control Center] Received config:', {
      selectedFields: selectedFields?.length || 0,
      filters: filters?.length || 0,
      groupBy: groupBy?.length || 0,
      aggregations: aggregations?.length || 0
    });

    // If no fields selected, return empty result
    if (!selectedFields || selectedFields.length === 0) {
      return c.json({
        success: true,
        data: [],
        columns: []
      });
    }

    // Determine which entities are involved
    const entitiesInvolved = new Set<string>();
    selectedFields.forEach((f: any) => entitiesInvolved.add(f.entity));
    if (filters) {
      filters.forEach((f: any) => entitiesInvolved.add(f.entity));
    }

    console.log('[Control Center] Entities involved:', Array.from(entitiesInvolved));

    // Fetch all required entities from KV store
    const entityData: Record<string, any[]> = {};
    for (const entity of entitiesInvolved) {
      const prefix = entity === 'quotations' ? 'quotation:' :
                     entity === 'customers' ? 'customer:' :
                     entity === 'contacts' ? 'contact:' :
                     entity === 'activities' ? 'activity:' :
                     entity === 'budget_requests' ? 'budget_request:' : '';
      
      if (prefix) {
        entityData[entity] = await kv.getByPrefix(prefix);
        console.log(`[Control Center] Loaded ${entityData[entity].length} records from ${entity}`);
      }
    }

    // Determine primary entity (the one with most selected fields)
    const fieldCounts: Record<string, number> = {};
    selectedFields.forEach((f: any) => {
      fieldCounts[f.entity] = (fieldCounts[f.entity] || 0) + 1;
    });
    const primaryEntity = Object.entries(fieldCounts).sort(([, a], [, b]) => b - a)[0][0];
    console.log('[Control Center] Primary entity:', primaryEntity, 'Field counts:', fieldCounts);

    // Start with primary entity data
    let results = entityData[primaryEntity] || [];
    console.log('[Control Center] Starting with', results.length, 'records from primary entity');

    // Apply filters
    if (filters && filters.length > 0) {
      results = results.filter((item: any) => {
        return filters.every((filter: any) => {
          // For filters on the primary entity, apply directly
          if (filter.entity === primaryEntity) {
            const fieldValue = item[filter.field];
            return applyFilterOperator(fieldValue, filter.operator, filter.value);
          }
          
          // For filters on related entities, we need to do a lookup
          // This is a simplified version - in production you'd handle complex joins
          if (filter.entity === 'customers' && primaryEntity === 'quotations') {
            const customer = entityData.customers?.find((c: any) => c.id === item.customer_id);
            if (!customer) return false;
            return applyFilterOperator(customer[filter.field], filter.operator, filter.value);
          }
          
          if (filter.entity === 'contacts' && primaryEntity === 'quotations') {
            const contact = entityData.contacts?.find((c: any) => c.id === item.contact_person_id);
            if (!contact) return false;
            return applyFilterOperator(contact[filter.field], filter.operator, filter.value);
          }
          
          // Default: don't filter if we can't match the relationship
          return true;
        });
      });
      console.log('[Control Center] After filtering:', results.length, 'records');
    }

    // Build result rows with cross-entity field mapping
    const resultRows = results.map((item: any) => {
      const row: any = {};
      
      selectedFields.forEach((field: any) => {
        const columnName = field.displayLabel;
        
        if (field.entity === primaryEntity) {
          // Direct field from primary entity
          row[columnName] = item[field.field];
        } else if (field.entity === 'customers' && primaryEntity === 'quotations') {
          // Join to customers
          const customer = entityData.customers?.find((c: any) => c.id === item.customer_id);
          row[columnName] = customer ? customer[field.field] : null;
        } else if (field.entity === 'contacts' && primaryEntity === 'quotations') {
          // Join to contacts
          const contact = entityData.contacts?.find((c: any) => c.id === item.contact_person_id);
          row[columnName] = contact ? contact[field.field] : null;
        } else if (field.entity === 'quotations' && primaryEntity === 'customers') {
          // Can't easily do one-to-many in this simple structure
          // Would need aggregation logic here
          row[columnName] = null;
        } else {
          row[columnName] = null;
        }
      });
      
      return row;
    });

    console.log('[Control Center] Built', resultRows.length, 'result rows');

    // Handle grouping and aggregations
    let finalResults = resultRows;
    if (groupBy && groupBy.length > 0 && aggregations && aggregations.length > 0) {
      // Group by specified fields
      const grouped: Record<string, any[]> = {};
      
      resultRows.forEach((row: any) => {
        const groupKey = groupBy.map((g: any) => row[g.label]).join('|');
        if (!grouped[groupKey]) {
          grouped[groupKey] = [];
        }
        grouped[groupKey].push(row);
      });

      // Calculate aggregations for each group
      finalResults = Object.entries(grouped).map(([groupKey, rows]) => {
        const result: any = {};
        
        // Add group by fields
        groupBy.forEach((g: any, index: number) => {
          result[g.label] = groupKey.split('|')[index];
        });
        
        // Add aggregations
        aggregations.forEach((agg: any) => {
          const field = selectedFields.find((f: any) => f.entity === agg.entity && f.field === agg.field);
          const columnName = field?.displayLabel;
          
          if (columnName) {
            const values = rows.map((r: any) => Number(r[columnName]) || 0);
            
            if (agg.function === 'SUM') {
              result[agg.name] = values.reduce((sum, val) => sum + val, 0);
            } else if (agg.function === 'AVG') {
              result[agg.name] = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
            } else if (agg.function === 'COUNT') {
              result[agg.name] = rows.length;
            } else if (agg.function === 'MIN') {
              result[agg.name] = Math.min(...values);
            } else if (agg.function === 'MAX') {
              result[agg.name] = Math.max(...values);
            }
          }
        });
        
        return result;
      });

      console.log('[Control Center] After grouping/aggregation:', finalResults.length, 'rows');
    }

    // Extract column names from first row
    const columns = finalResults.length > 0 ? Object.keys(finalResults[0]) : [];

    return c.json({
      success: true,
      data: finalResults.slice(0, 1000), // Limit to 1000 rows
      columns: columns
    });

  } catch (error) {
    console.error("[Control Center] Error generating report:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== ATTACHMENTS API ====================

// List attachments for an entity
app.get("/make-server-ce0d67b8/attachments/:entityType/:entityId", async (c) => {
  try {
    const entityType = c.req.param("entityType");
    const entityId = c.req.param("entityId");
    const key = `attachments:${entityType}:${entityId}`;
    
    const attachments = await kvRetry(() => kv.get(key)) || [];
    
    console.log(`Fetched ${Array.isArray(attachments) ? attachments.length : 0} attachments for ${entityType}/${entityId}`);
    
    return c.json({ success: true, data: Array.isArray(attachments) ? attachments : [] });
  } catch (error) {
    console.error("Error fetching attachments:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Upload attachment metadata (file stored as base64 in KV for simplicity)
app.post("/make-server-ce0d67b8/attachments/:entityType/:entityId", async (c) => {
  try {
    const entityType = c.req.param("entityType");
    const entityId = c.req.param("entityId");
    const body = await c.req.json();
    
    const { fileName, fileSize, fileType, fileData } = body;
    
    if (!fileName) {
      return c.json({ success: false, error: "fileName is required" }, 400);
    }
    
    const attachmentId = `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    const attachment = {
      id: attachmentId,
      fileName,
      fileSize: fileSize || 0,
      fileType: fileType || "application/octet-stream",
      uploadedAt: new Date().toISOString(),
    };
    
    // Store file data separately if provided
    if (fileData) {
      await kvRetry(() => kv.set(`attachment_file:${attachmentId}`, { data: fileData }));
    }
    
    // Append to attachments list
    const key = `attachments:${entityType}:${entityId}`;
    const existing = await kvRetry(() => kv.get(key)) || [];
    const list = Array.isArray(existing) ? existing : [];
    list.push(attachment);
    await kvRetry(() => kv.set(key, list));
    
    console.log(`Uploaded attachment ${attachmentId} (${fileName}) for ${entityType}/${entityId}`);
    
    return c.json({ success: true, data: attachment });
  } catch (error) {
    console.error("Error uploading attachment:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Download attachment file data
app.get("/make-server-ce0d67b8/attachments/download/:attachmentId", async (c) => {
  try {
    const attachmentId = c.req.param("attachmentId");
    const fileRecord = await kvRetry(() => kv.get(`attachment_file:${attachmentId}`));
    
    if (!fileRecord || !fileRecord.data) {
      return c.json({ success: false, error: "File not found" }, 404);
    }
    
    return c.json({ success: true, data: fileRecord.data });
  } catch (error) {
    console.error("Error downloading attachment:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete attachment
app.delete("/make-server-ce0d67b8/attachments/:entityType/:entityId/:attachmentId", async (c) => {
  try {
    const entityType = c.req.param("entityType");
    const entityId = c.req.param("entityId");
    const attachmentId = c.req.param("attachmentId");
    
    // Remove from list
    const key = `attachments:${entityType}:${entityId}`;
    const existing = await kvRetry(() => kv.get(key)) || [];
    const list = Array.isArray(existing) ? existing : [];
    const updated = list.filter((a: any) => a.id !== attachmentId);
    await kvRetry(() => kv.set(key, updated));
    
    // Delete file data
    try {
      await kvRetry(() => kv.del(`attachment_file:${attachmentId}`));
    } catch (e) {
      console.log(`Note: Could not delete file data for ${attachmentId}: ${e}`);
    }
    
    console.log(`Deleted attachment ${attachmentId} from ${entityType}/${entityId}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

Deno.serve(app.fetch);
