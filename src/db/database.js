// =====================
// Dexie Database - Fully Offline POS
// =====================

import Dexie from "dexie";

// Create database
const db = new Dexie("LaundryPOS");

// Define schema - increment version to force update
db.version(7).stores({
  services: "++id, name, price, active",
  orders:
    "++id, receiptNumber, status, customerName, phone, total, paymentMethod, createdAt",
  inventory: "++id, name, type, quantity, unit, createdAt, updatedAt",
  inventoryLogs:
    "++id, inventoryId, action, quantity, note, customerName, createdAt",
  timeRecords:
    "++id, [staffName+date], staffName, date, timeIn, timeOut, totalHours, status, notes, timeInPhoto, timeOutPhoto, createdAt, updatedAt",
});

// Default inventory items (empty - user will add manually)
const DEFAULT_INVENTORY = [];

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

// Lock to prevent concurrent initialization
let isInitializing = false;
let initPromise = null;

// =====================
// Initialize with default services
// =====================
export const initializeServices = async () => {
  // If already initializing, wait for it to complete
  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;
  initPromise = (async () => {
    try {
      const existing = await db.services.toArray();

      // Check for duplicates or wrong count
      const names = existing.map((s) => s.name);
      const hasDuplicates = names.length !== new Set(names).size;
      const wrongCount = existing.length !== DEFAULT_SERVICES.length;

      if (existing.length === 0 || hasDuplicates || wrongCount) {
        await db.services.clear();
        await db.services.bulkAdd(DEFAULT_SERVICES);
        console.log("✅ Default services initialized (cleaned)");
      }
    } finally {
      isInitializing = false;
    }
  })();

  return initPromise;
};

// Reset services (clears and re-adds default services)
export const resetServices = async () => {
  await db.services.clear();
  await db.services.bulkAdd(DEFAULT_SERVICES);
  console.log("✅ Services reset to default");
};

// =====================
// SERVICES OPERATIONS
// =====================
export const getServices = async () => {
  const all = await db.services.toArray();
  return all.filter((s) => s.active === true);
};

export const addService = async (service) => {
  return await db.services.add({ ...service, active: true });
};

export const updateService = async (id, updates) => {
  return await db.services.update(id, updates);
};

export const deleteService = async (id) => {
  return await db.services.update(id, { active: false });
};

// =====================
// ORDERS OPERATIONS
// =====================

