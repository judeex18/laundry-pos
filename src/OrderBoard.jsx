import { useEffect, useState } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  Box,
  Paper,
  Avatar,
  LinearProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import LocalLaundryServiceIcon from "@mui/icons-material/LocalLaundryService";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import ReceiptIcon from "@mui/icons-material/Receipt";
import PaidIcon from "@mui/icons-material/Paid";
import {
  getOrders,
  updateOrderStatus,
  updateOrderPayment,
} from "./db/database";
import ReceiptPreview from "./ReceiptPreview";

// Order workflow
const STATUSES = ["Received", "Washing", "Drying", "Ready", "Released"];

export default function OrderBoard() {
  const [orders, setOrders] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // =====================
  // LOAD ORDERS FROM INDEXEDDB
  // =====================
  const fetchOrders = async () => {
    try {
      const localOrders = await getOrders();
      setOrders(localOrders);
    } catch (error) {
      console.error("Failed to load orders:", error);
    }
  };

  // Auto-refresh every 5 seconds
  useEffect(() => {
    fetchOrders();
    const timer = setInterval(fetchOrders, 5000);
    return () => clearInterval(timer);
  }, []);

  // =====================
  // UPDATE STATUS
  // =====================
  const handleUpdateStatus = async (order, status) => {
    if (order.status === status) return;

    try {
      await updateOrderStatus(order.id, status);
      fetchOrders();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  // =====================
  // STATUS STYLING
  // =====================
  const statusConfig = {
    Received: {
      color: "default",
      bg: "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)",
      icon: "📥",
    },
    Washing: {
      color: "info",
      bg: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
      icon: "🧺",
    },
    Drying: {
      color: "warning",
      bg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      icon: "☀️",
    },
    Ready: {
      color: "success",
      bg: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      icon: "✅",
    },
    Released: {
      color: "secondary",
      bg: "linear-gradient(135deg, #375da5 0%, #2a4a8a 100%)",
      icon: "🎉",
    },
  };

  const getProgress = (status) => {
    const index = STATUSES.indexOf(status);
    return ((index + 1) / STATUSES.length) * 100;
  };

  // =====================
  // COUNT BY STATUS
  // =====================
  const getStatusCounts = () => {
    const counts = {};
    STATUSES.forEach((s) => (counts[s] = 0));
    orders.forEach((o) => {
      if (counts[o.status] !== undefined) counts[o.status]++;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  // =====================
  // CHECK IF ORDER IS PAID
  // =====================
  const isPaid = (order) => {
    return order.paymentMethod && order.paymentMethod !== "Unpaid";
  };

  // =====================
  // HANDLE PAYMENT UPDATE
  // =====================
  const handlePaymentUpdate = async (orderId, paymentData) => {
    try {
      await updateOrderPayment(orderId, paymentData);
      setSnackbar({
        open: true,
        message: `Payment recorded! Method: ${paymentData.method}`,
        severity: "success",
      });
      fetchOrders();
      setSelectedReceipt(null);
    } catch (error) {
      console.error("Failed to update payment:", error);
      setSnackbar({
        open: true,
        message: "Failed to update payment",
        severity: "error",
      });
    }
  };

  // =====================
  // FORMAT DATE
  // =====================
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // =====================
  // UI
  // =====================
  return (
    <Box>
      {/* Status Summary Cards */}
      <Paper
        sx={{
          p: { xs: 2, sm: 3 },
          mb: { xs: 2, sm: 3 },
          borderRadius: { xs: 2, sm: 3 },
          background: "white",
        }}
      >
        <Grid container spacing={{ xs: 1, sm: 2 }}>
          {STATUSES.map((status) => (
            <Grid item xs={4} sm={2.4} key={status}>
              <Paper
                sx={{
                  p: { xs: 1, sm: 2 },
                  textAlign: "center",
                  background: statusConfig[status].bg,
                  color: "white",
                  borderRadius: { xs: 2, sm: 3 },
                }}
              >
                <Typography
                  sx={{ fontSize: { xs: "1.25rem", sm: "1.75rem" }, mb: 0.5 }}
                >
                  {statusConfig[status].icon}
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: "1.25rem", sm: "2rem" },
                  }}
                >
                  {statusCounts[status]}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    opacity: 0.9,
                    fontWeight: 500,
                    fontSize: { xs: "0.6rem", sm: "0.75rem" },
                  }}
                >
                  {status}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Paper
          sx={{
            p: { xs: 4, sm: 6 },
            textAlign: "center",
            borderRadius: { xs: 2, sm: 3 },
          }}
        >
          <LocalLaundryServiceIcon
            sx={{
              fontSize: { xs: 48, sm: 72 },
              color: "text.secondary",
              opacity: 0.3,
            }}
          />
          <Typography
            color="text.secondary"
            sx={{ mt: 2, fontSize: { xs: "0.9rem", sm: "1rem" } }}
          >
            No orders yet
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={{ xs: 1.5, sm: 2 }}>
          {orders
            .filter((o) => o.status !== "Released")
            .map((order) => (
              <Grid item xs={12} sm={6} lg={4} key={order.id}>
                <Card
                  sx={{
                    borderRadius: { xs: 2, sm: 3 },
                    overflow: "hidden",
                    transition: "all 0.3s ease",
                    border: isPaid(order)
                      ? "3px solid #10b981"
                      : "3px solid #ef4444",
                    "&:hover": {
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  {/* Status Header */}
                  <Box
                    sx={{
                      background: statusConfig[order.status]?.bg,
                      color: "white",
                      p: { xs: 1.5, sm: 2 },
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography
                          sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
                        >
                          {statusConfig[order.status]?.icon}
                        </Typography>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 700,
                            fontSize: { xs: "0.9rem", sm: "1.1rem" },
                          }}
                        >
                          Order #{order.id}
                        </Typography>
                      </Box>
                      <Chip
                        label={order.status}
                        size="small"
                        sx={{
                          bgcolor: "rgba(255,255,255,0.2)",
                          color: "white",
                          fontWeight: 600,
                          fontSize: { xs: "0.65rem", sm: "0.75rem" },
                        }}
                      />
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={getProgress(order.status)}
                      sx={{
                        mt: 1.5,
                        height: 6,
                        borderRadius: 3,
                        bgcolor: "rgba(255,255,255,0.2)",
                        "& .MuiLinearProgress-bar": {
                          bgcolor: "white",
                          borderRadius: 3,
                        },
                      }}
                    />
                  </Box>

                  <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                    {/* Receipt Number */}
                    {order.receiptNumber && (
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          mb: 1,
                          color: "primary.main",
                          fontWeight: 600,
                          fontSize: { xs: "0.7rem", sm: "0.75rem" },
                        }}
                      >
                        📋 {order.receiptNumber}
                      </Typography>
                    )}

                    {/* Customer Info */}
                    <Stack spacing={1} sx={{ mb: 2 }}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Avatar
                          sx={{
                            width: { xs: 28, sm: 32 },
                            height: { xs: 28, sm: 32 },
                            bgcolor: "primary.main",
                          }}
                        >
                          <PersonIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
                        </Avatar>
                        <Typography
                          fontWeight={600}
                          sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
                        >
                          {order.customerName}
                        </Typography>
                      </Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Avatar
                          sx={{
                            width: { xs: 28, sm: 32 },
                            height: { xs: 28, sm: 32 },
                            bgcolor: "secondary.main",
                          }}
                        >
                          <PhoneIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
                        </Avatar>
                        <Typography
                          color="text.secondary"
                          sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
                        >
                          {order.phone}
                        </Typography>
                      </Box>
                    </Stack>

                    {/* Order Items */}
                    {order.items && order.items.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontWeight: 600 }}
                        >
                          Services:
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={0.5}
                          flexWrap="wrap"
                          sx={{ mt: 0.5 }}
                        >
                          {order.items.map((item, idx) => (
                            <Chip
                              key={idx}
                              label={`${item.name} x${item.loads}`}
                              size="small"
                              sx={{
                                fontSize: { xs: "0.65rem", sm: "0.75rem" },
                                mb: 0.5,
                              }}
                            />
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {/* Total & Date */}
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mb: 2 }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={`₱${Number(order.total).toFixed(2)}`}
                          color="primary"
                          sx={{
                            fontWeight: 700,
                            fontSize: { xs: "0.75rem", sm: "0.9rem" },
                          }}
                        />
                        <Chip
                          icon={
                            <PaidIcon sx={{ fontSize: "16px !important" }} />
                          }
                          label={isPaid(order) ? "Paid" : "Unpaid"}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            fontSize: { xs: "0.65rem", sm: "0.75rem" },
                            bgcolor: isPaid(order) ? "#10b981" : "#ef4444",
                            color: "white",
                            "& .MuiChip-icon": {
                              color: "white",
                            },
                          }}
                        />
                      </Stack>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.65rem", sm: "0.75rem" } }}
                      >
                        {formatDate(order.createdAt)}
                      </Typography>
                    </Stack>

                    {/* Action Buttons */}
                    <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={
                          <ReceiptIcon sx={{ fontSize: "14px !important" }} />
                        }
                        onClick={() =>
                          setSelectedReceipt({
                            id: order.id,
                            receiptNumber: order.receiptNumber,
                            customer: order.customerName,
                            phone: order.phone,
                            items: order.items,
                            total: order.total,
                            method: order.paymentMethod || "Unpaid",
                            date: formatDate(order.createdAt),
                            gcashNumber: order.gcashNumber,
                            gcashRefNumber: order.gcashRefNumber,
                            amountPaid: order.amountPaid,
                            change: order.change,
                          })
                        }
                        sx={{
                          fontSize: { xs: "0.65rem", sm: "0.75rem" },
                          py: { xs: 0.5, sm: 0.75 },
                          flex: 1,
                        }}
                      >
                        View Receipt
                      </Button>
                    </Stack>

                    {/* Status Buttons */}
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {STATUSES.map((status) => {
                        const isCurrentOrPast =
                          STATUSES.indexOf(status) <=
                          STATUSES.indexOf(order.status);

                        // Can't release if not paid
                        const cantReleaseUnpaid =
                          status === "Released" && !isPaid(order);

                        return (
                          <Button
                            key={status}
                            variant={
                              order.status === status ? "contained" : "outlined"
                            }
                            size="small"
                            onClick={() => handleUpdateStatus(order, status)}
                            disabled={
                              (isCurrentOrPast && status !== order.status) ||
                              cantReleaseUnpaid
                            }
                            startIcon={
                              order.status === status ? (
                                <CheckCircleIcon
                                  sx={{ fontSize: "14px !important" }}
                                />
                              ) : null
                            }
                            sx={{
                              flex: 1,
                              minWidth: "auto",
                              fontSize: { xs: "0.6rem", sm: "0.7rem" },
                              py: { xs: 0.5, sm: 0.75 },
                              px: { xs: 0.5, sm: 1 },
                              mb: 0.5,
                              ...(order.status === status && {
                                background: statusConfig[status]?.bg,
                                borderColor: "transparent",
                              }),
                              ...(cantReleaseUnpaid && {
                                opacity: 0.5,
                              }),
                            }}
                          >
                            {status === "Washing"
                              ? "Wash"
                              : status === "Drying"
                              ? "Dry"
                              : status}
                          </Button>
                        );
                      })}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
        </Grid>
      )}

      {/* Released Orders Section */}
      {orders.filter((o) => o.status === "Released").length > 0 && (
        <Paper
          sx={{
            mt: { xs: 3, sm: 4 },
            p: { xs: 2, sm: 3 },
            borderRadius: { xs: 2, sm: 3 },
            background: "white",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: "primary.main",
              fontSize: { xs: "0.9rem", sm: "1.1rem" },
            }}
          >
            🎉 Released Orders (
            {orders.filter((o) => o.status === "Released").length})
          </Typography>
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            {orders
              .filter((o) => o.status === "Released")
              .slice(0, 6)
              .map((order) => (
                <Grid item xs={12} sm={6} lg={4} key={order.id}>
                  <Card
                    sx={{
                      borderRadius: { xs: 2, sm: 3 },
                      background:
                        "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
                    }}
                  >
                    <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Box>
                          {order.receiptNumber && (
                            <Typography
                              variant="caption"
                              sx={{
                                display: "block",
                                color: "primary.main",
                                fontWeight: 600,
                                fontSize: { xs: "0.65rem", sm: "0.7rem" },
                              }}
                            >
                              📋 {order.receiptNumber}
                            </Typography>
                          )}
                          <Typography
                            fontWeight={600}
                            sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}
                          >
                            {order.customerName}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: { xs: "0.7rem", sm: "0.8rem" } }}
                          >
                            ₱{Number(order.total).toFixed(2)} •{" "}
                            {formatDate(order.createdAt)}
                          </Typography>
                        </Box>
                        <Chip
                          label="Released"
                          size="small"
                          sx={{
                            background: statusConfig.Released.bg,
                            color: "white",
                            fontWeight: 600,
                            fontSize: { xs: "0.6rem", sm: "0.7rem" },
                          }}
                        />
                      </Stack>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={
                          <ReceiptIcon sx={{ fontSize: "14px !important" }} />
                        }
                        onClick={() =>
                          setSelectedReceipt({
                            id: order.id,
                            receiptNumber: order.receiptNumber,
                            customer: order.customerName,
                            phone: order.phone,
                            items: order.items,
                            total: order.total,
                            method: order.paymentMethod || "Unpaid",
                            date: formatDate(order.createdAt),
                            gcashNumber: order.gcashNumber,
                            gcashRefNumber: order.gcashRefNumber,
                            amountPaid: order.amountPaid,
                            change: order.change,
                          })
                        }
                        sx={{
                          mt: 1,
                          fontSize: { xs: "0.65rem", sm: "0.75rem" },
                          py: { xs: 0.5, sm: 0.75 },
                          width: "100%",
                        }}
                      >
                        View Receipt
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
          </Grid>
        </Paper>
      )}

      {/* Receipt Preview Dialog */}
      <ReceiptPreview
        open={Boolean(selectedReceipt)}
        data={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        onPaymentUpdate={handlePaymentUpdate}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
