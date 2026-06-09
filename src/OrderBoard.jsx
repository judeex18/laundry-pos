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
  Fade,
  Zoom,
  TextField,
  Pagination,
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import LocalLaundryServiceIcon from "@mui/icons-material/LocalLaundryService";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import ReceiptIcon from "@mui/icons-material/Receipt";
import PaidIcon from "@mui/icons-material/Paid";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import {
  getOrders,
  updateOrderStatus,
  updateOrderPayment,
  trackOrder,
} from "./db/database";
import ReceiptPreview from "./ReceiptPreview";

// Order workflow
const STATUSES = ["Received", "Washing", "Drying", "Ready", "Released"];

export default function OrderBoard() {
  const [orders, setOrders] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [releasedDateFilter, setReleasedDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // =====================
  // LOAD ORDERS FROM SUPABASE
  // =====================
  const fetchOrders = async () => {
    try {
      const supabaseOrders = await getOrders();
      setOrders(supabaseOrders);
    } catch (error) {
      console.error("Failed to load orders from Supabase:", error);
      // Fallback to local orders
      try {
        const localOrders = await getOrders();
        setOrders(localOrders);
      } catch (localError) {
        console.error("Failed to load local orders:", localError);
      }
    }
  };

  // Auto-refresh every 5 seconds
  useEffect(() => {
    fetchOrders();
    const timer = setInterval(fetchOrders, 5000);
    return () => clearInterval(timer);
  }, []);

  // Reset to page 1 only if current page exceeds total pages
  useEffect(() => {
    const totalPages = getTotalPages();
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [orders]);

  // =====================
  // UPDATE STATUS
  // =====================
  const handleUpdateStatus = async (order, status) => {
    if (order.status === status) return;

    try {
      await updateOrderStatus(order.id, status);
      fetchOrders(); // Refresh orders
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
  // PAGINATION LOGIC
  // =====================
  const ORDERS_PER_PAGE = 8; // 2 rows of 4 orders each

  const getSortedOrders = () => {
    const today = new Date().toISOString().split("T")[0];
    return orders
      .filter((o) => o.status !== "Released")
      .sort((a, b) => {
        const aDate = new Date(a.createdAt).toISOString().split("T")[0];
        const bDate = new Date(b.createdAt).toISOString().split("T")[0];

        // Today's orders first
        if (aDate === today && bDate !== today) return -1;
        if (aDate !== today && bDate === today) return 1;

        // Then by creation date (newest first)
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  };

  const getPaginatedOrders = () => {
    const sortedOrders = getSortedOrders();
    const startIndex = (currentPage - 1) * ORDERS_PER_PAGE;
    const endIndex = startIndex + ORDERS_PER_PAGE;
    return sortedOrders.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const sortedOrders = getSortedOrders();
    return Math.ceil(sortedOrders.length / ORDERS_PER_PAGE);
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
  // CHECK SERVICE TYPE FOR SMART STATUS BUTTONS
  // =====================
  const getSkippedStatuses = (order) => {
    if (!order.items || order.items.length === 0) return [];

    const skipped = [];
    const itemNames = order.items.map((item) => item.name.toLowerCase());

    // Get main service items (exclude add-ons like Downy, Zonrox, Liquid Detergent)
    const addOns = ["downy", "zonrox", "liquid detergent"];
    const mainServices = itemNames.filter(
      (name) => !addOns.some((addon) => name.includes(addon)),
    );

    if (mainServices.length === 0) return []; // Only add-ons, show all statuses

    // Check service types in main services
    const hasDryOnly = mainServices.some((name) => name.includes("dry only"));
    const hasWashOnly = mainServices.some((name) => name.includes("wash only"));
    const hasIronOnly = mainServices.every((name) => name === "iron");
    const hasFullService = mainServices.some(
      (name) => name.includes("wash") && name.includes("dry"),
    );

    // If full service (Wash, Dry & Fold), don't skip anything
    if (hasFullService) return [];

    // If iron only (no wash/dry services), skip both
    if (hasIronOnly) {
      return ["Washing", "Drying"];
    }

    // If dry only, skip washing
    if (hasDryOnly && !hasWashOnly) {
      skipped.push("Washing");
    }

    // If wash only, skip drying
    if (hasWashOnly && !hasDryOnly) {
      skipped.push("Drying");
    }

    return skipped;
  };

  // =====================
  // HANDLE PAYMENT UPDATE
  // =====================
  const handlePaymentUpdate = async (receiptNumber, paymentData) => {
    try {
      console.log("Payment update called with:", {
        receiptNumber,
        paymentData,
      });
      const order = await trackOrder(receiptNumber);
      console.log("Order found:", order);

      if (order) {
        console.log("Updating payment for order ID:", order.id);
        await updateOrderPayment(order.id, paymentData);
        setSnackbar({
          open: true,
          message: `Payment recorded! Method: ${paymentData.method}`,
          severity: "success",
        });
        fetchOrders();
        setSelectedReceipt(null);
      } else {
        console.error("Order not found for receipt:", receiptNumber);
        setSnackbar({
          open: true,
          message: "Order not found",
          severity: "error",
        });
      }
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

  // Filter released orders by selected date
  const getFilteredReleasedOrders = () => {
    const releasedOrders = orders.filter(
      (o) => o.status?.toLowerCase() === "released",
    );

    if (!releasedDateFilter) {
      return releasedOrders.slice(0, 6); // Show latest 6 if no date selected
    }

    return releasedOrders.filter((order) => {
      const orderDate = new Date(order.createdAt).toISOString().split("T")[0];
      return orderDate === releasedDateFilter;
    });
  };

  // =====================
  // UI
  // =====================
  return (
    <Box>
      {/* Status Summary Cards - Enhanced */}
      <Fade in timeout={500}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            mb: { xs: 2, sm: 3 },
            borderRadius: 4,
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          }}
        >
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}
          >
            <Avatar
              sx={{
                background: "linear-gradient(135deg, #375da5 0%, #2a4a8a 100%)",
                width: 40,
                height: 40,
              }}
            >
              <AccessTimeIcon />
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#1e3a5f" }}>
              Order Status Overview
            </Typography>
          </Box>
          <Grid container spacing={{ xs: 1, sm: 1.5 }}>
            {STATUSES.map((status, index) => (
              <Grid item xs={6} sm={2.4} key={status}>
                <Zoom in timeout={300 + index * 100}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: { xs: 1.5, sm: 2 },
                      textAlign: "center",
                      background: statusConfig[status].bg,
                      color: "white",
                      borderRadius: 3,
                      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                      transition: "all 0.3s",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
                      },
                    }}
                  >
                    <Typography
                      sx={{ fontSize: { xs: "1.5rem", sm: "2rem" }, mb: 0.5 }}
                    >
                      {statusConfig[status].icon}
                    </Typography>
                    <Typography
                      variant="h3"
                      sx={{
                        fontWeight: 800,
                        fontSize: { xs: "1.5rem", sm: "2.25rem" },
                        textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                      }}
                    >
                      {statusCounts[status]}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        opacity: 0.9,
                        fontWeight: 600,
                        fontSize: { xs: "0.6rem", sm: "0.75rem" },
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {status}
                    </Typography>
                  </Paper>
                </Zoom>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Fade>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Fade in timeout={700}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 6, sm: 8 },
              textAlign: "center",
              borderRadius: 4,
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            }}
          >
            <LocalLaundryServiceIcon
              sx={{
                fontSize: { xs: 80, sm: 120 },
                color: "#375da5",
                opacity: 0.2,
                mb: 2,
              }}
            />
            <Typography
              variant="h5"
              sx={{ color: "#1e3a5f", fontWeight: 600, mb: 1 }}
            >
              No Orders Yet
            </Typography>
            <Typography color="text.secondary">
              Orders will appear here when customers place them
            </Typography>
          </Paper>
        </Fade>
      ) : (
        <Grid container spacing={{ xs: 1.5, sm: 2 }} justifyContent="center">
          {getPaginatedOrders().map((order, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={order.id}>
              <Zoom in timeout={300 + index * 50}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 4,
                    overflow: "hidden",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    border: isPaid(order)
                      ? "3px solid #10b981"
                      : "3px solid #ef4444",
                    background: "rgba(255, 255, 255, 0.98)",
                    boxShadow: isPaid(order)
                      ? "0 8px 32px rgba(16, 185, 129, 0.15)"
                      : "0 8px 32px rgba(239, 68, 68, 0.15)",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    "&:hover": {
                      transform: "translateY(-8px)",
                      boxShadow: isPaid(order)
                        ? "0 20px 40px rgba(16, 185, 129, 0.25)"
                        : "0 20px 40px rgba(239, 68, 68, 0.25)",
                    },
                  }}
                >
                  {/* Status Header */}
                  <Box
                    sx={{
                      background: statusConfig[order.status]?.bg,
                      color: "white",
                      p: { xs: 2, sm: 2.5 },
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {/* Background Pattern */}
                    <Box
                      sx={{
                        position: "absolute",
                        top: -20,
                        right: -20,
                        width: 100,
                        height: 100,
                        borderRadius: "50%",
                        bgcolor: "rgba(255,255,255,0.1)",
                      }}
                    />
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                        }}
                      >
                        <Typography
                          sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }}
                        >
                          {statusConfig[order.status]?.icon}
                        </Typography>
                        <Box>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 800,
                              fontSize: { xs: "1rem", sm: "1.2rem" },
                              textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                            }}
                          >
                            Order #{order.id}
                          </Typography>
                          {order.receiptNumber && (
                            <Typography
                              variant="caption"
                              sx={{ opacity: 0.9, fontSize: "0.7rem" }}
                            >
                              📋 {order.receiptNumber}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Chip
                        label={order.status}
                        size="small"
                        sx={{
                          bgcolor: "rgba(255,255,255,0.25)",
                          backdropFilter: "blur(10px)",
                          color: "white",
                          fontWeight: 700,
                          fontSize: { xs: "0.7rem", sm: "0.8rem" },
                        }}
                      />
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={getProgress(order.status)}
                      sx={{
                        mt: 2,
                        height: 8,
                        borderRadius: 4,
                        bgcolor: "rgba(255,255,255,0.2)",
                        "& .MuiLinearProgress-bar": {
                          bgcolor: "white",
                          borderRadius: 4,
                        },
                      }}
                    />
                  </Box>

                  <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                    {/* Customer Info */}
                    <Stack spacing={1.5} sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            background:
                              "linear-gradient(135deg, #375da5 0%, #2a4a8a 100%)",
                          }}
                        >
                          <PersonIcon sx={{ fontSize: 18 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Customer
                          </Typography>
                          <Typography
                            fontWeight={700}
                            sx={{ color: "#1e3a5f" }}
                          >
                            {order.customerName}
                          </Typography>
                        </Box>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            background:
                              "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                          }}
                        >
                          <PhoneIcon sx={{ fontSize: 18 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Phone
                          </Typography>
                          <Typography
                            fontWeight={600}
                            sx={{ color: "#64748b" }}
                          >
                            {order.phone}
                          </Typography>
                        </Box>
                      </Box>
                    </Stack>

                    {/* Order Items */}
                    <Box sx={{ mb: 2, height: 80 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          color: "#64748b",
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        Services
                      </Typography>
                      <Box
                        sx={{
                          mt: 1,
                          height: 56,
                          overflowY: "auto",
                          "&::-webkit-scrollbar": {
                            width: 4,
                          },
                          "&::-webkit-scrollbar-thumb": {
                            bgcolor: "#cbd5e1",
                            borderRadius: 2,
                          },
                        }}
                      >
                        {order.items && order.items.length > 0 ? (
                          order.items.map((item, idx) => (
                            <Box
                              key={idx}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                py: 0.3,
                                borderBottom:
                                  idx < order.items.length - 1
                                    ? "1px dashed #e2e8f0"
                                    : "none",
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  fontSize: "0.8rem",
                                  color: "#1e3a5f",
                                  fontWeight: 600,
                                }}
                              >
                                {item.name}
                              </Typography>
                              <Chip
                                label={`×${item.loads}`}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  bgcolor: "#375da5",
                                  color: "white",
                                  minWidth: 36,
                                }}
                              />
                            </Box>
                          ))
                        ) : (
                          <Typography
                            variant="body2"
                            sx={{ color: "#9ca3af", fontSize: "0.8rem" }}
                          >
                            No services
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {/* Total & Payment Status */}
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        background:
                          "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                        mb: 2,
                      }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Chip
                          label={`₱${Number(order.total).toFixed(2)}`}
                          sx={{
                            fontWeight: 800,
                            fontSize: "1rem",
                            bgcolor: "#375da5",
                            color: "white",
                            height: 36,
                          }}
                        />
                        <Chip
                          icon={
                            <Box
                              component="span"
                              sx={{
                                fontSize: "14px",
                                fontWeight: 800,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              ₱
                            </Box>
                          }
                          label={isPaid(order) ? "PAID" : "UNPAID"}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.75rem",
                            bgcolor: isPaid(order) ? "#10b981" : "#ef4444",
                            color: "white",
                            "& .MuiChip-icon": { color: "white" },
                          }}
                        />
                      </Stack>
                      <Typography
                        variant="caption"
                        sx={{ display: "block", mt: 1, color: "#64748b" }}
                      >
                        {formatDate(order.createdAt)}
                      </Typography>
                    </Paper>

                    {/* Action Buttons */}
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<ReceiptIcon />}
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
                        mb: 1.5,
                        py: 1,
                        borderRadius: 2,
                        fontWeight: 600,
                      }}
                    >
                      View Receipt & Pay
                    </Button>

                    {/* Status Buttons */}
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {STATUSES.filter(
                        (status) => !getSkippedStatuses(order).includes(status),
                      ).map((status) => {
                        const filteredStatuses = STATUSES.filter(
                          (s) => !getSkippedStatuses(order).includes(s),
                        );
                        const currentStatusIndex = filteredStatuses.indexOf(
                          order.status,
                        );
                        const buttonStatusIndex =
                          filteredStatuses.indexOf(status);
                        const isNextStatus =
                          buttonStatusIndex === currentStatusIndex + 1;
                        const isCurrentStatus = status === order.status;
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
                              !(isCurrentStatus || isNextStatus) ||
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
                              fontSize: "0.65rem",
                              py: 0.75,
                              px: 0.5,
                              mb: 0.5,
                              borderRadius: 2,
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
              </Zoom>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Pagination */}
      {getTotalPages() > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3, mb: 2 }}>
          <Pagination
            count={getTotalPages()}
            page={currentPage}
            onChange={(event, page) => setCurrentPage(page)}
            color="primary"
            size="large"
            sx={{
              "& .MuiPaginationItem-root": {
                fontSize: "1rem",
                fontWeight: 600,
              },
            }}
          />
        </Box>
      )}

      {/* Released Orders Section */}
      {orders.filter((o) => o.status?.toLowerCase() === "released").length >
        0 && (
        <Fade in timeout={900}>
          <Paper
            elevation={0}
            sx={{
              mt: { xs: 3, sm: 4 },
              p: { xs: 2, sm: 3 },
              borderRadius: 4,
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: { xs: "flex-start", sm: "center" },
                flexDirection: { xs: "column", sm: "row" },
                justifyContent: "space-between",
                gap: 2,
                mb: 2.5,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Avatar
                  sx={{
                    background:
                      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    width: 40,
                    height: 40,
                  }}
                >
                  <CheckCircleIcon />
                </Avatar>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, color: "#1e3a5f" }}
                  >
                    Released Orders
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {releasedDateFilter
                      ? `${
                          getFilteredReleasedOrders().length
                        } orders on ${new Date(
                          releasedDateFilter,
                        ).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}`
                      : `${
                          orders.filter(
                            (o) => o.status?.toLowerCase() === "released",
                          ).length
                        } total completed orders`}
                  </Typography>
                </Box>
              </Box>

              {/* Date Picker for filtering */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CalendarMonthIcon sx={{ color: "#64748b" }} />
                <TextField
                  type="date"
                  size="small"
                  value={releasedDateFilter}
                  onChange={(e) => setReleasedDateFilter(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  label="Filter by Date"
                  sx={{
                    minWidth: 180,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      bgcolor: "white",
                    },
                  }}
                />
                {releasedDateFilter && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setReleasedDateFilter("")}
                    sx={{
                      minWidth: "auto",
                      px: 1.5,
                      borderRadius: 2,
                      borderColor: "#cbd5e1",
                      color: "#64748b",
                      "&:hover": {
                        borderColor: "#94a3b8",
                        bgcolor: "#f1f5f9",
                      },
                    }}
                  >
                    Clear
                  </Button>
                )}
              </Box>
            </Box>

            {getFilteredReleasedOrders().length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <CalendarMonthIcon
                  sx={{ fontSize: 48, color: "#cbd5e1", mb: 1 }}
                />
                <Typography color="text.secondary">
                  No released orders found for this date
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                {getFilteredReleasedOrders().map((order, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={order.id}>
                    <Zoom in timeout={300 + index * 50}>
                      <Card
                        elevation={0}
                        sx={{
                          borderRadius: 3,
                          background:
                            "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                          border: "1px solid #86efac",
                          transition: "all 0.3s",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          "&:hover": {
                            transform: "translateY(-4px)",
                            boxShadow: "0 8px 24px rgba(16, 185, 129, 0.2)",
                          },
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
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
                                    color: "#166534",
                                    fontWeight: 700,
                                    fontSize: "0.7rem",
                                  }}
                                >
                                  📋 {order.receiptNumber}
                                </Typography>
                              )}
                              <Typography
                                fontWeight={700}
                                sx={{ color: "#166534", fontSize: "1rem" }}
                              >
                                {order.customerName}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: "#15803d" }}
                              >
                                ₱{Number(order.total).toFixed(2)} •{" "}
                                {formatDate(order.createdAt)}
                              </Typography>
                            </Box>
                            <Chip
                              icon={
                                <CheckCircleIcon
                                  sx={{ fontSize: "16px !important" }}
                                />
                              }
                              label="Done"
                              size="small"
                              sx={{
                                background:
                                  "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                color: "white",
                                fontWeight: 700,
                                "& .MuiChip-icon": { color: "white" },
                              }}
                            />
                          </Stack>
                          <Button
                            fullWidth
                            variant="outlined"
                            size="small"
                            startIcon={<ReceiptIcon />}
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
                              mt: 1.5,
                              borderRadius: 2,
                              borderColor: "#10b981",
                              color: "#10b981",
                              fontWeight: 600,
                              "&:hover": {
                                borderColor: "#059669",
                                bgcolor: "rgba(16, 185, 129, 0.1)",
                              },
                            }}
                          >
                            View Receipt
                          </Button>
                        </CardContent>
                      </Card>
                    </Zoom>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Fade>
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