// Generate unique receipt number
const generateReceiptNumber = async () => {
  const today = new Date();
  const datePrefix = `${today.getFullYear()}${String(
    today.getMonth() + 1
  ).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

  // Get count of orders for today
  const allOrders = await db.orders.toArray();
  const todayOrders = allOrders.filter((order) => {
    const orderDate = new Date(order.createdAt);
    return (
      orderDate.getFullYear() === today.getFullYear() &&
      orderDate.getMonth() === today.getMonth() &&
      orderDate.getDate() === today.getDate()
    );
  });

  const orderNum = String(todayOrders.length + 1).padStart(3, "0");
  return `ORD-${datePrefix}-${orderNum}`;
};

import { syncOrderToSupabase, getOrdersFromSupabase } from "./supabase";

export const createOrder = async (orderData) => {
  const receiptNumber = await generateReceiptNumber();
  const order = {
    receiptNumber,
    customerName: orderData.customer,
    phone: orderData.phone,
    items: orderData.items,
    total: orderData.total,
    paymentMethod: orderData.method,
    gcashNumber: orderData.gcashNumber || null,
    gcashRefNumber: orderData.gcashRefNumber || null,
    status: "Received",
    createdAt: new Date().toISOString(),
  };
  const id = await db.orders.add(order);

  // Sync to Supabase (non-blocking)
  syncOrderToSupabase(order).catch(() => {
    console.log("⚠️ Supabase sync failed, order saved locally");
  });

  return { id, receiptNumber };
};

// Sync orders from Supabase to local IndexedDB
export const syncOrdersFromSupabase = async () => {
  try {
    const supabaseOrders = await getOrdersFromSupabase();

    if (supabaseOrders.length === 0) {
      console.log("ℹ️ No orders found in Supabase");
      return;
    }

    // Get existing local orders to avoid duplicates
    const localOrders = await db.orders.toArray();
    const localReceiptNumbers = new Set(
      localOrders.map((o) => o.receiptNumber)
    );

    // Filter out orders that already exist locally
    const newOrders = supabaseOrders.filter(
      (order) => !localReceiptNumbers.has(order.receiptNumber)
    );

    if (newOrders.length === 0) {
      console.log("ℹ️ All Supabase orders already exist locally");
      return;
    }

    // Transform Supabase orders to match local schema
    const ordersToAdd = newOrders.map((order) => ({
      receiptNumber: order.receiptNumber,
      customerName: order.customerName,
      phone: order.phone,
      items: order.items,
      total: order.total,
      paymentMethod: order.paymentMethod,
      status: order.status,
      createdAt: order.createdAt,
      // Add any missing fields with defaults
      gcashNumber: order.gcashNumber || null,
      gcashRefNumber: order.gcashRefNumber || null,
      amountPaid: order.amountPaid || null,
      change: order.change || null,
    }));

    await db.orders.bulkAdd(ordersToAdd);
    console.log(
      `✅ Synced ${ordersToAdd.length} orders from Supabase to local DB`
    );

    return ordersToAdd.length;
  } catch (error) {
    console.error("❌ Failed to sync orders from Supabase:", error);
    return 0;
  }
};

export const getOrders = async () => {
  return await db.orders.orderBy("createdAt").reverse().toArray();
};

export const getOrdersByStatus = async (status) => {
  return await db.orders.where("status").equals(status).toArray();
};

export const updateOrderStatus = async (id, status) => {
  const updateData = { status };

  // Add releasedAt timestamp when order is released
  if (status === "Released") {
    updateData.releasedAt = new Date().toISOString();
  }

  const result = await db.orders.update(id, updateData);

  // Get the updated order and sync to Supabase
  const order = await db.orders.get(id);
  if (order) {
    syncOrderToSupabase(order).catch(() => {
      console.log("⚠️ Status sync failed, updated locally");
    });
  }

  return result;
};

// Update order payment (for cashier functionality)
export const updateOrderPayment = async (id, paymentData) => {
  const updateData = {
    paymentMethod: paymentData.method,
    amountPaid: paymentData.amountPaid,
    change: paymentData.change,
    paidAt: new Date().toISOString(),
  };

  // Add GCash details if applicable
  if (paymentData.method === "GCash") {
    updateData.gcashNumber = paymentData.gcashNumber || null;
    updateData.gcashRefNumber = paymentData.gcashRefNumber || null;
  }

  const result = await db.orders.update(id, updateData);

  // Get the updated order and sync to Supabase
  const order = await db.orders.get(id);
  if (order) {
    syncOrderToSupabase(order).catch(() => {
      console.log("⚠️ Payment sync failed, updated locally");
    });
  }

  return result;
};

// Track order by receipt number (for customer tracking)
export const trackOrder = async (receiptNumber) => {
  // Try exact match first
  let order = await db.orders
    .where("receiptNumber")
    .equals(receiptNumber)
    .first();

  // If not found, try case-insensitive search
  if (!order) {
    const allOrders = await db.orders.toArray();
    order = allOrders.find(
      (o) => o.receiptNumber?.toLowerCase() === receiptNumber.toLowerCase()
    );
  }

  // Also try searching by ID if input is numeric
  if (!order && !isNaN(receiptNumber)) {
    order = await db.orders.get(parseInt(receiptNumber));
  }

  return order;
};

export const deleteOrder = async (id) => {
  return await db.orders.delete(id);
};

// =====================
// REPORTS OPERATIONS
// =====================
export const getDailyReport = async () => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const allOrders = await db.orders.toArray();

  // Filter orders that were PAID today (revenue is recognized on payment date)
  const orders = allOrders.filter((order) => {
    // Only count paid orders (must have paidAt date)
    if (!order.paidAt) return false;

    // Use paidAt date for revenue recognition
    const paidDate = new Date(order.paidAt);
    const paidDateStr = `${paidDate.getFullYear()}-${String(
      paidDate.getMonth() + 1
    ).padStart(2, "0")}-${String(paidDate.getDate()).padStart(2, "0")}`;
    return paidDateStr === todayStr;
  });

  // Group by payment method
  const report = {};
  orders.forEach((order) => {
    const method = order.paymentMethod || "Cash";
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
  const todayStr = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const allOrders = await db.orders.toArray();

  // Filter to today's orders only
  const orders = allOrders.filter((order) => {
    const orderDate = new Date(order.createdAt);
    const orderDateStr = `${orderDate.getFullYear()}-${String(
      orderDate.getMonth() + 1
    ).padStart(2, "0")}-${String(orderDate.getDate()).padStart(2, "0")}`;
    return orderDateStr === todayStr;
  });

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
  const orders = await db.orders.toArray();

  return orders.filter((order) => {
    // Only include paid orders in revenue export
    if (!order.paidAt) return false;

    // Use paidAt date for revenue recognition
    const paidDate = new Date(order.paidAt);
    return paidDate >= startDate && paidDate <= endDate;
  });
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
    59
  );

  return await getOrdersForExport(startOfMonth, endOfMonth);
};

// =====================
// CLEAR DATA (for testing)
// =====================
export const clearAllOrders = async () => {
  return await db.orders.clear();
};

export const clearInventory = async () => {
  await db.inventory.clear();
  await db.inventoryLogs.clear();
  localStorage.setItem("inventoryCleared", "true");
  return true;
};

export const resetDatabase = async () => {
  await db.orders.clear();
  await db.services.clear();
  await initializeServices();
};

// Export database instance
export default db;

// =====================
// INVENTORY OPERATIONS
// =====================

// Initialize inventory with default items (only on first run, not after clear)
export const initializeInventory = async () => {
  try {
    // Check if inventory was intentionally cleared
    const wasCleared = localStorage.getItem("inventoryCleared");
    if (wasCleared === "true") {
      return; // Don't auto-initialize if user cleared inventory
    }

    const existing = await db.inventory.toArray();
    if (existing.length === 0) {
      const now = new Date().toISOString();
      const itemsWithTimestamp = DEFAULT_INVENTORY.map((item) => ({
        ...item,
        createdAt: now,
        updatedAt: now,
      }));
      await db.inventory.bulkAdd(itemsWithTimestamp);
      console.log("✅ Default inventory initialized");
    }
  } catch (error) {
    console.error("Failed to initialize inventory:", error);
  }
};

// Get all inventory items
export const getInventory = async () => {
  await initializeInventory();
  return await db.inventory.toArray();
};

// Get inventory by type (e.g., 'downy')
export const getInventoryByType = async (type) => {
  await initializeInventory();
  return await db.inventory.where("type").equals(type).toArray();
};

// Get single inventory item
export const getInventoryItem = async (id) => {
  return await db.inventory.get(id);
};

// Add new inventory item
export const addInventoryItem = async (name, type, quantity, unit) => {
  // Clear the "inventoryCleared" flag when user adds new item
  localStorage.removeItem("inventoryCleared");

  const newItem = {
    name,
    type,
    quantity: quantity || 0,
    unit: unit || "pcs",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const id = await db.inventory.add(newItem);

  // Log the initial stock if quantity > 0
  if (quantity > 0) {
    await db.inventoryLogs.add({
      inventoryId: id,
      action: "add",
      quantity: quantity,
      note: `Initial stock for ${name}`,
      customerName: "",
      createdAt: new Date().toISOString(),
    });
  }

  return { id, ...newItem };
};

// Add stock to inventory
export const addStock = async (id, quantity, note = "", customerName = "") => {
  const item = await db.inventory.get(id);
  if (!item) throw new Error("Inventory item not found");

  const newQuantity = item.quantity + quantity;
  await db.inventory.update(id, {
    quantity: newQuantity,
    updatedAt: new Date().toISOString(),
  });

  // Log the action
  await db.inventoryLogs.add({
    inventoryId: id,
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
  customerName = ""
) => {
  const item = await db.inventory.get(id);
  if (!item) throw new Error("Inventory item not found");

  const newQuantity = Math.max(0, item.quantity - quantity);
  await db.inventory.update(id, {
    quantity: newQuantity,
    updatedAt: new Date().toISOString(),
  });

  // Log the action
  await db.inventoryLogs.add({
    inventoryId: id,
    action: "deduct",
    quantity: quantity,
    note: note || `Deducted ${quantity} ${item.unit}`,
    customerName: customerName || "",
    createdAt: new Date().toISOString(),
  });

  return newQuantity;
};

// Update inventory item quantity directly
export const updateInventoryQuantity = async (id, quantity) => {
  return await db.inventory.update(id, {
    quantity: quantity,
    updatedAt: new Date().toISOString(),
  });
};

// Get inventory logs
export const getInventoryLogs = async (inventoryId = null) => {
  if (inventoryId) {
    return await db.inventoryLogs
      .where("inventoryId")
      .equals(inventoryId)
      .reverse()
      .toArray();
  }
  return await db.inventoryLogs.orderBy("createdAt").reverse().toArray();
};

// Deduct inventory for an order (auto-deduct for Wash, Dry & Fold and add-ons)
export const deductInventoryForOrder = async (
  items,
  selectedDownyId,
  customerName = ""
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
          customerName
        );
      }

      // Deduct selected downy
      if (selectedDownyId) {
        await deductStock(
          selectedDownyId,
          item.loads,
          `Order: ${item.loads}x Wash, Dry & Fold`,
          customerName
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
          customerName
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
          customerName
        );
      }
    }
  }
};

// Deduct single add-on item from inventory (for POS add-on clicks)
export const deductAddOnFromInventory = async (
  serviceName,
  quantity = 1,
  customerName = ""
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
        customerName
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
  await db.inventory.clear();
  await db.inventoryLogs.clear();
  await initializeInventory();
  console.log("✅ Inventory reset to default");
};

// =====================
// SYNC ALL ORDERS TO SUPABASE
// =====================
export const syncAllOrdersToSupabase = async () => {
  try {
    const orders = await db.orders.toArray();
    let synced = 0;
    let failed = 0;

    for (const order of orders) {
      const success = await syncOrderToSupabase(order);
      if (success) {
        synced++;
      } else {
        failed++;
      }
    }

    console.log(`✅ Synced ${synced} orders to Supabase, ${failed} failed`);
    return { synced, failed };
  } catch (error) {
    console.error("❌ Bulk sync failed:", error);
    return { synced: 0, failed: 0, error };
  }
};

// =====================
// TIME TRACKING FUNCTIONS
// =====================

// Get all time records
export const getTimeRecords = async () => {
  try {
    return await db.timeRecords.toArray();
  } catch (error) {
    console.error("Failed to get time records:", error);
    return [];
  }
};

// Get time records for a specific date
export const getTimeRecordsByDate = async (date) => {
  try {
    return await db.timeRecords.where("date").equals(date).toArray();
  } catch (error) {
    console.error("Failed to get time records by date:", error);
    return [];
  }
};

// Get time records for a specific staff member
export const getTimeRecordsByStaff = async (staffName) => {
  try {
    return await db.timeRecords.where("staffName").equals(staffName).toArray();
  } catch (error) {
    console.error("Failed to get time records by staff:", error);
    return [];
  }
};

// Get active time record for a staff member (no time_out yet)
export const getActiveTimeRecord = async (staffName) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const records = await db.timeRecords
      .where("[staffName+date]")
      .equals([staffName, today])
      .and((record) => record.status === "active")
      .toArray();
    return records[0] || null;
  } catch (error) {
    console.error("Failed to get active time record:", error);
    return null;
  }
};

// Clock in staff
export const clockInStaff = async (
  staffName,
  notes = "",
  timeInPhoto = null
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
      staffName,
      date: today,
      timeIn: now,
      timeOut: null,
      totalHours: 0,
      status: "active",
      notes,
      timeInPhoto,
      timeOutPhoto: null,
      createdAt: now,
      updatedAt: now,
    };

    const id = await db.timeRecords.add(record);
    return { ...record, id };
  } catch (error) {
    console.error("Failed to clock in staff:", error);
    throw error;
  }
};

// Clock out staff
export const clockOutStaff = async (
  staffName,
  notes = "",
  timeOutPhoto = null
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
      ...activeRecord,
      timeOut: now,
      totalHours: Math.round(totalHours * 100) / 100, // Round to 2 decimal places
      status: "completed",
      notes: notes || activeRecord.notes,
      timeOutPhoto,
      updatedAt: now,
    };

    await db.timeRecords.update(activeRecord.id, updatedRecord);
    return updatedRecord;
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
    await db.timeRecords.delete(id);
  } catch (error) {
    console.error("Failed to delete time record:", error);
    throw error;
  }
};

// Get time records for date range
export const getTimeRecordsByDateRange = async (startDate, endDate) => {
  try {
    return await db.timeRecords
      .where("date")
      .between(startDate, endDate, true, true)
      .toArray();
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
