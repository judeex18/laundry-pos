// =====================
// Supabase Database - Online POS
// =====================

import { supabase } from "./supabase";

// Default services list
const DEFAULT_SERVICES = [
  { name: "Wash Only", price: 100, active: true },
  { name: "Dry Only", price: 100, active: true },
  { name: "Wash, Dry & Fold", price: 180, active: true },
  { name: "Iron", price: 50, active: true },
  { name: "Downy", price: 15, active: true },
  { name: "Liquid Detergent", price: 15, active: true },
  { name: "Zonrox", price: 15, active: true },
];

// =====================
// Initialize with default services (insert if not exist)
// =====================
export const initializeServices = async () => {
  try {
    // Check if services exist
    const { data: existing } = await supabase.from("services").select("*");
    if (existing.length === 0) {
      const { error } = await supabase
        .from("services")
        .insert(DEFAULT_SERVICES);
      if (error) throw error;
      console.log("✅ Default services initialized in Supabase");
    }
  } catch (error) {
    console.error("Error initializing services:", error);
  }
};

// Reset services (clears and re-adds default services)
export const resetServices = async () => {
  await supabase.from("services").delete().neq("id", 0); // Delete all
  const { error } = await supabase.from("services").insert(DEFAULT_SERVICES);
  if (error) throw error;
  console.log("✅ Services reset to default in Supabase");
};

// =====================
// SERVICES OPERATIONS
// =====================
export const getServices = async () => {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("active", true);
  if (error) throw error;
  return data;
};

export const addService = async (service) => {
  const { data, error } = await supabase
    .from("services")
    .insert({ ...service, active: true })
    .select();
  if (error) throw error;
  return data[0];
};

export const updateService = async (id, updates) => {
  const { error } = await supabase
    .from("services")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
};

export const deleteService = async (id) => {
  const { error } = await supabase
    .from("services")
    .update({ active: false })
    .eq("id", id);
  if (error) throw error;
};

// =====================
// ORDERS OPERATIONS
// =====================

