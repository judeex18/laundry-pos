import { useState } from "react";
import {
  Box,
  Container,
  Tabs,
  Tab,
  Paper,
  ThemeProvider,
  createTheme,
  CssBaseline,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import POS from "./POS";
import OrderBoard from "./OrderBoard";
import DailyReport from "./DailyReport";

// Custom theme with modern colors
const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#6366f1",
      light: "#818cf8",
      dark: "#4f46e5",
    },
    secondary: {
      main: "#ec4899",
      light: "#f472b6",
      dark: "#db2777",
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
      default: "#f8fafc",
      paper: "#ffffff",
    },
    text: {
      primary: "#1e293b",
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
          boxShadow: "0 4px 14px 0 rgba(99, 102, 241, 0.39)",
          "&:hover": {
            boxShadow: "0 6px 20px rgba(99, 102, 241, 0.4)",
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
              borderColor: "#6366f1",
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
  const [page, setPage] = useState(() => {
    // Restore the last visited tab from localStorage
    return localStorage.getItem("currentTab") || "pos";
  });

  const handleTabChange = (newPage) => {
    setPage(newPage);
    localStorage.setItem("currentTab", newPage);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
        }}
      >
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
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
