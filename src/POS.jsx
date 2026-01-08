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
  Fade,
  Zoom,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import LocalLaundryServiceIcon from "@mui/icons-material/LocalLaundryService";
import DryCleaningIcon from "@mui/icons-material/DryCleaning";
import IronIcon from "@mui/icons-material/Iron";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import StorefrontIcon from "@mui/icons-material/Storefront";
import ScienceIcon from "@mui/icons-material/Science";
import OpacityIcon from "@mui/icons-material/Opacity";
import ReceiptPreview from "./ReceiptPreview";
import {
  getServices,
  createOrder,
  initializeServices,
  resetServices,
  getInventoryByType,
  deductInventoryForOrder,
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

  // Downy selection state
  const [downyDialogOpen, setDownyDialogOpen] = useState(false);
  const [downyOptions, setDownyOptions] = useState([]);
  const [selectedDownyId, setSelectedDownyId] = useState(null);
  const [pendingWashDryFold, setPendingWashDryFold] = useState(null);

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
  const addLoad = async (service) => {
    const price = Number(service.price) || 0;
    if (price === 0) return;

    const serviceName = service.name.toLowerCase();

    // Check if this is Wash, Dry & Fold - needs downy selection
    if (
      serviceName.includes("wash") &&
      serviceName.includes("dry") &&
      serviceName.includes("fold")
    ) {
      // Load downy options
      const downies = await getInventoryByType("downy");
      setDownyOptions(downies);
      setPendingWashDryFold(service);

      // If there's already a selected downy from previous selection, keep it
      if (!selectedDownyId && downies.length > 0) {
        setSelectedDownyId(downies[0].id);
      }

      setDownyDialogOpen(true);
      return;
    }

    // For other services, add directly
    addServiceToCart(service, price);
  };

  // Add service to cart (internal function)
  const addServiceToCart = (service, price) => {
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

  // Handle downy selection confirmation
  const handleDownyConfirm = () => {
    if (!selectedDownyId) {
      setSnackbar({
        open: true,
        message: "Please select a Downy type",
        severity: "warning",
      });
      return;
    }

    if (pendingWashDryFold) {
      const price = Number(pendingWashDryFold.price) || 0;
      addServiceToCart(pendingWashDryFold, price);
    }

    setDownyDialogOpen(false);
    setPendingWashDryFold(null);
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
  // CREATE ORDER - SAVE TO INDEXEDDB
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
      selectedDownyId, // Store selected downy for reference
    };

    try {
      const result = await createOrder(orderData);

      // Deduct inventory for Wash, Dry & Fold orders and add-ons
      await deductInventoryForOrder(items, selectedDownyId, customer);

      setReceipt({ ...orderData, receiptNumber: result.receiptNumber });
      setSnackbar({
        open: true,
        message: `Order created! Receipt #${result.receiptNumber}`,
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
    setSelectedDownyId(null);
  };

  // =====================
  // SERVICE ICONS & COLORS
  // =====================
  const getServiceIcon = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes("wash")) return <LocalLaundryServiceIcon />;
    if (lower.includes("dry")) return <DryCleaningIcon />;
    if (lower.includes("iron") || lower.includes("press")) return <IronIcon />;
    if (
      lower.includes("downy") ||
      lower.includes("detergent") ||
      lower.includes("zonrox")
    )
      return <ScienceIcon />;
    return <LocalLaundryServiceIcon />;
  };

  const getServiceGradient = (index, name) => {
    const lower = name.toLowerCase();
    if (
      lower.includes("wash") &&
      lower.includes("dry") &&
      lower.includes("fold")
    ) {
      return "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
    }
    if (lower.includes("wash"))
      return "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)";
    if (lower.includes("dry"))
      return "linear-gradient(135deg, #fa709a 0%, #fee140 100%)";
    if (lower.includes("iron"))
      return "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)";
    if (lower.includes("downy"))
      return "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
    if (lower.includes("detergent"))
      return "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)";
    if (lower.includes("zonrox"))
      return "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)";

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
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Left Section - Services */}
        <Grid item xs={12} sm={7} md={7} lg={7}>
          {/* Customer Info Card - Glass Effect */}
          <Fade in timeout={500}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 3 },
                mb: { xs: 2, sm: 3 },
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(20px)",
                borderRadius: 4,
                boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}
              >
                <Avatar
                  sx={{
                    background:
                      "linear-gradient(135deg, #375da5 0%, #2a4a8a 100%)",
                    width: { xs: 36, sm: 44 },
                    height: { xs: 36, sm: 44 },
                  }}
                >
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: "#1e3a5f",
                      lineHeight: 1.2,
                      fontSize: { xs: "1rem", sm: "1.25rem" },
                    }}
                  >
                    Customer Information
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: { xs: "0.65rem", sm: "0.75rem" } }}
                  >
                    Enter customer details to create order
                  </Typography>
                </Box>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Customer Name"
                    placeholder="Enter full name"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <PersonIcon sx={{ mr: 1, color: "#375da5" }} />
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 3,
                        bgcolor: "#f8fafc",
                        "&:hover": { bgcolor: "#f1f5f9" },
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    placeholder="09XX XXX XXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <PhoneIcon sx={{ mr: 1, color: "#10b981" }} />
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 3,
                        bgcolor: "#f8fafc",
                        "&:hover": { bgcolor: "#f1f5f9" },
                      },
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Fade>

          {/* Services Grid - Glass Effect */}
          <Fade in timeout={700}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 3 },
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(20px)",
                borderRadius: 4,
                boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  mb: { xs: 2, sm: 3 },
                }}
              >
                <Avatar
                  sx={{
                    background:
                      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    width: { xs: 36, sm: 44 },
                    height: { xs: 36, sm: 44 },
                  }}
                >
                  <StorefrontIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                </Avatar>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: "#1e3a5f",
                      lineHeight: 1.2,
                      fontSize: { xs: "1rem", sm: "1.25rem" },
                    }}
                  >
                    Select Services
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: { xs: "0.65rem", sm: "0.75rem" } }}
                  >
                    Tap to add service
                  </Typography>
                </Box>
              </Box>

              <Grid container spacing={{ xs: 1, sm: 2 }}>
                {services.map((service, index) => {
                  const itemInCart = items.find((i) => i.id === service.id);
                  const loads = itemInCart ? itemInCart.loads : 0;

                  return (
                    <Grid item xs={4} sm={4} md={3} key={service.id}>
                      <Zoom in timeout={300 + index * 100}>
                        <Card
                          onClick={() => addLoad(service)}
                          sx={{
                            cursor: "pointer",
                            background: getServiceGradient(index, service.name),
                            color: "white",
                            borderRadius: { xs: 2, sm: 4 },
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            position: "relative",
                            overflow: "visible",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                            "&:hover": {
                              transform: "translateY(-8px) scale(1.02)",
                              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                            },
                            "&:active": {
                              transform: "scale(0.95)",
                            },
                          }}
                        >
                          {loads > 0 && (
                            <Badge
                              badgeContent={loads}
                              sx={{
                                position: "absolute",
                                top: -8,
                                right: -8,
                                "& .MuiBadge-badge": {
                                  bgcolor: "#ef4444",
                                  color: "white",
                                  fontWeight: 700,
                                  fontSize: "0.85rem",
                                  minWidth: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  boxShadow: "0 2px 8px rgba(239,68,68,0.5)",
                                },
                              }}
                            />
                          )}
                          <CardContent
                            sx={{
                              p: { xs: 2, sm: 2.5 },
                              "&:last-child": { pb: { xs: 2, sm: 2.5 } },
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
                                  bgcolor: "rgba(255,255,255,0.25)",
                                  backdropFilter: "blur(10px)",
                                  mb: 1.5,
                                  width: { xs: 48, sm: 56 },
                                  height: { xs: 48, sm: 56 },
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                }}
                              >
                                {getServiceIcon(service.name)}
                              </Avatar>
                              <Typography
                                sx={{
                                  fontWeight: 700,
                                  fontSize: { xs: "0.8rem", sm: "0.95rem" },
                                  lineHeight: 1.3,
                                  mb: 1,
                                  textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                                }}
                              >
                                {service.name}
                              </Typography>
                              <Chip
                                label={`₱${Number(service.price).toFixed(0)}`}
                                size="small"
                                sx={{
                                  bgcolor: "rgba(255,255,255,0.25)",
                                  backdropFilter: "blur(10px)",
                                  color: "white",
                                  fontWeight: 800,
                                  fontSize: { xs: "0.75rem", sm: "0.9rem" },
                                  height: 28,
                                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                }}
                              />
                            </Box>
                          </CardContent>
                        </Card>
                      </Zoom>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          </Fade>
        </Grid>

        {/* Right Section - Order Summary */}
        <Grid item xs={12} sm={5} md={5} lg={5}>
          <Fade in timeout={900}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 3 },
                background: "rgba(255, 255, 255, 0.98)",
                backdropFilter: "blur(20px)",
                borderRadius: 4,
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                position: { sm: "sticky" },
                top: { sm: 100 },
              }}
            >
              {/* Cart Header */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  mb: { xs: 2, sm: 3 },
                }}
              >
                <Avatar
                  sx={{
                    background:
                      "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    width: { xs: 36, sm: 44 },
                    height: { xs: 36, sm: 44 },
                  }}
                >
                  <ShoppingCartIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: "#1e3a5f",
                      lineHeight: 1.2,
                      fontSize: { xs: "1rem", sm: "1.25rem" },
                    }}
                  >
                    Order Summary
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: { xs: "0.65rem", sm: "0.75rem" } }}
                  >
                    {items.length} service(s) •{" "}
                    {items.reduce((sum, i) => sum + i.loads, 0)} item(s)
                  </Typography>
                </Box>
                {items.length > 0 && (
                  <Chip
                    label={items.reduce((sum, i) => sum + i.loads, 0)}
                    size="medium"
                    sx={{
                      bgcolor: "#375da5",
                      color: "white",
                      fontWeight: 700,
                      fontSize: "1rem",
                      height: 36,
                      minWidth: 36,
                    }}
                  />
                )}
              </Box>

              {items.length === 0 ? (
                <Box
                  sx={{
                    py: 6,
                    textAlign: "center",
                    background:
                      "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
                    borderRadius: 3,
                    border: "2px dashed #cbd5e1",
                  }}
                >
                  <ShoppingCartIcon
                    sx={{ fontSize: 64, color: "#94a3b8", opacity: 0.5, mb: 2 }}
                  />
                  <Typography color="text.secondary" fontWeight={500}>
                    Your cart is empty
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Select services from the left panel
                  </Typography>
                </Box>
              ) : (
                <Stack
                  spacing={1.5}
                  sx={{ mb: 3, maxHeight: 300, overflow: "auto" }}
                >
                  {items.map((item) => (
                    <Paper
                      key={item.id}
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        background:
                          "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                        border: "1px solid #e2e8f0",
                        transition: "all 0.2s",
                        "&:hover": {
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        },
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
                            sx={{
                              fontWeight: 700,
                              fontSize: "0.95rem",
                              color: "#1e3a5f",
                            }}
                          >
                            {item.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: "#64748b" }}
                          >
                            ₱{Number(item.price).toFixed(2)} × {item.loads}{" "}
                            load(s)
                          </Typography>
                        </Box>

                        <Stack direction="row" alignItems="center" spacing={1}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeLoad(item);
                            }}
                            sx={{
                              bgcolor: "#fee2e2",
                              color: "#dc2626",
                              width: 32,
                              height: 32,
                              "&:hover": { bgcolor: "#fecaca" },
                            }}
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography
                            sx={{
                              minWidth: 32,
                              textAlign: "center",
                              fontWeight: 800,
                              fontSize: "1.1rem",
                              color: "#1e3a5f",
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
                              color: "#16a34a",
                              width: 32,
                              height: 32,
                              "&:hover": { bgcolor: "#bbf7d0" },
                            }}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>

                          <Typography
                            sx={{
                              fontWeight: 800,
                              ml: 1,
                              color: "#375da5",
                              fontSize: "1rem",
                              minWidth: 70,
                              textAlign: "right",
                            }}
                          >
                            ₱{item.total.toFixed(2)}
                          </Typography>
                        </Stack>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Total Section */}
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  background:
                    "linear-gradient(135deg, #1e3a5f 0%, #375da5 100%)",
                  borderRadius: 3,
                  color: "white",
                  mb: 3,
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.8, mb: 0.5 }}>
                      Total Amount
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      ₱{total.toFixed(2)}
                    </Typography>
                  </Box>
                  <Avatar
                    sx={{
                      width: 56,
                      height: 56,
                      bgcolor: "rgba(255,255,255,0.15)",
                    }}
                  >
                    <ShoppingCartIcon sx={{ fontSize: 28 }} />
                  </Avatar>
                </Stack>
              </Paper>

              {/* Create Order Button */}
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={() => pay("Unpaid")}
                startIcon={<ShoppingCartIcon />}
                disabled={items.length === 0 || !customer || !phone}
                sx={{
                  py: 2,
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  borderRadius: 3,
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  boxShadow: "0 8px 24px rgba(16, 185, 129, 0.4)",
                  transition: "all 0.3s",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #059669 0%, #047857 100%)",
                    transform: "translateY(-2px)",
                    boxShadow: "0 12px 32px rgba(16, 185, 129, 0.5)",
                  },
                  "&:disabled": {
                    background: "#94a3b8",
                    boxShadow: "none",
                  },
                }}
              >
                Create Order
              </Button>

              {(!customer || !phone) && items.length > 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    textAlign: "center",
                    mt: 1,
                    color: "#f59e0b",
                    fontWeight: 500,
                  }}
                >
                  ⚠️ Please fill in customer information
                </Typography>
              )}
            </Paper>
          </Fade>
        </Grid>
      </Grid>

      <ReceiptPreview
        open={Boolean(receipt)}
        data={receipt}
        onClose={() => setReceipt(null)}
      />

      {/* Downy Selection Dialog */}
      <Dialog
        open={downyDialogOpen}
        onClose={() => {
          setDownyDialogOpen(false);
          setPendingWashDryFold(null);
        }}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            fontWeight: 700,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <OpacityIcon />
            Select Downy Type
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose which Downy to use for this Wash, Dry & Fold service:
          </Typography>
          <FormControl component="fieldset" fullWidth>
            <RadioGroup
              value={selectedDownyId || ""}
              onChange={(e) => setSelectedDownyId(parseInt(e.target.value))}
            >
              {downyOptions.map((downy) => (
                <Paper
                  key={downy.id}
                  elevation={0}
                  sx={{
                    p: 2,
                    mb: 1,
                    borderRadius: 2,
                    border:
                      selectedDownyId === downy.id
                        ? "2px solid #667eea"
                        : "2px solid #e2e8f0",
                    background:
                      selectedDownyId === downy.id
                        ? "linear-gradient(135deg, #f0f0ff 0%, #e8e8ff 100%)"
                        : "#f8fafc",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      borderColor: "#667eea",
                    },
                  }}
                  onClick={() => setSelectedDownyId(downy.id)}
                >
                  <FormControlLabel
                    value={downy.id}
                    control={
                      <Radio
                        sx={{
                          color: "#667eea",
                          "&.Mui-checked": { color: "#667eea" },
                        }}
                      />
                    }
                    label={
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                        }}
                      >
                        <Box>
                          <Typography
                            sx={{ fontWeight: 700, color: "#1e3a5f" }}
                          >
                            {downy.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: "#64748b" }}
                          >
                            Available: {downy.quantity} {downy.unit}
                          </Typography>
                        </Box>
                        <Chip
                          label={
                            downy.quantity > 0 ? "In Stock" : "Out of Stock"
                          }
                          size="small"
                          sx={{
                            fontWeight: 600,
                            bgcolor: downy.quantity > 0 ? "#10b981" : "#ef4444",
                            color: "white",
                          }}
                        />
                      </Box>
                    }
                    sx={{
                      m: 0,
                      width: "100%",
                      "& .MuiFormControlLabel-label": { width: "100%" },
                    }}
                  />
                </Paper>
              ))}
            </RadioGroup>
          </FormControl>

          {selectedDownyId && (
            <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
              Selected downy will be auto-deducted from inventory when order is
              created.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => {
              setDownyDialogOpen(false);
              setPendingWashDryFold(null);
            }}
            sx={{ borderRadius: 2, fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDownyConfirm}
            disabled={!selectedDownyId}
            sx={{
              borderRadius: 2,
              fontWeight: 700,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
          >
            Add to Order
          </Button>
        </DialogActions>
      </Dialog>

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
          sx={{ width: "100%", borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
