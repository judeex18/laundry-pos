import { useState } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  InputAdornment,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Chip,
  Grid,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import LocalLaundryServiceIcon from "@mui/icons-material/LocalLaundryService";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import DryCleaningIcon from "@mui/icons-material/DryCleaning";
import IronIcon from "@mui/icons-material/Iron";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { trackOrderFromSupabase } from "./db/supabase";

// Status configuration for tracking
const statusSteps = ["Received", "Washing", "Drying", "Ready", "Released"];

const statusConfig = {
  Received: {
    icon: <ReceiptLongIcon />,
    color: "#3b82f6",
    description: "Your laundry has been received",
  },
  Washing: {
    icon: <LocalLaundryServiceIcon />,
    color: "#8b5cf6",
    description: "Your laundry is being washed",
  },
  Drying: {
    icon: <DryCleaningIcon />,
    color: "#f59e0b",
    description: "Your laundry is being dried",
  },
  Ready: {
    icon: <IronIcon />,
    color: "#10b981",
    description: "Your laundry is ready for pickup!",
  },
  Released: {
    icon: <CheckCircleIcon />,
    color: "#6b7280",
    description: "Your laundry has been released",
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
      const result = await trackOrderFromSupabase(receiptNumber.trim());

      if (result) {
        setTrackingResult(result);
      } else {
        setTrackingError("No order found with this receipt number");
      }
    } catch (error) {
      setTrackingError(
        "Unable to connect to server. Please check your connection."
      );
    } finally {
      setIsTracking(false);
    }
  };

  const getActiveStep = (status) => {
    return statusSteps.indexOf(status);
  };

  const goToAdmin = () => {
    window.location.href = "/admin";
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #ffbd59 0%, #ffcf85 100%)",
        py: { xs: 2, sm: 4 },
      }}
    >
      <Container maxWidth="md">
        {/* Header */}
        <Box
          sx={{
            textAlign: "center",
            mb: { xs: 3, sm: 4 },
          }}
        >
          <Box
            component="img"
            src="/IansLogo.png"
            alt="Ian's Laundry Hub"
            sx={{
              width: { xs: 100, sm: 150, md: 180 },
              height: { xs: 100, sm: 150, md: 180 },
              objectFit: "contain",
              mb: 2,
            }}
          />
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "#375da5",
              fontSize: { xs: "1.5rem", sm: "2rem", md: "2.5rem" },
            }}
          >
            Ian's Laundry Hub
          </Typography>
          <Typography
            sx={{
              color: "#1e3a5f",
              fontSize: { xs: "0.9rem", sm: "1.1rem" },
              mt: 1,
            }}
          >
            Track Your Laundry Order
          </Typography>
        </Box>

        {/* Order Tracking Section */}
        <Paper
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: { xs: 2, sm: 3 },
            background: "white",
          }}
        >
          <Typography
            variant="h5"
            sx={{
              mb: 3,
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: "primary.main",
              fontWeight: 600,
              fontSize: { xs: "1.1rem", sm: "1.5rem" },
            }}
          >
            <SearchIcon /> Track Your Laundry
          </Typography>

          <Typography
            sx={{
              color: "text.secondary",
              mb: 3,
              fontSize: { xs: "0.85rem", sm: "1rem" },
            }}
          >
            Enter your official receipt number to check the status of your
            laundry
          </Typography>

          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Enter Receipt Number (e.g., ORD-20260107-001)"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleTrack()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <ReceiptLongIcon color="action" />
                  </InputAdornment>
                ),
              }}
              size="medium"
            />
            <Button
              variant="contained"
              onClick={handleTrack}
              disabled={isTracking}
              sx={{
                px: { xs: 2, sm: 4 },
                minWidth: { xs: 100, sm: 120 },
              }}
            >
              {isTracking ? "Tracking..." : "Track"}
            </Button>
          </Box>

          {trackingError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {trackingError}
            </Alert>
          )}

          {/* Tracking Result */}
          {trackingResult && (
            <Card
              sx={{
                borderRadius: 2,
                border: `2px solid ${
                  statusConfig[trackingResult.status]?.color || "#375da5"
                }`,
                background: `linear-gradient(135deg, ${
                  statusConfig[trackingResult.status]?.color
                }10 0%, white 100%)`,
              }}
            >
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                {/* Order Header */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{ color: "primary.main", fontWeight: 600 }}
                  >
                    Receipt #{trackingResult.receiptNumber}
                  </Typography>
                  <Chip
                    icon={statusConfig[trackingResult.status]?.icon}
                    label={trackingResult.status}
                    sx={{
                      bgcolor:
                        statusConfig[trackingResult.status]?.color || "#375da5",
                      color: "white",
                      fontWeight: 600,
                    }}
                  />
                </Box>

                {/* Customer Info */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Customer
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>
                    {trackingResult.customerName}
                  </Typography>
                </Box>

                {/* Status Description */}
                <Alert
                  icon={statusConfig[trackingResult.status]?.icon}
                  severity={
                    trackingResult.status === "Ready" ? "success" : "info"
                  }
                  sx={{ mb: 3 }}
                >
                  {statusConfig[trackingResult.status]?.description}
                </Alert>

                {/* Progress Stepper */}
                <Stepper
                  activeStep={getActiveStep(trackingResult.status)}
                  alternativeLabel
                  sx={{
                    "& .MuiStepLabel-label": {
                      fontSize: { xs: "0.65rem", sm: "0.75rem" },
                    },
                  }}
                >
                  {statusSteps.map((label) => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>

                <Divider sx={{ my: 3 }} />

                {/* Order Details */}
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      <AccessTimeIcon
                        sx={{
                          fontSize: 14,
                          mr: 0.5,
                          verticalAlign: "middle",
                        }}
                      />
                      Order Date
                    </Typography>
                    <Typography sx={{ fontWeight: 500, fontSize: "0.9rem" }}>
                      {new Date(trackingResult.createdAt).toLocaleDateString(
                        "en-PH",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Total Amount
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 600,
                        color: "primary.main",
                        fontSize: "1.1rem",
                      }}
                    >
                      ₱{trackingResult.total?.toFixed(2)}
                    </Typography>
                  </Grid>
                </Grid>

                {/* Items */}
                {trackingResult.items && trackingResult.items.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      Services
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      {trackingResult.items.map((item, idx) => (
                        <Chip
                          key={idx}
                          label={`${item.name} x${item.loads || item.qty || 1}`}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* No tracking result placeholder */}
          {!trackingResult && !trackingError && (
            <Box
              sx={{
                textAlign: "center",
                py: { xs: 4, sm: 6 },
                color: "text.secondary",
              }}
            >
              <LocalLaundryServiceIcon
                sx={{ fontSize: { xs: 48, sm: 64 }, opacity: 0.3, mb: 2 }}
              />
              <Typography>
                Enter your receipt number above to track your order
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Admin Link - Small and subtle */}
        <Box
          sx={{
            textAlign: "center",
            mt: 4,
          }}
        >
          <Button
            variant="text"
            size="small"
            startIcon={<AdminPanelSettingsIcon />}
            onClick={goToAdmin}
            sx={{
              color: "#1e3a5f",
              opacity: 0.6,
              fontSize: "0.75rem",
              "&:hover": {
                opacity: 1,
                bgcolor: "rgba(0,0,0,0.05)",
              },
            }}
          >
            Admin Login
          </Button>
        </Box>

        {/* Footer */}
        <Box
          sx={{
            textAlign: "center",
            mt: 2,
            color: "#1e3a5f",
            opacity: 0.7,
          }}
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
