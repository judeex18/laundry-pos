import { useState } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  InputAdornment,
  Alert,
  Divider,
  Avatar,
  Stack,
  Fade,
  Zoom,
  LinearProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import LocalLaundryServiceIcon from "@mui/icons-material/LocalLaundryService";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import DryCleaningIcon from "@mui/icons-material/DryCleaning";
import IronIcon from "@mui/icons-material/Iron";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import InventoryIcon from "@mui/icons-material/Inventory";
import CelebrationIcon from "@mui/icons-material/Celebration";
import { trackOrder } from "./db/database";
import { supabase } from "./db/supabase";

// Status configuration for tracking
const statusSteps = ["Received", "Washing", "Drying", "Ready", "Released"];

const statusConfig = {
  Received: {
    icon: <InventoryIcon />,
    color: "#3b82f6",
    bgGradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    description: "Your laundry has been received and is in queue",
    emoji: "📥",
  },
  Washing: {
    icon: <WaterDropIcon />,
    color: "#8b5cf6",
    bgGradient: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
    description: "Your clothes are being washed with care",
    emoji: "🧺",
  },
  Drying: {
    icon: <WbSunnyIcon />,
    color: "#f59e0b",
    bgGradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    description: "Your clothes are being dried",
    emoji: "☀️",
  },
  Ready: {
    icon: <CheckCircleIcon />,
    color: "#10b981",
    bgGradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    description: "Your laundry is ready for pickup!",
    emoji: "✅",
  },
  Released: {
    icon: <CelebrationIcon />,
    color: "#6b7280",
    bgGradient: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
    description: "Your laundry has been picked up. Thank you!",
    emoji: "🎉",
  },
};

