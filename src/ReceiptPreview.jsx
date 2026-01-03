import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Divider,
  Button,
  Box,
  Stack,
  Avatar,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocalLaundryServiceIcon from "@mui/icons-material/LocalLaundryService";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ReceiptIcon from "@mui/icons-material/Receipt";

export default function ReceiptPreview({ open, onClose, data }) {
  if (!data) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
        },
      }}
    >
      {/* Success Header */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          color: "white",
          py: 4,
          textAlign: "center",
        }}
      >
        <Avatar
          sx={{
            width: 64,
            height: 64,
            background: "rgba(255,255,255,0.2)",
            mx: "auto",
            mb: 2,
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 40 }} />
        </Avatar>
        <Typography variant="h5" fontWeight={700}>
          Payment Successful!
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
          Thank you for your order
        </Typography>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        {/* Customer Info */}
        <Box
          sx={{
            p: 2,
            background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
            borderRadius: 2,
            mb: 3,
          }}
        >
          <Stack spacing={1.5}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <PersonIcon sx={{ color: "primary.main", fontSize: 20 }} />
              <Typography variant="body2" color="text.secondary">
                Customer
              </Typography>
              <Typography fontWeight={600} sx={{ ml: "auto" }}>
                {data.customer}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <PhoneIcon sx={{ color: "primary.main", fontSize: 20 }} />
              <Typography variant="body2" color="text.secondary">
                Phone
              </Typography>
              <Typography fontWeight={600} sx={{ ml: "auto" }}>
                {data.phone}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <CalendarTodayIcon sx={{ color: "primary.main", fontSize: 20 }} />
              <Typography variant="body2" color="text.secondary">
                Date
              </Typography>
              <Typography
                fontWeight={600}
                sx={{ ml: "auto", fontSize: "0.875rem" }}
              >
                {data.date}
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Order Items */}
        <Typography
          variant="subtitle2"
          color="text.secondary"
          sx={{ mb: 1.5, display: "flex", alignItems: "center", gap: 1 }}
        >
          <ReceiptIcon fontSize="small" /> Order Details
        </Typography>

        <Stack spacing={1.5} sx={{ mb: 2 }}>
          {data.items.map((item, i) => (
            <Box
              key={i}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                p: 1.5,
                background: "#fafafa",
                borderRadius: 1.5,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    background:
                      "linear-gradient(135deg, #375da5 0%, #2a4a8a 100%)",
                    fontSize: "0.875rem",
                  }}
                >
                  <LocalLaundryServiceIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {item.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.loads} load(s) × ₱{item.price}
                  </Typography>
                </Box>
              </Box>
              <Typography fontWeight={700} color="primary.main">
                ₱{item.total}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Total & Payment Method */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 2,
            background: "linear-gradient(135deg, #375da5 0%, #2a4a8a 100%)",
            borderRadius: 2,
            color: "white",
            mb: 2,
          }}
        >
          <Box>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Total Amount
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Paid via {data.method}
            </Typography>
          </Box>
          <Typography variant="h4" fontWeight={700}>
            ₱{data.total}
          </Typography>
        </Box>

        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={onClose}
          sx={{
            py: 1.5,
            borderRadius: 2,
            fontWeight: 600,
          }}
        >
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
}
