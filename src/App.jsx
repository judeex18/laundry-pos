import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Tabs,
  Tab,
  Paper,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Button,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import LogoutIcon from "@mui/icons-material/Logout";
import POS from "./POS";
import OrderBoard from "./OrderBoard";
import DailyReport from "./DailyReport";
import LandingPage from "./LandingPage";

// Custom theme with Ian's Laundry Hub colors (Blue & Gold theme)
const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#375da5",
      light: "#5a7fc7",
      dark: "#2a4a8a",
    },
    secondary: {
      main: "#ffbd59",
      light: "#ffcf85",
      dark: "#e5a63d",
    },
    success: {
      main: "#10b981",
      light: "#34d399",
      dark: "#059669",
    },
    warning: {
      main: "#f59e0b",
      light: "#fbbf24",
      dark: "#d97706",
    },
    info: {
      main: "#3b82f6",
      light: "#60a5fa",
      dark: "#2563eb",
    },
    background: {
      default: "#f5f7fa",
      paper: "#fff8e7",
    },
    text: {
      primary: "#1e3a5f",
      secondary: "#64748b",
    },
  },
  typography: {
    fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif",
    h4: {
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 10,
          padding: "10px 20px",
        },
        contained: {
          boxShadow: "0 4px 14px 0 rgba(55, 93, 165, 0.39)",
          "&:hover": {
            boxShadow: "0 6px 20px rgba(55, 93, 165, 0.4)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)",
          border: "1px solid rgba(0,0,0,0.05)",
          "&:hover": {
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
          },
          transition: "all 0.3s ease",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 10,
            "&:hover fieldset": {
              borderColor: "#375da5",
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
  },
});

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("isLoggedIn") === "true";
  });

  const [page, setPage] = useState(() => {
    // Restore the last visited tab from localStorage
    return localStorage.getItem("currentTab") || "pos";
  });

  const handleTabChange = (newPage) => {
    setPage(newPage);
    localStorage.setItem("currentTab", newPage);
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userRole");
    setIsLoggedIn(false);
  };

  // Show landing page if not logged in
  if (!isLoggedIn) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LandingPage onLogin={handleLogin} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #ffbd59 0%, #ffcf85 100%)",
        }}
      >
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            background: "linear-gradient(135deg, #375da5 0%, #2a4a8a 100%)",
            borderRadius: 0,
            py: { xs: 1.5, sm: 2 },
            px: { xs: 1.5, sm: 3 },
            mb: { xs: 2, sm: 3 },
          }}
        >
          <Container maxWidth="xl">
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              {/* Logo */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: { xs: 1, sm: 1.5 },
                }}
              >
                <Box
                  component="img"
                  src="/IansLogo.png"
                  alt="Ian's Laundry Hub"
                  sx={{
                    width: { xs: 48, sm: 64 },
                    height: { xs: 48, sm: 64 },
                    objectFit: "contain",
                  }}
                />
                <Box>
                  <Box
                    component="span"
                    sx={{
                      color: "white",
                      fontWeight: 700,
                      fontSize: { xs: "1.1rem", sm: "1.5rem" },
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Ian's Laundry Hub
                  </Box>
                  <Box
                    sx={{
                      color: "rgba(255,255,255,0.7)",
                      fontSize: { xs: "0.65rem", sm: "0.75rem" },
                      mt: -0.5,
                      display: { xs: "none", sm: "block" },
                    }}
                  >
                    Smart Laundry Management
                  </Box>
                </Box>
              </Box>

              {/* Navigation Tabs */}
              <Tabs
                value={page}
                onChange={(e, v) => handleTabChange(v)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  "& .MuiTab-root": {
                    color: "rgba(255,255,255,0.7)",
                    fontWeight: 600,
                    fontSize: { xs: "0.75rem", sm: "0.9rem" },
                    textTransform: "none",
                    minHeight: { xs: 40, sm: 48 },
                    minWidth: { xs: "auto", sm: 120 },
                    px: { xs: 1.5, sm: 2 },
                    "&.Mui-selected": {
                      color: "white",
                    },
                  },
                  "& .MuiTabs-indicator": {
                    backgroundColor: "white",
                    height: 3,
                    borderRadius: "3px 3px 0 0",
                  },
                  "& .MuiTabs-scrollButtons": {
                    color: "white",
                  },
                }}
              >
                <Tab
                  icon={<PointOfSaleIcon />}
                  iconPosition="start"
                  label={
                    <Box sx={{ display: { xs: "none", sm: "block" } }}>
                      Point of Sale
                    </Box>
                  }
                  value="pos"
                />
                <Tab
                  icon={<DashboardIcon />}
                  iconPosition="start"
                  label={
                    <Box sx={{ display: { xs: "none", sm: "block" } }}>
                      Order Board
                    </Box>
                  }
                  value="orders"
                />
                <Tab
                  icon={<AssessmentIcon />}
                  iconPosition="start"
                  label={
                    <Box sx={{ display: { xs: "none", sm: "block" } }}>
                      Reports
                    </Box>
                  }
                  value="report"
                />
              </Tabs>

              {/* Logout Button */}
              <Button
                variant="outlined"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                sx={{
                  ml: { xs: 1, sm: 2 },
                  color: "white",
                  borderColor: "rgba(255,255,255,0.5)",
                  fontSize: { xs: "0.7rem", sm: "0.85rem" },
                  px: { xs: 1, sm: 2 },
                  minWidth: { xs: "auto", sm: 100 },
                  "&:hover": {
                    borderColor: "white",
                    bgcolor: "rgba(255,255,255,0.1)",
                  },
                }}
              >
                <Box sx={{ display: { xs: "none", sm: "block" } }}>Logout</Box>
              </Button>
            </Box>
          </Container>
        </Paper>

        {/* Main Content */}
        <Container maxWidth="xl" sx={{ pb: 4, px: { xs: 1.5, sm: 2, md: 3 } }}>
          <Box
            sx={{
              animation: "fadeIn 0.3s ease",
              "@keyframes fadeIn": {
                from: { opacity: 0, transform: "translateY(10px)" },
                to: { opacity: 1, transform: "translateY(0)" },
              },
            }}
          >
            {page === "pos" && <POS />}
            {page === "orders" && <OrderBoard />}
            {page === "report" && <DailyReport />}
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
