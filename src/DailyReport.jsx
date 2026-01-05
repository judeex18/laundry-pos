import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Paper,
  Divider,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PaymentsIcon from "@mui/icons-material/Payments";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import StorageIcon from "@mui/icons-material/Storage";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import TableChartIcon from "@mui/icons-material/TableChart";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  getDailyReport,
  getOrderStats,
  clearAllOrders,
  resetServices,
  getOrdersForExport,
} from "./db/database";

export default function DailyReport() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ total: 0, released: 0 });

  // Export dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState("excel");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchReport = async () => {
    try {
      const report = await getDailyReport();
      const orderStats = await getOrderStats();
      setData(report);
      setStats(orderStats);
    } catch (error) {
      console.error("Failed to load report:", error);
    }
  };

  useEffect(() => {
    fetchReport();
    // Auto-refresh every 5 seconds
    const timer = setInterval(fetchReport, 5000);
    return () => clearInterval(timer);
  }, []);

  // Set default dates when dialog opens
  const handleOpenExportDialog = () => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    setStartDate(todayStr);
    setEndDate(todayStr);
    setExportDialogOpen(true);
  };

  const handleCloseExportDialog = () => {
    setExportDialogOpen(false);
  };

  // Quick date presets
  const setTodayDates = () => {
    const today = new Date().toISOString().split("T")[0];
    setStartDate(today);
    setEndDate(today);
  };

  const setThisWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    setStartDate(startOfWeek.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);
  };

  const setThisMonthDates = () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(startOfMonth.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);
  };

  const total = data.reduce((sum, d) => sum + Number(d.total || 0), 0);
  const totalOrders = data.reduce((sum, d) => sum + Number(d.count || 0), 0);

  const getPaymentIcon = (method) => {
    if (method?.toLowerCase() === "cash") return <PaymentsIcon />;
    if (method?.toLowerCase() === "gcash") return <AccountBalanceWalletIcon />;
    return <ReceiptLongIcon />;
  };

  const getPaymentColor = (method) => {
    if (method?.toLowerCase() === "cash")
      return "linear-gradient(135deg, #10b981 0%, #059669 100%)";
    if (method?.toLowerCase() === "gcash")
      return "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)";
    return "linear-gradient(135deg, #375da5 0%, #2a4a8a 100%)";
  };

  const handleClearOrders = async () => {
    if (
      window.confirm(
        "Are you sure you want to clear all orders? This cannot be undone."
      )
    ) {
      await clearAllOrders();
      fetchReport();
    }
  };

  const handleResetServices = async () => {
    if (
      window.confirm(
        "Reset all services to default? This will refresh the services list."
      )
    ) {
      await resetServices();
      window.location.reload();
    }
  };

  // Export function
  const handleExport = async () => {
    try {
      if (!startDate || !endDate) {
        alert("Please select both start and end dates");
        return;
      }

      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const orders = await getOrdersForExport(start, end);

      if (orders.length === 0) {
        alert("No released orders found for the selected date range");
        return;
      }

      if (exportFormat === "excel") {
        exportToExcel(orders, start, end);
      } else {
        exportToPDF(orders, start, end);
      }

      handleCloseExportDialog();
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export report. Please try again.");
    }
  };

  const exportToExcel = (orders, start, end) => {
    // Format data for Excel
    const excelData = orders.map((order, index) => ({
      "No.": index + 1,
      "Customer Name": order.customerName || "N/A",
      "Phone Number": order.phone || "N/A",
      Services:
        order.items
          ?.map((item) => `${item.name} x${item.loads || item.quantity || 1}`)
          .join(", ") || "N/A",
      "Total Amount": `₱${Number(order.total || 0).toLocaleString()}`,
      "Payment Method": order.paymentMethod || "N/A",
      "GCash Ref#": order.gcashRefNumber || "-",
      Date: new Date(order.releasedAt || order.createdAt).toLocaleString(),
    }));

    // Calculate total revenue
    const totalRevenue = orders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

    // Add empty row and total row
    excelData.push({});
    excelData.push({
      "No.": "",
      "Customer Name": "",
      "Phone Number": "",
      Services: "",
      "Total Amount": `₱${totalRevenue.toLocaleString()}`,
      "Payment Method": "TOTAL REVENUE",
      "GCash Ref#": "",
      Date: "",
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    worksheet["!cols"] = [
      { wch: 5 }, // No.
      { wch: 20 }, // Customer Name
      { wch: 15 }, // Phone Number
      { wch: 40 }, // Services
      { wch: 15 }, // Total Amount
      { wch: 15 }, // Payment Method
      { wch: 15 }, // GCash Ref#
      { wch: 20 }, // Date
    ];

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const dateRange =
      start.toDateString() === end.toDateString()
        ? start.toISOString().split("T")[0]
        : `${start.toISOString().split("T")[0]}_to_${
            end.toISOString().split("T")[0]
          }`;
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Report");

    // Generate filename
    const filename = `Laundry_Report_${dateRange}.xlsx`;

    // Download file
    XLSX.writeFile(workbook, filename);
  };

  const exportToPDF = (orders, start, end) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(55, 93, 165);
    doc.text("Ian's Laundry Shop", 105, 15, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Sales Report", 105, 23, { align: "center" });

    // Date range
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const dateRangeText =
      start.toDateString() === end.toDateString()
        ? `Date: ${start.toLocaleDateString()}`
        : `Date Range: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    doc.text(dateRangeText, 105, 30, { align: "center" });

    // Table data
    const tableData = orders.map((order, index) => [
      index + 1,
      order.customerName || "N/A",
      order.phone || "N/A",
      order.items
        ?.map((item) => `${item.name} x${item.loads || item.quantity || 1}`)
        .join(", ") || "N/A",
      `₱${Number(order.total || 0).toLocaleString()}`,
      order.paymentMethod || "N/A",
      order.gcashRefNumber || "-",
    ]);

    // Calculate total revenue
    const totalRevenue = orders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

    // Add table
    autoTable(doc, {
      startY: 38,
      head: [
        [
          "#",
          "Customer",
          "Phone",
          "Services",
          "Total",
          "Payment",
          "GCash Ref#",
        ],
      ],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [55, 93, 165],
        textColor: 255,
        fontSize: 8,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 7,
      },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 25 },
        2: { cellWidth: 22 },
        3: { cellWidth: 50 },
        4: { cellWidth: 20 },
        5: { cellWidth: 18 },
        6: { cellWidth: 25 },
      },
      margin: { left: 10, right: 10 },
    });

    // Total summary
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(55, 93, 165);
    doc.setFont(undefined, "bold");
    doc.text(`Total Revenue: ₱${totalRevenue.toLocaleString()}`, 14, finalY);
    doc.text(`Total Orders: ${orders.length}`, 14, finalY + 7);

    // Generate filename
    const dateRange =
      start.toDateString() === end.toDateString()
        ? start.toISOString().split("T")[0]
        : `${start.toISOString().split("T")[0]}_to_${
            end.toISOString().split("T")[0]
          }`;
    const filename = `Laundry_Report_${dateRange}.pdf`;

    // Download file
    doc.save(filename);
  };

  return (
    <Box>
      {/* Header Stats */}
      <Paper
        sx={{
          p: { xs: 2.5, sm: 4 },
          mb: { xs: 2, sm: 3 },
          background: "linear-gradient(135deg, #375da5 0%, #2a4a8a 100%)",
          color: "white",
          borderRadius: { xs: 2, sm: 3 },
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -30,
            right: -30,
            opacity: 0.1,
          }}
        >
          <TrendingUpIcon sx={{ fontSize: { xs: 120, sm: 200 } }} />
        </Box>
        <Typography
          variant="body1"
          sx={{
            opacity: 0.9,
            mb: 1,
            fontWeight: 500,
            fontSize: { xs: "0.85rem", sm: "1rem" },
          }}
        >
          Today's Total Revenue (Released Orders)
        </Typography>
        <Typography
          variant="h2"
          sx={{
            fontWeight: 700,
            letterSpacing: "-0.02em",
            fontSize: { xs: "2rem", sm: "3.75rem" },
          }}
        >
          ₱{total.toLocaleString()}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            mt: 1,
            opacity: 0.8,
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
          }}
        >
          {totalOrders} order(s) released today
        </Typography>
      </Paper>

      {/* Order Stats */}
      <Grid
        container
        spacing={{ xs: 1.5, sm: 2 }}
        sx={{ mb: { xs: 2, sm: 3 } }}
      >
        <Grid item xs={6} sm={3}>
          <Paper
            sx={{
              p: { xs: 2, sm: 3 },
              textAlign: "center",
              background: "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)",
              color: "white",
              borderRadius: { xs: 2, sm: 3 },
            }}
          >
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                fontSize: { xs: "1.5rem", sm: "2.5rem" },
              }}
            >
              {stats.total}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                opacity: 0.9,
                fontSize: { xs: "0.7rem", sm: "0.85rem" },
              }}
            >
              Total Orders
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper
            sx={{
              p: { xs: 2, sm: 3 },
              textAlign: "center",
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              color: "white",
              borderRadius: { xs: 2, sm: 3 },
            }}
          >
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                fontSize: { xs: "1.5rem", sm: "2.5rem" },
              }}
            >
              {stats.washing + stats.drying}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                opacity: 0.9,
                fontSize: { xs: "0.7rem", sm: "0.85rem" },
              }}
            >
              In Progress
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper
            sx={{
              p: { xs: 2, sm: 3 },
              textAlign: "center",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "white",
              borderRadius: { xs: 2, sm: 3 },
            }}
          >
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                fontSize: { xs: "1.5rem", sm: "2.5rem" },
              }}
            >
              {stats.ready}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                opacity: 0.9,
                fontSize: { xs: "0.7rem", sm: "0.85rem" },
              }}
            >
              Ready for Pickup
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper
            sx={{
              p: { xs: 2, sm: 3 },
              textAlign: "center",
              background: "linear-gradient(135deg, #375da5 0%, #2a4a8a 100%)",
              color: "white",
              borderRadius: { xs: 2, sm: 3 },
            }}
          >
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                fontSize: { xs: "1.5rem", sm: "2.5rem" },
              }}
            >
              {stats.released}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                opacity: 0.9,
                fontSize: { xs: "0.7rem", sm: "0.85rem" },
              }}
            >
              Released Today
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Payment Breakdown */}
      <Paper
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: { xs: 2, sm: 3 },
          mb: { xs: 2, sm: 3 },
        }}
      >
        <Typography
          variant="h6"
          sx={{
            mb: { xs: 2, sm: 3 },
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: "primary.main",
            fontSize: { xs: "1rem", sm: "1.25rem" },
          }}
        >
          <ReceiptLongIcon /> Payment Breakdown
        </Typography>

        {data.length === 0 ? (
          <Box
            sx={{
              py: { xs: 4, sm: 6 },
              textAlign: "center",
              background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
              borderRadius: 2,
            }}
          >
            <ReceiptLongIcon
              sx={{
                fontSize: { xs: 36, sm: 48 },
                color: "text.secondary",
                opacity: 0.3,
              }}
            />
            <Typography
              color="text.secondary"
              sx={{ mt: 1, fontSize: { xs: "0.9rem", sm: "1rem" } }}
            >
              No released orders yet today
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            {data.map((item, index) => (
              <Grid item xs={12} sm={6} key={index}>
                <Card
                  sx={{
                    background: getPaymentColor(item.method),
                    color: "white",
                    borderRadius: { xs: 2, sm: 3 },
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        <Box
                          sx={{
                            p: { xs: 1, sm: 1.5 },
                            borderRadius: 2,
                            bgcolor: "rgba(255,255,255,0.2)",
                          }}
                        >
                          {getPaymentIcon(item.method)}
                        </Box>
                        <Box>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 700,
                              fontSize: { xs: "1rem", sm: "1.25rem" },
                            }}
                          >
                            {item.method}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              opacity: 0.9,
                              fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            }}
                          >
                            {item.count} order(s)
                          </Typography>
                        </Box>
                      </Box>
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 700,
                          fontSize: { xs: "1.25rem", sm: "1.5rem" },
                        }}
                      >
                        ₱{Number(item.total).toLocaleString()}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Export Reports */}
      <Paper
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: { xs: 2, sm: 3 },
          mb: { xs: 2, sm: 3 },
          background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
          border: "1px solid #86efac",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            mb: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: "#166534",
            fontSize: { xs: "1rem", sm: "1.25rem" },
          }}
        >
          <DownloadIcon /> Export Reports
        </Typography>
        <Typography
          variant="body2"
          sx={{
            mb: 2,
            color: "#166534",
            fontSize: { xs: "0.8rem", sm: "0.9rem" },
          }}
        >
          Export reports with custom date range. Choose between Excel or PDF
          format.
        </Typography>
        <Button
          variant="contained"
          color="success"
          startIcon={<DownloadIcon />}
          onClick={handleOpenExportDialog}
          sx={{ textTransform: "none" }}
        >
          Export Report
        </Button>
      </Paper>

      {/* Export Dialog */}
      <Dialog
        open={exportDialogOpen}
        onClose={handleCloseExportDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #375da5 0%, #2a4a8a 100%)",
            color: "white",
            textAlign: "center",
          }}
        >
          <DownloadIcon sx={{ fontSize: 32, mb: 1 }} />
          <Typography variant="h6" fontWeight={700}>
            Export Report
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {/* Format Selection */}
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Export Format
          </Typography>
          <ToggleButtonGroup
            value={exportFormat}
            exclusive
            onChange={(e, newFormat) => newFormat && setExportFormat(newFormat)}
            fullWidth
            sx={{ mb: 3 }}
          >
            <ToggleButton value="excel" sx={{ py: 1.5 }}>
              <TableChartIcon sx={{ mr: 1 }} />
              Excel
            </ToggleButton>
            <ToggleButton value="pdf" sx={{ py: 1.5 }}>
              <PictureAsPdfIcon sx={{ mr: 1 }} />
              PDF
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Quick Date Presets */}
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Quick Select
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={setTodayDates}
              sx={{ flex: 1, textTransform: "none" }}
            >
              Today
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={setThisWeekDates}
              sx={{ flex: 1, textTransform: "none" }}
            >
              This Week
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={setThisMonthDates}
              sx={{ flex: 1, textTransform: "none" }}
            >
              This Month
            </Button>
          </Stack>

          {/* Date Range */}
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Date Range
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={handleCloseExportDialog}
            variant="outlined"
            sx={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            variant="contained"
            startIcon={
              exportFormat === "excel" ? (
                <TableChartIcon />
              ) : (
                <PictureAsPdfIcon />
              )
            }
            sx={{
              flex: 1,
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              },
            }}
          >
            Export {exportFormat === "excel" ? "Excel" : "PDF"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Data Management */}
      <Paper
        sx={{
          p: { xs: 2, sm: 3 },
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
            color: "text.secondary",
            fontSize: { xs: "1rem", sm: "1.25rem" },
          }}
        >
          <StorageIcon /> Data Management
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2, fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
        >
          All data is stored locally on this device using IndexedDB. Clear old
          orders to free up space.
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleClearOrders}
            sx={{ textTransform: "none", mb: 1 }}
          >
            Clear All Orders
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={handleResetServices}
            sx={{ textTransform: "none", mb: 1 }}
          >
            Reset Services
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
