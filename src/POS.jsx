import { useEffect, useState } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  IconButton,
  Divider,
  Stack,
  Box,
  Paper,
  Chip,
  Avatar,
  Snackbar,
  Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import LocalLaundryServiceIcon from "@mui/icons-material/LocalLaundryService";
import DryCleaningIcon from "@mui/icons-material/DryCleaning";
import IronIcon from "@mui/icons-material/Iron";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import PaymentsIcon from "@mui/icons-material/Payments";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import StorageIcon from "@mui/icons-material/Storage";
import ReceiptPreview from "./ReceiptPreview";
import {
  getServices,
  createOrder,
  initializeServices,
  resetServices,
} from "./db/database";

export default function POS() {
  const [services, setServices] = useState([]);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // =====================
  // LOAD SERVICES FROM INDEXEDDB
  // =====================
  useEffect(() => {
    const loadServices = async () => {
      await initializeServices();
      let localServices = await getServices();

      // If no services found, force reset
      if (localServices.length === 0) {
        await resetServices();
        localServices = await getServices();
      }

      setServices(localServices);
    };
    loadServices();
  }, []);

  // =====================
  // ADD LOAD
  // =====================
  const addLoad = (service) => {
    const price = Number(service.price) || 0;
    if (price === 0) return;

    setItems((prev) => {
      const index = prev.findIndex((i) => i.id === service.id);
      const updated = [...prev];

      if (index >= 0) {
        updated[index] = {
          ...updated[index],
          loads: updated[index].loads + 1,
          total: updated[index].total + price,
        };
      } else {
        updated.push({
          id: service.id,
          name: service.name,
          price: price,
          loads: 1,
          total: price,
        });
      }
      return updated;
    });

    setTotal((prev) => (prev || 0) + price);
  };

  // =====================
  // REMOVE LOAD
  // =====================
  const removeLoad = (service) => {
    const price = Number(service.price) || 0;

    setItems((prev) => {
      const index = prev.findIndex((i) => i.id === service.id);
      if (index < 0) return prev;

      const updated = [...prev];
      const newLoads = updated[index].loads - 1;

      if (newLoads <= 0) {
        updated.splice(index, 1);
      } else {
        updated[index] = {
          ...updated[index],
          loads: newLoads,
          total: updated[index].total - price,
        };
      }
      return updated;
    });

    setTotal((prev) => Math.max(0, (prev || 0) - price));
  };

  // =====================
  // PAY - SAVE TO INDEXEDDB
  // =====================
  const pay = async (method) => {
    if (!customer || !phone || total === 0) {
      setSnackbar({
        open: true,
        message: "Please enter customer details and select services",
        severity: "warning",
      });
      return;
    }

    const orderData = {
      customer,
      phone,
      items,
      total,
      method,
      date: new Date().toLocaleString(),
    };

    try {
      await createOrder(orderData);
      setReceipt(orderData);
      setSnackbar({
        open: true,
        message: "Order saved successfully!",
        severity: "success",
      });
      resetPOS();
    } catch (error) {
      console.error("Failed to save order:", error);
      setSnackbar({
        open: true,
        message: "Failed to save order",
        severity: "error",
      });
    }
  };

  const resetPOS = () => {
    setItems([]);
    setTotal(0);
    setCustomer("");
    setPhone("");
  };

  // =====================
  // SERVICE ICONS
  // =====================
  const getServiceIcon = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes("wash")) return <LocalLaundryServiceIcon />;
    if (lower.includes("dry")) return <DryCleaningIcon />;
    if (lower.includes("iron") || lower.includes("press")) return <IronIcon />;
    return <LocalLaundryServiceIcon />;
  };

  const getServiceColor = (index) => {
    const colors = [
      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    ];
    return colors[index % colors.length];
  };

  // =====================
  // UI
  // =====================
  return (
    <>
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
          Offline Mode - All data stored locally
        </Typography>
      </Paper>

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Left Section - Services */}
        <Grid item xs={12} lg={7}>
          {/* Customer Info Card */}
          <Paper
            sx={{
              p: { xs: 2, sm: 3 },
              mb: { xs: 2, sm: 3 },
              background: "white",
              borderRadius: { xs: 2, sm: 3 },
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
                fontSize: { xs: "1rem", sm: "1.25rem" },
              }}
            >
              <PersonIcon /> Customer Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Customer Name"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <PersonIcon sx={{ mr: 1, color: "text.secondary" }} />
                    ),
                  }}
                  size="medium"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <PhoneIcon sx={{ mr: 1, color: "text.secondary" }} />
                    ),
                  }}
                  size="medium"
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Services Grid */}
          <Paper
            sx={{
              p: { xs: 2, sm: 3 },
              background: "white",
              borderRadius: { xs: 2, sm: 3 },
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
                fontSize: { xs: "1rem", sm: "1.25rem" },
              }}
            >
              <LocalLaundryServiceIcon /> Select Services
            </Typography>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              {services.map((service, index) => {
                const itemInCart = items.find((i) => i.id === service.id);
                const loads = itemInCart ? itemInCart.loads : 0;

                return (
                  <Grid item xs={6} sm={4} md={3} key={service.id}>
                    <Card
                      onClick={() => addLoad(service)}
                      sx={{
                        cursor: "pointer",
                        background: getServiceColor(index),
                        color: "white",
                        borderRadius: { xs: 2, sm: 3 },
                        transition: "all 0.3s ease",
                        position: "relative",
                        overflow: "visible",
                        "&:hover": {
                          transform: "translateY(-4px)",
                          boxShadow: "0 12px 28px rgba(0,0,0,0.15)",
                        },
                        "&:active": {
                          transform: "scale(0.98)",
                        },
                      }}
                    >
                      {loads > 0 && (
                        <Chip
                          label={loads}
                          size="small"
                          sx={{
                            position: "absolute",
                            top: -8,
                            right: -8,
                            bgcolor: "#ef4444",
                            color: "white",
                            fontWeight: 700,
                            fontSize: { xs: "0.7rem", sm: "0.85rem" },
                            minWidth: { xs: 22, sm: 28 },
                            height: { xs: 22, sm: 28 },
                            zIndex: 1,
                          }}
                        />
                      )}
                      <CardContent
                        sx={{
                          p: { xs: 1.5, sm: 2 },
                          "&:last-child": { pb: { xs: 1.5, sm: 2 } },
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            textAlign: "center",
                          }}
                        >
                          <Avatar
                            sx={{
                              bgcolor: "rgba(255,255,255,0.2)",
                              mb: 1,
                              width: { xs: 36, sm: 48 },
                              height: { xs: 36, sm: 48 },
                            }}
                          >
                            {getServiceIcon(service.name)}
                          </Avatar>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: 600,
                              fontSize: { xs: "0.75rem", sm: "0.95rem" },
                              lineHeight: 1.2,
                              mb: 0.5,
                            }}
                          >
                            {service.name}
                          </Typography>
                          <Chip
                            label={`₱${Number(service.price).toFixed(2)}`}
                            size="small"
                            sx={{
                              bgcolor: "rgba(255,255,255,0.2)",
                              color: "white",
                              fontWeight: 700,
                              fontSize: { xs: "0.65rem", sm: "0.8rem" },
                            }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        </Grid>

        {/* Right Section - Order Summary */}
        <Grid item xs={12} lg={5}>
          <Paper
            sx={{
              p: { xs: 2, sm: 3 },
              background: "white",
              borderRadius: { xs: 2, sm: 3 },
              position: { lg: "sticky" },
              top: { lg: 100 },
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
                fontSize: { xs: "1rem", sm: "1.25rem" },
              }}
            >
              <ShoppingCartIcon /> Order Summary
              {items.length > 0 && (
                <Chip
                  label={items.reduce((sum, i) => sum + i.loads, 0)}
                  size="small"
                  color="primary"
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>

            {items.length === 0 ? (
              <Box
                sx={{
                  py: { xs: 4, sm: 6 },
                  textAlign: "center",
                  color: "text.secondary",
                }}
              >
                <ShoppingCartIcon
                  sx={{ fontSize: { xs: 40, sm: 60 }, opacity: 0.3, mb: 1 }}
                />
                <Typography variant="body2">
                  Select services to add to order
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1.5} sx={{ mb: 2 }}>
                {items.map((item, index) => (
                  <Paper
                    key={item.id}
                    variant="outlined"
                    sx={{
                      p: { xs: 1.5, sm: 2 },
                      borderRadius: 2,
                      background:
                        "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 600,
                            fontSize: { xs: "0.8rem", sm: "0.95rem" },
                          }}
                        >
                          {item.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: { xs: "0.65rem", sm: "0.75rem" } }}
                        >
                          ₱{Number(item.price).toFixed(2)} × {item.loads}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: { xs: 0.5, sm: 1 },
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeLoad(item);
                          }}
                          sx={{
                            bgcolor: "#fee2e2",
                            color: "#ef4444",
                            "&:hover": { bgcolor: "#fecaca" },
                            width: { xs: 28, sm: 32 },
                            height: { xs: 28, sm: 32 },
                          }}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <Typography
                          sx={{
                            minWidth: { xs: 24, sm: 32 },
                            textAlign: "center",
                            fontWeight: 700,
                            fontSize: { xs: "0.85rem", sm: "1rem" },
                          }}
                        >
                          {item.loads}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            addLoad(item);
                          }}
                          sx={{
                            bgcolor: "#dcfce7",
                            color: "#22c55e",
                            "&:hover": { bgcolor: "#bbf7d0" },
                            width: { xs: 28, sm: 32 },
                            height: { xs: 28, sm: 32 },
                          }}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Box>

                      <Typography
                        sx={{
                          fontWeight: 700,
                          ml: { xs: 1, sm: 2 },
                          color: "primary.main",
                          fontSize: { xs: "0.85rem", sm: "1rem" },
                          minWidth: { xs: 60, sm: 80 },
                          textAlign: "right",
                        }}
                      >
                        ₱{item.total.toFixed(2)}
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Total */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
                p: { xs: 1.5, sm: 2 },
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                borderRadius: 2,
                color: "white",
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: "1rem", sm: "1.25rem" },
                }}
              >
                Total
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "1.25rem", sm: "1.75rem" },
                }}
              >
                ₱{total.toFixed(2)}
              </Typography>
            </Box>

            {/* Payment Buttons */}
            <Stack spacing={1.5}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={() => pay("Cash")}
                startIcon={<PaymentsIcon />}
                disabled={items.length === 0}
                sx={{
                  py: { xs: 1, sm: 1.5 },
                  fontSize: { xs: "0.85rem", sm: "1rem" },
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #059669 0%, #047857 100%)",
                  },
                }}
              >
                Cash
              </Button>
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={() => pay("GCash")}
                startIcon={<AccountBalanceWalletIcon />}
                disabled={items.length === 0}
                sx={{
                  py: { xs: 1, sm: 1.5 },
                  fontSize: { xs: "0.85rem", sm: "1rem" },
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                  },
                }}
              >
                GCash
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <ReceiptPreview
        open={Boolean(receipt)}
        data={receipt}
        onClose={() => setReceipt(null)}
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
    </>
  );
}
