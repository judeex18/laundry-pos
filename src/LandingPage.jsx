import { useState } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  InputAdornment,
  IconButton,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Chip,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";
import SearchIcon from "@mui/icons-material/Search";
import LocalLaundryServiceIcon from "@mui/icons-material/LocalLaundryService";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import DryCleaningIcon from "@mui/icons-material/DryCleaning";
import IronIcon from "@mui/icons-material/Iron";
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

function LandingPage({ onLogin }) {
  // Login state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Tracking state
  const [receiptNumber, setReceiptNumber] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingError, setTrackingError] = useState("");
  const [isTracking, setIsTracking] = useState(false);

  // Handle login
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError("");

    // Simple admin credentials (in production, use proper authentication)
    if (username === "admin" && password === "admin123") {
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userRole", "admin");
      onLogin();
    } else if (username === "staff" && password === "staff123") {
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userRole", "staff");
      onLogin();
    } else {
      setLoginError("Invalid username or password");
    }
  };

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

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #ffbd59 0%, #ffcf85 100%)",
        py: { xs: 2, sm: 4 },
      }}
    >
      <Container maxWidth="lg">
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
              width: { xs: 120, sm: 180, md: 200 },
              height: { xs: 120, sm: 180, md: 200 },
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
              fontSize: { xs: "1.2rem", sm: "2rem" },
              mt: 1,
            }}
          >
            Smart Laundry Management System
          </Typography>
        </Box>

        <Grid
          container
          spacing={{ xs: 2, sm: 4 }}
          direction="row"
          wrap="nowrap"
          sx={{ flexDirection: { xs: "column", sm: "row" } }}
        >
          {/* Login Section */}
          <Grid item xs={12} sm={5}>
            <Paper
              sx={{
                p: { xs: 2, sm: 4 },
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
                <PersonIcon />
                Login
              </Typography>

              <Typography
                sx={{
                  color: "text.secondary",
                  mb: 3,
                  fontSize: { xs: "0.85rem", sm: "1rem" },
                }}
              >
                Login to access the POS system
              </Typography>

              <form onSubmit={handleLogin}>
                <TextField
                  fullWidth
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? (
                            <VisibilityOffIcon />
                          ) : (
                            <VisibilityIcon />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />

                {loginError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {loginError}
                  </Alert>
                )}

                <Button
                  fullWidth
                  variant="contained"
                  type="submit"
                  size="large"
                  sx={{ py: 1.5 }}
                >
                  Login
                </Button>
              </form>

              <Divider sx={{ my: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Demo Credentials
                </Typography>
              </Divider>

              <Box
                sx={{
                  bgcolor: "grey.100",
                  borderRadius: 2,
                  p: 2,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, mb: 1, color: "text.secondary" }}
                >
                  Admin Login:
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  Username: <code>admin</code>
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Password: <code>admin123</code>
                </Typography>

                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, mb: 1, color: "text.secondary" }}
                >
                  Staff Login:
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  Username: <code>staff</code>
                </Typography>
                <Typography variant="body2">
                  Password: <code>staff123</code>
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Order Tracking Section */}
          <Grid item xs={12} sm={7}>
            <Paper
              sx={{
                p: { xs: 2, sm: 4 },
                borderRadius: { xs: 2, sm: 3 },
                background: "white",
                height: "100%",
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
                  placeholder="Enter Receipt Number (e.g., ORD-001)"
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
                            statusConfig[trackingResult.status]?.color ||
                            "#375da5",
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
                        <Typography
                          sx={{ fontWeight: 500, fontSize: "0.9rem" }}
                        >
                          {new Date(
                            trackingResult.createdAt
                          ).toLocaleDateString("en-PH", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
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
                    {trackingResult.items &&
                      trackingResult.items.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 1 }}
                          >
                            Services
                          </Typography>
                          <Box
                            sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}
                          >
                            {trackingResult.items.map((item, idx) => (
                              <Chip
                                key={idx}
                                label={`${item.name} x${
                                  item.loads || item.qty || 1
                                }`}
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
          </Grid>
        </Grid>

        {/* Footer */}
        <Box
          sx={{
            textAlign: "center",
            mt: 4,
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

export default LandingPage;