// Generate unique receipt number
const generateReceiptNumber = async () => {
  const today = new Date();
  const datePrefix = `${today.getFullYear()}${String(
    today.getMonth() + 1,
  ).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

  // Get count of orders for today from Supabase
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const endOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  );
  const { data: todayOrders } = await supabase
    .from("orders")
    .select("id")
    .gte("created_at", startOfDay.toISOString())
    .lt("created_at", endOfDay.toISOString());

  const orderNum = String((todayOrders?.length || 0) + 1).padStart(3, "0");
  return `ORD-${datePrefix}-${orderNum}`;
};

export const createOrder = async (orderData) => {
  const receiptNumber = await generateReceiptNumber();
  const order = {
    receipt_number: receiptNumber,
    customer_name: orderData.customer,
    phone: orderData.phone,
    items: orderData.items,
    total: orderData.total,
    payment_method: orderData.method,
    gcash_number: orderData.gcashNumber || null,
    gcash_ref_number: orderData.gcashRefNumber || null,
    status: "Received",
    created_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("orders").insert(order).select();
  if (error) throw error;
  return { id: data[0].id, receiptNumber };
};

export const getOrders = async () => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((order) => ({
    id: order.id,
    receiptNumber: order.receipt_number,
    customerName: order.customer_name,
    phone: order.phone,
    items: order.items,
    total: order.total,
    paymentMethod: order.payment_method,
    status: order.status,
    createdAt: order.created_at,
    gcashNumber: order.gcash_number,
    gcashRefNumber: order.gcash_ref_number,
  }));
};

export const getOrdersByStatus = async (status) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("status", status);
  if (error) throw error;
  return data.map((order) => ({
    id: order.id,
    receiptNumber: order.receipt_number,
    customerName: order.customer_name,
    phone: order.phone,
    items: order.items,
    total: order.total,
    paymentMethod: order.payment_method,
    status: order.status,
    createdAt: order.created_at,
    gcashNumber: order.gcash_number,
    gcashRefNumber: order.gcash_ref_number,
  }));
};

export const updateOrderStatus = async (id, status) => {
  const updateData = { status };
  if (status === "Released") {
    updateData.released_at = new Date().toISOString();
  }
  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", id);
  if (error) throw error;
};

// Update order payment (for cashier functionality)
export const updateOrderPayment = async (id, paymentData) => {
  const updateData = {
    payment_method: paymentData.method,
    amount_paid: paymentData.amountPaid,
    change: paymentData.change,
    paid_at: new Date().toISOString(),
  };

  // Add GCash details if applicable
  if (paymentData.method === "GCash") {
    updateData.gcash_number = paymentData.gcashNumber || null;
    updateData.gcash_ref_number = paymentData.gcashRefNumber || null;
  }

  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", id);
  if (error) throw error;
};

// Track order by receipt number (for customer tracking)
export const trackOrder = async (receiptNumber) => {
  // Try exact match first
  let { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("receipt_number", receiptNumber)
    .single();

  if (error || !data) {
    // Try by ID if numeric
    if (!isNaN(receiptNumber)) {
      const result = await supabase
        .from("orders")
        .select("*")
        .eq("id", parseInt(receiptNumber))
        .single();
      data = result.data;
    }
  }

  if (!data) return null;

  return {
    id: data.id,
    receiptNumber: data.receipt_number,
    customerName: data.customer_name,
    phone: data.phone,
    items: data.items,
    total: data.total,
    paymentMethod: data.payment_method,
    status: data.status,
    createdAt: data.created_at,
    gcashNumber: data.gcash_number,
    gcashRefNumber: data.gcash_ref_number,
    amountPaid: data.amount_paid,
    change: data.change,
    paidAt: data.paid_at,
  };
};

export const deleteOrder = async (id) => {
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) throw error;
};

// =====================
// REPORTS OPERATIONS
// =====================
export const getDailyReport = async () => {
  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const endOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  );

  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .not("paid_at", "is", null)
    .gte("paid_at", startOfDay.toISOString())
    .lt("paid_at", endOfDay.toISOString());

  if (error) throw error;

  // Group by payment method
  const report = {};
  orders.forEach((order) => {
    const method = order.payment_method || "Cash";
    if (!report[method]) {
      report[method] = { method, total: 0, count: 0 };
    }
    report[method].total += Number(order.total);
    report[method].count += 1;
  });

  return Object.values(report);
};

export const getOrderStats = async () => {
  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const endOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  );

  const { data: orders, error } = await supabase
    .from("orders")
    .select("status")
    .gte("created_at", startOfDay.toISOString())
    .lt("created_at", endOfDay.toISOString());

  if (error) throw error;

  const stats = {
    total: orders.length,
    received: 0,
    washing: 0,
    drying: 0,
    ready: 0,
    released: 0,
  };

  orders.forEach((order) => {
    const status = order.status.toLowerCase();
    if (stats.hasOwnProperty(status)) {
      stats[status]++;
    }
  });

  return stats;
};

// =====================
// EXPORT REPORTS
// =====================
export const getOrdersForExport = async (startDate, endDate) => {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .not("paid_at", "is", null)
    .gte("paid_at", startDate.toISOString())
    .lte("paid_at", endDate.toISOString());

  if (error) throw error;

  return orders.map((order) => ({
    id: order.id,
    receiptNumber: order.receipt_number,
    customerName: order.customer_name,
    phone: order.phone,
    items: order.items,
    total: order.total,
    paymentMethod: order.payment_method,
    status: order.status,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    amountPaid: order.amount_paid,
    change: order.change,
    gcashNumber: order.gcash_number,
    gcashRefNumber: order.gcash_ref_number,
  }));
};

export const getDailyOrdersForExport = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return await getOrdersForExport(today, tomorrow);
};

export const getMonthlyOrdersForExport = async () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
  );

  return await getOrdersForExport(startOfMonth, endOfMonth);
};

// =====================
// CLEAR DATA (for testing)
// =====================
export const clearAllOrders = async () => {
  const { error } = await supabase.from("orders").delete().neq("id", 0);
  if (error) throw error;
};

export const clearInventory = async () => {
  await supabase.from("inventory").delete().neq("id", 0);
  await supabase.from("inventory_logs").delete().neq("id", 0);
  return true;
};

export const resetDatabase = async () => {
  await initializeServices();
};

// =====================
// CLEAR DATA (for testing)
// =====================
// INVENTORY OPERATIONS
// =====================

// Get all inventory items
export const getInventory = async () => {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

// Get inventory by type (e.g., 'downy')
export const getInventoryByType = async (type) => {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .eq("type", type);
  if (error) throw error;
  return data;
};

// Get single inventory item
export const getInventoryItem = async (id) => {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
};

// Add new inventory item
export const addInventoryItem = async (name, type, quantity, unit) => {
  const newItem = {
    name,
    type,
    quantity: quantity || 0,
    unit: unit || "pcs",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("inventory")
    .insert(newItem)
    .select();
  if (error) throw error;

  const item = data[0];

  // Log the initial stock if quantity > 0
  if (quantity > 0) {
    await supabase.from("inventory_logs").insert({
      inventory_id: item.id,
      action: "add",
      quantity: quantity,
      note: `Initial stock for ${name}`,
      customer_name: "",
      created_at: new Date().toISOString(),
    });
  }

  return item;
};

// Add stock to inventory
export const addStock = async (id, quantity, note = "", customerName = "") => {
  const item = await getInventoryItem(id);
  if (!item) throw new Error("Inventory item not found");

  const newQuantity = item.quantity + quantity;
  const { error } = await supabase
    .from("inventory")
    .update({
      quantity: newQuantity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;

  // Log the action
  await supabase.from("inventory_logs").insert({
    inventory_id: id,
    action: "add",
    quantity: quantity,
    note: note || `Added ${quantity} ${item.unit}`,
    customerName: customerName || "",
    createdAt: new Date().toISOString(),
  });

  return newQuantity;
};

// Deduct stock from inventory
export const deductStock = async (
  id,
  quantity,
  note = "",
  customerName = "",
) => {
  const item = await getInventoryItem(id);
  if (!item) throw new Error("Inventory item not found");

  const newQuantity = Math.max(0, item.quantity - quantity);
  const { error } = await supabase
    .from("inventory")
    .update({
      quantity: newQuantity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;

  // Log the action
  await supabase.from("inventory_logs").insert({
    inventory_id: id,
    action: "deduct",
    quantity: quantity,
    note: note || `Deducted ${quantity} ${item.unit}`,
    customer_name: customerName || "",
    created_at: new Date().toISOString(),
  });

  return newQuantity;
};

// Update inventory item quantity directly
export const updateInventoryQuantity = async (id, quantity) => {
  const { error } = await supabase
    .from("inventory")
    .update({
      quantity: quantity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
};

// Get inventory logs
export const getInventoryLogs = async (inventoryId = null) => {
  let query = supabase
    .from("inventory_logs")
    .select("*")
    .order("created_at", { ascending: false });
  if (inventoryId) {
    query = query.eq("inventory_id", inventoryId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// Deduct inventory for an order (auto-deduct for Wash, Dry & Fold and add-ons)
export const deductInventoryForOrder = async (
  items,
  selectedDownyId,
  customerName = "",
) => {
  const inventory = await getInventory();

  for (const item of items) {
    const itemName = item.name.toLowerCase();

    // Check if it's Wash, Dry & Fold service
    if (
      itemName.includes("wash") &&
      itemName.includes("dry") &&
      itemName.includes("fold")
    ) {
      // Deduct liquid detergent
      const detergent = inventory.find((inv) => inv.type === "detergent");
      if (detergent) {
        await deductStock(
          detergent.id,
          item.loads,
          `Order: ${item.loads}x Wash, Dry & Fold`,
          customerName,
        );
      }

      // Deduct selected downy
      if (selectedDownyId) {
        await deductStock(
          selectedDownyId,
          item.loads,
          `Order: ${item.loads}x Wash, Dry & Fold`,
          customerName,
        );
      }
    }

    // Check if it's a standalone Downy add-on (not included in Wash, Dry & Fold)
    if (itemName === "downy") {
      // If no downy was selected for WDF, use the first available downy
      const downyItems = inventory.filter((inv) => inv.type === "downy");
      if (downyItems.length > 0) {
        const targetDowny = selectedDownyId
          ? downyItems.find((d) => d.id === selectedDownyId) || downyItems[0]
          : downyItems[0];
        await deductStock(
          targetDowny.id,
          item.loads,
          `Add-on: ${item.loads}x Downy`,
          customerName,
        );
      }
    }

    // Check if it's Liquid Detergent add-on
    if (itemName === "liquid detergent") {
      const detergent = inventory.find((inv) => inv.type === "detergent");
      if (detergent) {
        await deductStock(
          detergent.id,
          item.loads,
          `Add-on: ${item.loads}x Liquid Detergent`,
          customerName,
        );
      }
    }
  }
};

// Deduct single add-on item from inventory (for POS add-on clicks)
export const deductAddOnFromInventory = async (
  serviceName,
  quantity = 1,
  customerName = "",
) => {
  const inventory = await getInventory();
  const name = serviceName.toLowerCase();

  if (name === "downy" || name.includes("downy")) {
    // Will be handled by selectedDownyId in order - skip here
    return null;
  }

  if (name === "liquid detergent" || name.includes("detergent")) {
    const detergent = inventory.find((inv) => inv.type === "detergent");
    if (detergent) {
      return await deductStock(
        detergent.id,
        quantity,
        `POS Add-on: Liquid Detergent`,
        customerName,
      );
    }
  }

  return null;
};

// Get inventory item by name
export const getInventoryByName = async (name) => {
  const inventory = await getInventory();
  return inventory.find((inv) => inv.name.toLowerCase() === name.toLowerCase());
};

// Reset inventory to default
export const resetInventory = async () => {
  const { error } = await supabase.from("inventory").delete().neq("id", 0);
  if (error) throw error;
  const { error2 } = await supabase
    .from("inventory_logs")
    .delete()
    .neq("id", 0);
  if (error2) throw error2;
  console.log("✅ Inventory reset to default");
};

// =====================
// TIME TRACKING FUNCTIONS
// =====================

// Get all time records
export const getTimeRecords = async () => {
  try {
    const { data, error } = await supabase
      .from("time_records")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data.map((record) => ({
      id: record.id,
      staffName: record.staff_name,
      date: record.date,
      timeIn: record.time_in,
      timeOut: record.time_out,
      totalHours: record.total_hours,
      status: record.status,
      notes: record.notes,
      timeInPhoto: record.time_in_photo,
      timeOutPhoto: record.time_out_photo,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    }));
  } catch (error) {
    console.error("Failed to get time records:", error);
    return [];
  }
};

// Get time records for a specific date
export const getTimeRecordsByDate = async (date) => {
  try {
    const { data, error } = await supabase
      .from("time_records")
      .select("*")
      .eq("date", date);
    if (error) throw error;
    return data.map((record) => ({
      id: record.id,
      staffName: record.staff_name,
      date: record.date,
      timeIn: record.time_in,
      timeOut: record.time_out,
      totalHours: record.total_hours,
      status: record.status,
      notes: record.notes,
      timeInPhoto: record.time_in_photo,
      timeOutPhoto: record.time_out_photo,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    }));
  } catch (error) {
    console.error("Failed to get time records by date:", error);
    return [];
  }
};

// Get time records for a specific staff member
export const getTimeRecordsByStaff = async (staffName) => {
  try {
    const { data, error } = await supabase
      .from("time_records")
      .select("*")
      .eq("staff_name", staffName);
    if (error) throw error;
    return data.map((record) => ({
      id: record.id,
      staffName: record.staff_name,
      date: record.date,
      timeIn: record.time_in,
      timeOut: record.time_out,
      totalHours: record.total_hours,
      status: record.status,
      notes: record.notes,
      timeInPhoto: record.time_in_photo,
      timeOutPhoto: record.time_out_photo,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    }));
  } catch (error) {
    console.error("Failed to get time records by staff:", error);
    return [];
  }
};

// Get active time record for a staff member (no time_out yet)
export const getActiveTimeRecord = async (staffName) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("time_records")
      .select("*")
      .eq("staff_name", staffName)
      .eq("date", today)
      .eq("status", "active")
      .single();
    if (error && error.code !== "PGRST116") throw error; // PGRST116 is no rows
    if (!data) return null;
    return {
      id: data.id,
      staffName: data.staff_name,
      date: data.date,
      timeIn: data.time_in,
      timeOut: data.time_out,
      totalHours: data.total_hours,
      status: data.status,
      notes: data.notes,
      timeInPhoto: data.time_in_photo,
      timeOutPhoto: data.time_out_photo,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error("Failed to get active time record:", error);
    return null;
  }
};

// Clock in staff
export const clockInStaff = async (
  staffName,
  notes = "",
  timeInPhoto = null,
) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    // Check if already clocked in
    const existing = await getActiveTimeRecord(staffName);
    if (existing) {
      throw new Error(`${staffName} is already clocked in`);
    }

    const record = {
      staff_name: staffName,
      date: today,
      time_in: now,
      time_out: null,
      total_hours: 0,
      status: "active",
      notes,
      time_in_photo: timeInPhoto,
      time_out_photo: null,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from("time_records")
      .insert(record)
      .select();
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Failed to clock in:", error);
    throw error;
  }
};

// Clock out staff
export const clockOutStaff = async (
  staffName,
  notes = "",
  timeOutPhoto = null,
) => {
  try {
    const now = new Date().toISOString();
    const activeRecord = await getActiveTimeRecord(staffName);

    if (!activeRecord) {
      throw new Error(`${staffName} is not clocked in`);
    }

    const timeIn = new Date(activeRecord.timeIn);
    const timeOut = new Date(now);
    const totalHours = (timeOut - timeIn) / (1000 * 60 * 60); // Convert to hours

    const updatedRecord = {
      time_out: now,
      total_hours: Math.round(totalHours * 100) / 100, // Round to 2 decimal places
      status: "completed",
      notes: notes || activeRecord.notes,
      time_out_photo: timeOutPhoto,
      updated_at: now,
    };

    const { error } = await supabase
      .from("time_records")
      .update(updatedRecord)
      .eq("id", activeRecord.id);
    if (error) throw error;
    return { ...activeRecord, ...updatedRecord };
  } catch (error) {
    console.error("Failed to clock out staff:", error);
    throw error;
  }
};

// Update time record notes
export const updateTimeRecordNotes = async (id, notes) => {
  try {
    await db.timeRecords.update(id, {
      notes,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to update time record notes:", error);
    throw error;
  }
};

// Delete time record
export const deleteTimeRecord = async (id) => {
  try {
    const { error } = await supabase.from("time_records").delete().eq("id", id);
    if (error) throw error;
  } catch (error) {
    console.error("Failed to delete time record:", error);
    throw error;
  }
};

// Get time records for date range
export const getTimeRecordsByDateRange = async (startDate, endDate) => {
  try {
    const { data, error } = await supabase
      .from("time_records")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });
    if (error) throw error;
    return data.map((record) => ({
      id: record.id,
      staffName: record.staff_name,
      date: record.date,
      timeIn: record.time_in,
      timeOut: record.time_out,
      totalHours: record.total_hours,
      status: record.status,
      notes: record.notes,
      timeInPhoto: record.time_in_photo,
      timeOutPhoto: record.time_out_photo,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    }));
  } catch (error) {
    console.error("Failed to get time records by date range:", error);
    return [];
  }
};

// Get staff attendance summary
export const getStaffAttendanceSummary = async (startDate, endDate) => {
  try {
    const records = await getTimeRecordsByDateRange(startDate, endDate);
    const summary = {};

    records.forEach((record) => {
      if (!summary[record.staffName]) {
        summary[record.staffName] = {
          staffName: record.staffName,
          totalDays: 0,
          totalHours: 0,
          completedRecords: 0,
        };
      }

      summary[record.staffName].totalDays += 1;
      summary[record.staffName].totalHours += record.totalHours || 0;
      if (record.status === "completed") {
        summary[record.staffName].completedRecords += 1;
      }
    });

    return Object.values(summary);
  } catch (error) {
    console.error("Failed to get staff attendance summary:", error);
    return [];
  }
};
