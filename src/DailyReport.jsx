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
  Avatar,
  Fade,
  Zoom,
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
import AssessmentIcon from "@mui/icons-material/Assessment";
import LocalLaundryServiceIcon from "@mui/icons-material/LocalLaundryService";
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

      // Parse dates and ensure full day range
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      // Get all paid orders in range (not just released)
      const orders = await getOrdersForExport(start, end);

      if (orders.length === 0) {
        alert(
          "No paid orders found for the selected date range.\n\nTip: Only orders with a payment date (paidAt) are included in the sales export."
        );
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
    // Calculate total revenue
    const totalRevenue = orders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

    // Create worksheet with header
    const worksheet = XLSX.utils.json_to_sheet([]);

    // Add header with company name
    XLSX.utils.sheet_add_aoa(
      worksheet,
      [
        ["Ian's Laundry Hub"],
        ["Sales Report"],
        [
          `Date Range: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
        ],
        [""],
      ],
      { origin: "A1" }
    );

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

    // Add data starting from row 5
    XLSX.utils.sheet_add_json(worksheet, excelData, { origin: "A5" });

    // Add total row
    const totalRowIndex = excelData.length + 6;
    XLSX.utils.sheet_add_aoa(
      worksheet,
      [
        [
          "",
          "",
          "",
          "",
          `₱${totalRevenue.toLocaleString()}`,
          "TOTAL REVENUE",
          "",
          "",
        ],
      ],
      { origin: `A${totalRowIndex}` }
    );

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

    // Merge cells for header
    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
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

  const exportToPDF = async (orders, start, end) => {
    const doc = new jsPDF();

    // Try to add logo
    try {
      const logoImg = new Image();
      logoImg.src = "/IansLogo.png";
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
        setTimeout(reject, 2000); // Timeout after 2 seconds
      });
      doc.addImage(logoImg, "PNG", 14, 8, 25, 25);
    } catch (e) {
      // Logo failed to load, continue without it
      console.log("Logo not loaded, continuing without it");
    }

    // Header
    doc.setFontSize(18);
    doc.setTextColor(55, 93, 165);
    doc.text("Ian's Laundry Hub", 105, 18, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Sales Report", 105, 26, { align: "center" });

    // Date range
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const dateRangeText =
      start.toDateString() === end.toDateString()
        ? `Date: ${start.toLocaleDateString()}`
        : `Date Range: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    doc.text(dateRangeText, 105, 33, { align: "center" });

    // Table data
    const tableData = orders.map((order, index) => [
      index + 1,
      order.customerName || "N/A",
      order.phone || "N/A",
      order.items
        ?.map((item) => `${item.name} x${item.loads || item.quantity || 1}`)
        .join(", ") || "N/A",
      `${Number(order.total || 0).toLocaleString()}`,
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
      startY: 40,
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
      {/* Header Stats - Enhanced Revenue Card */}
      <Fade in timeout={500}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            mb: { xs: 2, sm: 3 },
            background:
              "linear-gradient(135deg, #1e3a5f 0%, #375da5 50%, #4facfe 100%)",
            color: "white",
            borderRadius: 4,
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(30, 58, 95, 0.4)",
          }}
        >
          {/* Background Pattern */}
          <Box
            sx={{
              position: "absolute",
              top: -50,
              right: -50,
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: -30,
              left: -30,
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.05)",
            }}
          />

          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={2}
          >
            <Box sx={{ position: "relative", zIndex: 1 }}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1.5}
                sx={{ mb: 1 }}
              >
                <Avatar
                  sx={{
                    bgcolor: "rgba(255,255,255,0.2)",
                    backdropFilter: "blur(10px)",
                    width: 48,
                    height: 48,
                  }}
                >
                  <TrendingUpIcon sx={{ fontSize: 28 }} />
                </Avatar>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ opacity: 0.9, fontWeight: 500 }}
                  >
                    Today's Revenue
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Based on payment date
                  </Typography>
                </Box>
              </Stack>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  fontSize: { xs: "2.5rem", sm: "3.5rem", md: "4rem" },
                  textShadow: "0 4px 12px rgba(0,0,0,0.3)",
                }}
              >
                ₱{total.toLocaleString()}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  mt: 1,
                  opacity: 0.85,
                  fontWeight: 500,
                }}
              >
                {totalOrders} paid order(s) today
              </Typography>
            </Box>

            <Box
              sx={{
                position: "relative",
                zIndex: 1,
                p: 2,
                borderRadius: 3,
                bgcolor: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                textAlign: "center",
              }}
            >
              <CalendarTodayIcon sx={{ fontSize: 32, mb: 1, opacity: 0.9 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {new Date().toLocaleDateString("en-PH", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Fade>

      {/* Order Stats - Enhanced Cards */}
      <Grid
        container
        spacing={{ xs: 1.5, sm: 2 }}
        sx={{ mb: { xs: 2, sm: 3 } }}
      >
        {[
          {
            label: "Total Orders",
            value: stats.total,
            gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            icon: "📦",
          },
          {
            label: "In Progress",
            value: stats.washing + stats.drying,
            gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
            icon: "🔄",
          },
          {
            label: "Ready for Pickup",
            value: stats.ready,
            gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
            icon: "✅",
          },
          {
            label: "Released Today",
            value: stats.released,
            gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
            icon: "🎉",
          },
        ].map((stat, index) => (
          <Grid item xs={6} sm={3} key={stat.label}>
            <Zoom in timeout={300 + index * 100}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, sm: 3 },
                  textAlign: "center",
                  background: stat.gradient,
                  color: "white",
                  borderRadius: 4,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                  transition: "all 0.3s",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: "0 16px 48px rgba(0,0,0,0.2)",
                  },
                }}
              >
                <Typography sx={{ fontSize: "2rem", mb: 0.5 }}>
                  {stat.icon}
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: "1.75rem", sm: "2.5rem" },
                    textShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  }}
                >
                  {stat.value}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    opacity: 0.9,
                    fontSize: { xs: "0.7rem", sm: "0.85rem" },
                    fontWeight: 600,
                  }}
                >
                  {stat.label}
                </Typography>
              </Paper>
            </Zoom>
          </Grid>
        ))}
      </Grid>

      {/* Payment Breakdown - Enhanced */}
      <Fade in timeout={700}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: 4,
            mb: { xs: 2, sm: 3 },
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
            <Avatar
              sx={{
                background: "linear-gradient(135deg, #375da5 0%, #2a4a8a 100%)",
                width: 44,
                height: 44,
              }}
            >
              <AssessmentIcon />
            </Avatar>
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: "#1e3a5f" }}
              >
                Payment Breakdown
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Today's revenue by payment method
              </Typography>
            </Box>
          </Box>

          {data.length === 0 ? (
            <Box
              sx={{
                py: 6,
                textAlign: "center",
                background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
                borderRadius: 3,
                border: "2px dashed #cbd5e1",
              }}
            >
              <LocalLaundryServiceIcon
                sx={{
                  fontSize: 64,
                  color: "#94a3b8",
                  opacity: 0.3,
                  mb: 2,
                }}
              />
              <Typography color="text.secondary" fontWeight={500}>
                No paid orders yet today
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Revenue will appear here when customers pay
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              {data.map((item, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <Zoom in timeout={300 + index * 100}>
                    <Card
                      elevation={0}
                      sx={{
                        background: getPaymentColor(item.method),
                        color: "white",
                        borderRadius: 4,
                        boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                        transition: "all 0.3s",
                        "&:hover": {
                          transform: "translateY(-4px)",
                          boxShadow: "0 16px 48px rgba(0,0,0,0.2)",
                        },
                      }}
                    >
                      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <Avatar
                              sx={{
                                bgcolor: "rgba(255,255,255,0.2)",
                                backdropFilter: "blur(10px)",
                                width: 56,
                                height: 56,
                              }}
                            >
                              {getPaymentIcon(item.method)}
                            </Avatar>
                            <Box>
                              <Typography
                                variant="h5"
                                sx={{
                                  fontWeight: 800,
                                  textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                                }}
                              >
                                {item.method}
                              </Typography>
                              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                {item.count} order(s)
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ textAlign: "right" }}>
                            <Typography
                              variant="h4"
                              sx={{
                                fontWeight: 800,
                                textShadow: "0 2px 8px rgba(0,0,0,0.2)",
                              }}
                            >
                              ₱{Number(item.total).toLocaleString()}
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Zoom>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      </Fade>

      {/* Export Reports - Enhanced */}
      <Fade in timeout={900}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: 4,
            mb: { xs: 2, sm: 3 },
            background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
            border: "2px solid #86efac",
            boxShadow: "0 8px 32px rgba(16, 185, 129, 0.15)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <Avatar
              sx={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                width: 44,
                height: 44,
              }}
            >
              <DownloadIcon />
            </Avatar>
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: "#166534" }}
              >
                Export Reports
              </Typography>
              <Typography variant="caption" sx={{ color: "#15803d" }}>
                Download reports in Excel or PDF format
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleOpenExportDialog}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 3,
              py: 1.5,
              px: 4,
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              boxShadow: "0 4px 16px rgba(16, 185, 129, 0.4)",
              "&:hover": {
                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                transform: "translateY(-2px)",
                boxShadow: "0 8px 24px rgba(16, 185, 129, 0.5)",
              },
            }}
          >
            Export Report
          </Button>
        </Paper>
      </Fade>

      {/* Export Dialog - Enhanced */}
      <Dialog
        open={exportDialogOpen}
        onClose={handleCloseExportDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #1e3a5f 0%, #375da5 100%)",
            color: "white",
            textAlign: "center",
            py: 3,
          }}
        >
          <Avatar
            sx={{
              width: 56,
              height: 56,
              mx: "auto",
              mb: 1.5,
              bgcolor: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(10px)",
            }}
          >
            <DownloadIcon sx={{ fontSize: 28 }} />
          </Avatar>
          <Typography variant="h5" fontWeight={700}>
            Export Report
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
            Choose format and date range
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {/* Format Selection */}
          <Typography
            variant="subtitle2"
            sx={{ mb: 1.5, fontWeight: 700, color: "#1e3a5f" }}
          >
            Export Format
          </Typography>
          <ToggleButtonGroup
            value={exportFormat}
            exclusive
            onChange={(e, newFormat) => newFormat && setExportFormat(newFormat)}
            fullWidth
            sx={{ mb: 3 }}
          >
            <ToggleButton
              value="excel"
              sx={{
                py: 1.5,
                borderRadius: "12px 0 0 12px !important",
                "&.Mui-selected": {
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "white",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #059669 0%, #047857 100%)",
                  },
                },
              }}
            >
              <TableChartIcon sx={{ mr: 1 }} />
              Excel
            </ToggleButton>
            <ToggleButton
              value="pdf"
              sx={{
                py: 1.5,
                borderRadius: "0 12px 12px 0 !important",
                "&.Mui-selected": {
                  background:
                    "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  color: "white",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                  },
                },
              }}
            >
              <PictureAsPdfIcon sx={{ mr: 1 }} />
              PDF
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Quick Date Presets */}
          <Typography
            variant="subtitle2"
            sx={{ mb: 1.5, fontWeight: 700, color: "#1e3a5f" }}
          >
            Quick Select
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={setTodayDates}
              sx={{ flex: 1, textTransform: "none", borderRadius: 2 }}
            >
              Today
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={setThisWeekDates}
              sx={{ flex: 1, textTransform: "none", borderRadius: 2 }}
            >
              This Week
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={setThisMonthDates}
              sx={{ flex: 1, textTransform: "none", borderRadius: 2 }}
            >
              This Month
            </Button>
          </Stack>

          {/* Date Range */}
          <Typography
            variant="subtitle2"
            sx={{ mb: 1.5, fontWeight: 700, color: "#1e3a5f" }}
          >
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
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: 3 },
              }}
            />
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: 3 },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0, gap: 1 }}>
          <Button
            onClick={handleCloseExportDialog}
            variant="outlined"
            sx={{ flex: 1, py: 1.5, borderRadius: 3 }}
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
              py: 1.5,
              borderRadius: 3,
              background:
                exportFormat === "excel"
                  ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                  : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              "&:hover": {
                background:
                  exportFormat === "excel"
                    ? "linear-gradient(135deg, #059669 0%, #047857 100%)"
                    : "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
              },
            }}
          >
            Export {exportFormat === "excel" ? "Excel" : "PDF"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Data Management - Enhanced */}
      <Fade in timeout={1100}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: 4,
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <Avatar
              sx={{
                background: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
                width: 44,
                height: 44,
              }}
            >
              <StorageIcon />
            </Avatar>
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: "#1e3a5f" }}
              >
                Data Management
              </Typography>
              <Typography variant="caption" color="text.secondary">
                All data stored locally on this device
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleClearOrders}
              sx={{
                textTransform: "none",
                borderRadius: 3,
                fontWeight: 600,
                px: 3,
                "&:hover": {
                  bgcolor: "rgba(239, 68, 68, 0.1)",
                },
              }}
            >
              Clear All Orders
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleResetServices}
              sx={{
                textTransform: "none",
                borderRadius: 3,
                fontWeight: 600,
                px: 3,
              }}
            >
              Reset Services
            </Button>
          </Stack>
        </Paper>
      </Fade>
    </Box>
  );
}
