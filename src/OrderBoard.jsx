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
} from "@mui/material";
import LocalLaundryServiceIcon from "@mui/icons-material/LocalLaundryService";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import StorageIcon from "@mui/icons-material/Storage";
import { getOrders, updateOrderStatus } from "./db/database";

// Order workflow
const STATUSES = ["Received", "Washing", "Drying", "Ready", "Released"];

export default function OrderBoard() {
  const [orders, setOrders] = useState([]);

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
      bg: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
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
      {/* Offline Mode Indicator */}
      <Paper
        sx={{
          p: 1.5,
          mb: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          background: "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
          borderRadius: 2,
        }}
      >
        <StorageIcon sx={{ color: "white" }} />
        <Typography sx={{ color: "white", fontWeight: 600 }}>
          Offline Mode - Orders stored locally
        </Typography>
      </Paper>

      {/* Status Summary Cards */}
      <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: { xs: 2, sm: 3 } }}>
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
                      <Chip
                        label={`₱${Number(order.total).toFixed(2)}`}
                        color="primary"
                        sx={{
                          fontWeight: 700,
                          fontSize: { xs: "0.75rem", sm: "0.9rem" },
                        }}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.65rem", sm: "0.75rem" } }}
                      >
                        {formatDate(order.createdAt)}
                      </Typography>
                    </Stack>

                    {/* Action Buttons */}
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {STATUSES.map((status) => {
                        const isCurrentOrPast =
                          STATUSES.indexOf(status) <=
                          STATUSES.indexOf(order.status);

                        return (
                          <Button
                            key={status}
                            variant={
                              order.status === status ? "contained" : "outlined"
                            }
                            size="small"
                            onClick={() => handleUpdateStatus(order, status)}
                            disabled={
                              isCurrentOrPast && status !== order.status
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
        <Box sx={{ mt: { xs: 3, sm: 4 } }}>
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: "text.secondary",
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
                      opacity: 0.7,
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
                    </CardContent>
                  </Card>
                </Grid>
              ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}