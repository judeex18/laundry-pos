// =====================
// Dexie Database - Fully Offline POS
// =====================

import Dexie from "dexie";

// Create database
const db = new Dexie("LaundryPOS");

// Define schema - increment version to force update
db.version(2).stores({
  services: "++id, name, price, active",
  orders: "++id, status, customerName, phone, total, paymentMethod, createdAt",
});

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
export const createOrder = async (orderData) => {
  const order = {
    customerName: orderData.customer,
    phone: orderData.phone,
    items: orderData.items,
    total: orderData.total,
    paymentMethod: orderData.method,
    status: "Received",
    createdAt: new Date().toISOString(),
  };
  return await db.orders.add(order);
};

export const getOrders = async () => {
  return await db.orders.orderBy("createdAt").reverse().toArray();
};

export const getOrdersByStatus = async (status) => {
  return await db.orders.where("status").equals(status).toArray();
};

export const updateOrderStatus = async (id, status) => {
  return await db.orders.update(id, { status });
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

  const orders = allOrders.filter((order) => {
    const orderDate = new Date(order.createdAt);
    const orderDateStr = `${orderDate.getFullYear()}-${String(
      orderDate.getMonth() + 1
    ).padStart(2, "0")}-${String(orderDate.getDate()).padStart(2, "0")}`;
    return orderDateStr === todayStr && order.status === "Released";
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
    const orderDate = new Date(order.createdAt);
    return (
      orderDate >= startDate &&
      orderDate <= endDate &&
      order.status === "Released"
    );
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

export const resetDatabase = async () => {
  await db.orders.clear();
  await db.services.clear();
  await initializeServices();
};

// Export database instance
export default db;
