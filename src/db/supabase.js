// =====================
// Supabase Configuration
// =====================

import { createClient } from "@supabase/supabase-js";

// Supabase project credentials
const SUPABASE_URL = "https://gyzrddwuctcsldrvdgfb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_kTWfDaA7a3WUqkhgVE1q0w_HFTO_z1g";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================
// ORDERS API
// =====================

// Track order by receipt number (for customers)
export const trackOrderFromSupabase = async (receiptNumber) => {
  try {
    // Try exact match first
    let { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("receipt_number", receiptNumber)
      .single();

    // If not found, try by ID
    if (error || !data) {
      const numericId = parseInt(receiptNumber);
      if (!isNaN(numericId)) {
        const result = await supabase
          .from("orders")
          .select("*")
          .eq("id", numericId)
          .single();
        data = result.data;
        error = result.error;
      }
    }

    if (error || !data) {
      return null;
    }

    // Transform to match frontend expected format
    return {
      id: data.id,
      receiptNumber: data.receipt_number,
      customerName: data.customer_name,
      phone: data.phone,
      total: data.total,
      status: data.status,
      createdAt: data.created_at,
      items: data.items,
    };
  } catch (error) {
    console.error("❌ Track order error:", error);
    return null;
  }
};

// Sync order to Supabase (upsert)
export const syncOrderToSupabase = async (order) => {
  try {
    const { data, error } = await supabase.from("orders").upsert(
      {
        receipt_number: order.receiptNumber,
        customer_name: order.customerName,
        phone: order.phone,
        total: order.total,
        status: order.status,
        payment_method: order.paymentMethod,
        items: order.items,
        created_at: order.createdAt,
      },
      {
        onConflict: "receipt_number",
      }
    );

    if (error) {
      console.error("❌ Supabase sync error:", error);
      return false;
    }

    console.log("✅ Order synced to Supabase");
    return true;
  } catch (error) {
    console.error("❌ Supabase sync failed:", error);
    return false;
  }
};

// Update order status in Supabase
export const updateOrderStatusInSupabase = async (receiptNumber, status) => {
  try {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("receipt_number", receiptNumber);

    if (error) {
      console.error("❌ Status update error:", error);
      return false;
    }

    console.log("✅ Status updated in Supabase");
    return true;
  } catch (error) {
    console.error("❌ Status update failed:", error);
    return false;
  }
};

// Get all orders from Supabase (for admin)
export const getOrdersFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Get orders error:", error);
      return [];
    }

    return data.map((order) => ({
      id: order.id,
      receiptNumber: order.receipt_number,
      customerName: order.customer_name,
      phone: order.phone,
      total: order.total,
      status: order.status,
      paymentMethod: order.payment_method,
      items: order.items,
      createdAt: order.created_at,
    }));
  } catch (error) {
    console.error("❌ Get orders failed:", error);
    return [];
  }
};
