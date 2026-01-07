import { useState } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Alert,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import HomeIcon from "@mui/icons-material/Home";

function LandingPage({ onLogin }) {
  // Login state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Handle login
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError("");

    // Admin credentials
    if (username === "admin" && password === "03282023") {
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userRole", "admin");
      onLogin();
    } else {
      setLoginError("Invalid username or password");
    }
  };

  const goToTracker = () => {
    window.location.href = "/";
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #ffbd59 0%, #ffcf85 100%)",
        py: { xs: 2, sm: 4 },
        display: "flex",
        alignItems: "center",
      }}
    >
      <Container maxWidth="sm">
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
            Admin Portal
          </Typography>
        </Box>

        {/* Login Section */}
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
            <AdminPanelSettingsIcon />
            Admin Login
          </Typography>

          <Typography
            sx={{
              color: "text.secondary",
              mb: 3,
              fontSize: { xs: "0.85rem", sm: "1rem" },
            }}
          >
            Enter your credentials to access the POS system
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
              sx={{ py: 1.5, mb: 2 }}
            >
              Login
            </Button>

            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<HomeIcon />}
              onClick={goToTracker}
              sx={{ py: 1.5 }}
            >
              Back to Order Tracker
            </Button>
          </form>
        </Paper>

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