function TrackOrder() {
  // Tracking state
  const [receiptNumber, setReceiptNumber] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingError, setTrackingError] = useState("");
  const [isTracking, setIsTracking] = useState(false);

  // Handle tracking - fetch from Supabase
  const handleTrack = async () => {
    if (!receiptNumber.trim()) {
      setTrackingError("Please enter a receipt number");
      return;
    }

    setIsTracking(true);
    setTrackingError("");
    setTrackingResult(null);

    try {
      console.log("Searching for receipt number:", receiptNumber.trim());

      // First, let's check if there are any orders at all
      const { data: allOrders, error: countError } = await supabase
        .from("orders")
        .select("id, receipt_number")
        .limit(5);

      console.log(
        "Sample orders in database:",
        allOrders,
        "Count error:",
        countError,
      );

      const result = await trackOrder(receiptNumber.trim());
      console.log("Search result:", result);

      if (result) {
        setTrackingResult(result);
      } else {
        setTrackingError("No order found with this receipt number");
      }
    } catch (error) {
      console.error("Tracking error:", error);
      console.error("Error details:", error.message);
      setTrackingError(`Unable to connect to server: ${error.message}`);
    } finally {
      setIsTracking(false);
    }
  };

  const getProgress = (status) => {
    const index = statusSteps.indexOf(status);
    return ((index + 1) / statusSteps.length) * 100;
  };

  const goToAdmin = () => {
    window.location.href = "/admin";
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-PH", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #1e3a5f 0%, #375da5 50%, #ffbd59 100%)",
        py: { xs: 2, sm: 4 },
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated Background Bubbles */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: "hidden",
          pointerEvents: "none",
          "& .bubble": {
            position: "absolute",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.1)",
            animation: "float 6s ease-in-out infinite",
          },
          "@keyframes float": {
            "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
            "50%": { transform: "translateY(-20px) rotate(180deg)" },
          },
        }}
      >
        <Box
          className="bubble"
          sx={{
            width: 60,
            height: 60,
            top: "10%",
            left: "10%",
            animationDelay: "0s",
          }}
        />
        <Box
          className="bubble"
          sx={{
            width: 100,
            height: 100,
            top: "20%",
            right: "15%",
            animationDelay: "1s",
          }}
        />
        <Box
          className="bubble"
          sx={{
            width: 40,
            height: 40,
            bottom: "30%",
            left: "20%",
            animationDelay: "2s",
          }}
        />
        <Box
          className="bubble"
          sx={{
            width: 80,
            height: 80,
            bottom: "15%",
            right: "10%",
            animationDelay: "3s",
          }}
        />
      </Box>

      <Container maxWidth="sm" sx={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <Fade in timeout={800}>
          <Box
            sx={{
              textAlign: "center",
              mb: { xs: 3, sm: 4 },
            }}
          >
            <Avatar
              sx={{
                width: { xs: 80, sm: 120 },
                height: { xs: 80, sm: 120 },
                mx: "auto",
                mb: 2,
                bgcolor: "white",
                boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              }}
            >
              <Box
                component="img"
                src="/IansLogo.png"
                alt="Ian's Laundry Hub"
                sx={{
                  width: "90%",
                  height: "90%",
                  objectFit: "contain",
                }}
              />
            </Avatar>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: "white",
                fontSize: { xs: "1.5rem", sm: "2rem", md: "2.5rem" },
                textShadow: "0 2px 10px rgba(0,0,0,0.3)",
              }}
            >
              Ian's Laundry Hub
            </Typography>
            <Typography
              sx={{
                color: "rgba(255,255,255,0.9)",
                fontSize: { xs: "0.9rem", sm: "1.1rem" },
                mt: 1,
              }}
            >
              🧺 Track Your Laundry Status
            </Typography>
          </Box>
        </Fade>

        {/* Search Card */}
        <Zoom in timeout={500}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: 4,
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              mb: 3,
            }}
          >
            <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
              <TextField
                fullWidth
                placeholder="Enter your receipt number (e.g., ORD-20260107-001)"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === "Enter" && handleTrack()}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <ReceiptLongIcon sx={{ color: "#375da5" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    fontSize: { xs: "0.9rem", sm: "1rem" },
                    bgcolor: "#f8fafc",
                  },
                }}
              />
              <Button
                variant="contained"
                onClick={handleTrack}
                disabled={isTracking}
                sx={{
                  px: { xs: 3, sm: 4 },
                  borderRadius: 3,
                  background:
                    "linear-gradient(135deg, #375da5 0%, #2a4a8a 100%)",
                  boxShadow: "0 4px 15px rgba(55, 93, 165, 0.4)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #2a4a8a 0%, #1e3a6e 100%)",
                  },
                }}
              >
                <SearchIcon />
              </Button>
            </Box>

            {isTracking && <LinearProgress sx={{ borderRadius: 2, mb: 2 }} />}

            {trackingError && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {trackingError}
              </Alert>
            )}

            {!trackingResult && !trackingError && !isTracking && (
              <Box sx={{ textAlign: "center", py: 3, color: "text.secondary" }}>
                <LocalLaundryServiceIcon
                  sx={{ fontSize: 48, opacity: 0.3, mb: 1 }}
                />
                <Typography variant="body2">
                  Enter your receipt number to track your order
                </Typography>
              </Box>
            )}
          </Paper>
        </Zoom>

        {/* Receipt Result - Realistic Receipt Style */}
        {trackingResult && (
          <Fade in timeout={600}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 4,
                overflow: "hidden",
                boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                background: "white",
                position: "relative",
                // Receipt edge effect
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 8,
                  background: statusConfig[trackingResult.status]?.bgGradient,
                },
              }}
            >
              {/* Status Header */}
              <Box
                sx={{
                  background: statusConfig[trackingResult.status]?.bgGradient,
                  color: "white",
                  p: { xs: 3, sm: 4 },
                  textAlign: "center",
                  position: "relative",
                }}
              >
                <Typography
                  sx={{ fontSize: { xs: "2.5rem", sm: "3.5rem" }, mb: 1 }}
                >
                  {statusConfig[trackingResult.status]?.emoji}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
                  {trackingResult.status === "Ready"
                    ? "Ready for Pickup!"
                    : trackingResult.status}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {statusConfig[trackingResult.status]?.description}
                </Typography>

                {/* Progress Bar */}
                <Box sx={{ mt: 3, px: { xs: 0, sm: 4 } }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    {statusSteps.map((step, index) => {
                      const isActive =
                        statusSteps.indexOf(trackingResult.status) >= index;
                      return (
                        <Box
                          key={step}
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            flex: 1,
                          }}
                        >
                          <Avatar
                            sx={{
                              width: { xs: 28, sm: 36 },
                              height: { xs: 28, sm: 36 },
                              bgcolor: isActive
                                ? "white"
                                : "rgba(255,255,255,0.3)",
                              color: isActive
                                ? statusConfig[trackingResult.status]?.color
                                : "white",
                              fontSize: { xs: "0.7rem", sm: "0.9rem" },
                              fontWeight: 700,
                              transition: "all 0.3s ease",
                            }}
                          >
                            {isActive ? "✓" : index + 1}
                          </Avatar>
                          <Typography
                            sx={{
                              fontSize: { xs: "0.55rem", sm: "0.7rem" },
                              mt: 0.5,
                              opacity: isActive ? 1 : 0.6,
                              fontWeight: isActive ? 600 : 400,
                            }}
                          >
                            {step}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getProgress(trackingResult.status)}
                    sx={{
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
              </Box>

              {/* Receipt Body */}
              <Box sx={{ p: { xs: 3, sm: 4 } }}>
                {/* Receipt Number - Like a real receipt */}
                <Box
                  sx={{
                    textAlign: "center",
                    mb: 3,
                    pb: 3,
                    borderBottom: "2px dashed #e2e8f0",
                  }}
                >
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ letterSpacing: 2 }}
                  >
                    RECEIPT NUMBER
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 800,
                      color: "#375da5",
                      fontFamily: "monospace",
                      letterSpacing: 1,
                    }}
                  >
                    {trackingResult.receiptNumber}
                  </Typography>
                </Box>

                {/* Customer Details */}
                <Box sx={{ mb: 3 }}>
                  <Stack spacing={2}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: "#f0f7ff",
                          color: "#375da5",
                          width: 40,
                          height: 40,
                        }}
                      >
                        <PersonIcon fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Customer Name
                        </Typography>
                        <Typography fontWeight={600}>
                          {trackingResult.customerName}
                        </Typography>
                      </Box>
                    </Box>

                    {trackingResult.phone && (
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: "#f0fdf4",
                            color: "#10b981",
                            width: 40,
                            height: 40,
                          }}
                        >
                          <PhoneIcon fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Phone Number
                          </Typography>
                          <Typography fontWeight={600}>
                            {trackingResult.phone}
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: "#fef3c7",
                          color: "#f59e0b",
                          width: 40,
                          height: 40,
                        }}
                      >
                        <CalendarTodayIcon fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Order Date
                        </Typography>
                        <Typography
                          fontWeight={600}
                          sx={{ fontSize: "0.9rem" }}
                        >
                          {formatDate(trackingResult.createdAt)}
                        </Typography>
                      </Box>
                    </Box>
                  </Stack>
                </Box>

                <Divider sx={{ my: 3, borderStyle: "dashed" }} />

                {/* Services List - Like itemized receipt */}
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ letterSpacing: 2, mb: 2, display: "block" }}
                  >
                    SERVICES
                  </Typography>
                  <Stack spacing={1.5}>
                    {trackingResult.items?.map((item, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          p: 1.5,
                          bgcolor: "#f8fafc",
                          borderRadius: 2,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                          }}
                        >
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: "#375da5",
                              fontSize: "0.75rem",
                            }}
                          >
                            <LocalLaundryServiceIcon sx={{ fontSize: 18 }} />
                          </Avatar>
                          <Box>
                            <Typography fontWeight={600} fontSize="0.9rem">
                              {item.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {item.loads || item.qty || 1} × ₱
                              {item.price || item.total / (item.loads || 1)}
                            </Typography>
                          </Box>
                        </Box>
                        <Typography fontWeight={700} color="#375da5">
                          ₱
                          {(
                            item.total || item.price * (item.loads || 1)
                          ).toFixed(2)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>

                <Divider sx={{ my: 3, borderStyle: "dashed" }} />

                {/* Total - Bold like receipt */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    p: 2,
                    bgcolor: "#375da5",
                    borderRadius: 3,
                    color: "white",
                  }}
                >
                  <Typography variant="h6" fontWeight={600}>
                    TOTAL
                  </Typography>
                  <Typography variant="h4" fontWeight={800}>
                    ₱{trackingResult.total?.toFixed(2)}
                  </Typography>
                </Box>

                {/* Ready Pickup Notice */}
                {trackingResult.status === "Ready" && (
                  <Alert
                    severity="success"
                    sx={{
                      mt: 3,
                      borderRadius: 3,
                      "& .MuiAlert-icon": {
                        fontSize: 28,
                      },
                    }}
                  >
                    <Typography fontWeight={600}>
                      Your laundry is ready! 🎉
                    </Typography>
                    <Typography variant="body2">
                      Please visit the store to pick up your items. Don't forget
                      to bring this receipt number.
                    </Typography>
                  </Alert>
                )}

                {/* Thank You Message */}
                <Box
                  sx={{
                    textAlign: "center",
                    mt: 3,
                    pt: 3,
                    borderTop: "2px dashed #e2e8f0",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Thank you for choosing
                  </Typography>
                  <Typography
                    fontWeight={700}
                    color="#375da5"
                    sx={{ fontSize: "1.1rem" }}
                  >
                    Ian's Laundry Hub
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 1 }}
                  >
                    Fresh • Clean • Affordable
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Fade>
        )}

        {/* Admin Link - Small and subtle */}
        <Box sx={{ textAlign: "center", mt: 4 }}>
          <Button
            variant="text"
            size="small"
            startIcon={<AdminPanelSettingsIcon />}
            onClick={goToAdmin}
            sx={{
              color: "rgba(255,255,255,0.6)",
              fontSize: "0.75rem",
              "&:hover": {
                color: "white",
                bgcolor: "rgba(255,255,255,0.1)",
              },
            }}
          >
            Staff Login
          </Button>
        </Box>

        {/* Footer */}
        <Box
          sx={{ textAlign: "center", mt: 2, color: "rgba(255,255,255,0.7)" }}
        >
          <Typography variant="body2">
            © 2023 Ian's Laundry Hub. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

export default TrackOrder;
