import { useEffect, useState } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Stack,
  Box,
  Paper,
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Fade,
  Zoom,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import InventoryIcon from "@mui/icons-material/Inventory";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";
import HistoryIcon from "@mui/icons-material/History";
import LocalLaundryServiceIcon from "@mui/icons-material/LocalLaundryService";
import ScienceIcon from "@mui/icons-material/Science";
import OpacityIcon from "@mui/icons-material/Opacity";
import WarningIcon from "@mui/icons-material/Warning";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import TableChartIcon from "@mui/icons-material/TableChart";
import AddBoxIcon from "@mui/icons-material/AddBox";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import StorageIcon from "@mui/icons-material/Storage";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  getInventory,
  addStock,
  deductStock,
  getInventoryLogs,
  addInventoryItem,
  clearInventory,
} from "./db/database";

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState("add"); // 'add' or 'deduct'
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState("excel");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // New item dialog states
  const [newItemDialogOpen, setNewItemDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemType, setNewItemType] = useState("downy");
  const [newItemQuantity, setNewItemQuantity] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("pcs");
  const [customType, setCustomType] = useState("");
  const [customUnit, setCustomUnit] = useState("");

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // Load inventory
  const fetchInventory = async () => {
    try {
      const items = await getInventory();
      setInventory(items);
    } catch (error) {
      console.error("Failed to load inventory:", error);
    }
  };

  // Load logs
  const fetchLogs = async () => {
    try {
      const allLogs = await getInventoryLogs();
      setLogs(allLogs);
    } catch (error) {
      console.error("Failed to load logs:", error);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchLogs();
    const timer = setInterval(fetchInventory, 5000);
    return () => clearInterval(timer);
  }, []);

  // Get icon for inventory type
  const getInventoryIcon = (type) => {
    switch (type) {
      case "downy":
        return <OpacityIcon />;
      case "detergent":
        return <ScienceIcon />;
      case "bleach":
        return <LocalLaundryServiceIcon />;
      default:
        return <InventoryIcon />;
    }
  };

  // Get gradient for inventory type
  const getInventoryGradient = (type, name) => {
    const lower = name.toLowerCase();
    if (lower.includes("violet")) {
      return "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
    }
    if (lower.includes("blue")) {
      return "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)";
    }
    if (lower.includes("detergent")) {
      return "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)";
    }
    if (lower.includes("color safe")) {
      return "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)";
    }
    if (lower.includes("zonrox")) {
      return "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)";
    }
    return "linear-gradient(135deg, #375da5 0%, #2a4a8a 100%)";
  };

  // Get stock status
  const getStockStatus = (quantity, type) => {
    if (quantity === 0) return { label: "Out of Stock", color: "error" };
    if (type === "bleach") {
      // Gallon-based items
      if (quantity < 1) return { label: "Low Stock", color: "warning" };
      return { label: "In Stock", color: "success" };
    }
    // Piece-based items
    if (quantity < 10) return { label: "Low Stock", color: "warning" };
    return { label: "In Stock", color: "success" };
  };

  // Open dialog
  const openDialog = (item, type) => {
    setSelectedItem(item);
    setDialogType(type);
    setQuantity("");
    setNote("");
    setDialogOpen(true);
  };

  // Handle stock update
  const handleStockUpdate = async () => {
    if (!quantity || parseInt(quantity) <= 0) {
      setSnackbar({
        open: true,
        message: "Please enter a valid quantity",
        severity: "warning",
      });
      return;
    }

    try {
      const qty = parseInt(quantity);
      if (dialogType === "add") {
        await addStock(selectedItem.id, qty, note);
        setSnackbar({
          open: true,
          message: `Added ${qty} ${selectedItem.unit} to ${selectedItem.name}`,
          severity: "success",
        });
      } else {
        if (qty > selectedItem.quantity) {
          setSnackbar({
            open: true,
            message: `Cannot deduct more than available stock (${selectedItem.quantity})`,
            severity: "error",
          });
          return;
        }
        await deductStock(selectedItem.id, qty, note);
        setSnackbar({
          open: true,
          message: `Deducted ${qty} ${selectedItem.unit} from ${selectedItem.name}`,
          severity: "success",
        });
      }
      setDialogOpen(false);
      fetchInventory();
      fetchLogs();
    } catch (error) {
      console.error("Failed to update stock:", error);
      setSnackbar({
        open: true,
        message: "Failed to update stock",
        severity: "error",
      });
    }
  };

  // Handle adding new inventory item
  const handleAddNewItem = async () => {
    if (!newItemName.trim()) {
      setSnackbar({
        open: true,
        message: "Please enter item name",
        severity: "warning",
      });
      return;
    }

    // Validate custom inputs when "others" is selected
    if (newItemType === "others" && !customType.trim()) {
      setSnackbar({
        open: true,
        message: "Please enter custom item type",
        severity: "warning",
      });
      return;
    }
    if (newItemUnit === "others" && !customUnit.trim()) {
      setSnackbar({
        open: true,
        message: "Please enter custom unit",
        severity: "warning",
      });
      return;
    }

    try {
      const qty = newItemQuantity ? parseInt(newItemQuantity) : 0;
      const finalType =
        newItemType === "others" ? customType.trim() : newItemType;
      const finalUnit =
        newItemUnit === "others" ? customUnit.trim() : newItemUnit;
      await addInventoryItem(newItemName.trim(), finalType, qty, finalUnit);
      setSnackbar({
        open: true,
        message: `Added new item: ${newItemName}`,
        severity: "success",
      });
      setNewItemDialogOpen(false);
      setNewItemName("");
      setNewItemType("downy");
      setNewItemQuantity("");
      setNewItemUnit("pcs");
      setCustomType("");
      setCustomUnit("");
      fetchInventory();
      fetchLogs();
    } catch (error) {
      console.error("Failed to add new item:", error);
      setSnackbar({
        open: true,
        message: "Failed to add new item",
        severity: "error",
      });
    }
  };

  // Format date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Get item name from logs
  const getItemName = (inventoryId) => {
    const item = inventory.find((i) => i.id === inventoryId);
    return item ? item.name : "Unknown";
  };

  // Open export dialog
  const handleOpenExportDialog = () => {
    const today = new Date().toISOString().split("T")[0];
    setStartDate(today);
    setEndDate(today);
    setExportDialogOpen(true);
  };

  // Export inventory logs
  const handleExport = async () => {
    try {
      if (!startDate || !endDate) {
        setSnackbar({
          open: true,
          message: "Please select both start and end dates",
          severity: "warning",
        });
        return;
      }

      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      // Filter logs by date range
      const filteredLogs = logs.filter((log) => {
        const logDate = new Date(log.createdAt);
        return logDate >= start && logDate <= end;
      });

      if (filteredLogs.length === 0) {
        setSnackbar({
          open: true,
          message: "No inventory logs found for the selected date range",
          severity: "warning",
        });
        return;
      }

      if (exportFormat === "excel") {
        exportToExcel(filteredLogs, start, end);
      } else {
        exportToPDF(filteredLogs, start, end);
      }

      setExportDialogOpen(false);
    } catch (error) {
      console.error("Export failed:", error);
      setSnackbar({
        open: true,
        message: "Failed to export. Please try again.",
        severity: "error",
      });
    }
  };

  const exportToExcel = (logsData, start, end) => {
    // Format data for Excel
    const excelData = logsData.map((log, index) => ({
      "No.": index + 1,
      Date: new Date(log.createdAt).toLocaleString("en-PH"),
      "Customer Name": log.customerName || "-",
      Item: getItemName(log.inventoryId),
      Action: log.action === "add" ? "Added" : "Deducted",
      Qty: `${log.action === "add" ? "+" : "-"}${log.quantity}`,
      Note: log.note || "-",
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet([]);

    // Add header with logo space
    XLSX.utils.sheet_add_aoa(
      worksheet,
      [
        ["Ian's Laundry Hub"],
        ["Inventory Report"],
        [
          `Date Range: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
        ],
        [""],
      ],
      { origin: "A1" }
    );

    // Add data starting from row 5
    XLSX.utils.sheet_add_json(worksheet, excelData, { origin: "A5" });

    // Set column widths
    worksheet["!cols"] = [
      { wch: 5 }, // No.
      { wch: 20 }, // Date
      { wch: 20 }, // Customer Name
      { wch: 18 }, // Item
      { wch: 10 }, // Action
      { wch: 8 }, // Qty
      { wch: 35 }, // Note
    ];

    // Merge cells for header
    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
    ];

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const dateRange =
      start.toDateString() === end.toDateString()
        ? start.toISOString().split("T")[0]
        : `${start.toISOString().split("T")[0]}_to_${
            end.toISOString().split("T")[0]
          }`;
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Report");

    // Download file
    XLSX.writeFile(workbook, `Inventory_Report_${dateRange}.xlsx`);
  };

  const exportToPDF = async (logsData, start, end) => {
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
    doc.text("Inventory Report", 105, 26, { align: "center" });

    // Date range
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const dateRangeText =
      start.toDateString() === end.toDateString()
        ? `Date: ${start.toLocaleDateString()}`
        : `Date Range: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    doc.text(dateRangeText, 105, 33, { align: "center" });

    // Table data
    const tableData = logsData.map((log, index) => [
      index + 1,
      new Date(log.createdAt).toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      log.customerName || "-",
      getItemName(log.inventoryId),
      log.action === "add" ? "Added" : "Deducted",
      `${log.action === "add" ? "+" : "-"}${log.quantity}`,
      log.note || "-",
    ]);

    // Add table
    autoTable(doc, {
      startY: 40,
      head: [["#", "Date", "Customer", "Item", "Action", "Qty", "Note"]],
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
        1: { cellWidth: 28 },
        2: { cellWidth: 28 },
        3: { cellWidth: 28 },
        4: { cellWidth: 18 },
        5: { cellWidth: 12 },
        6: { cellWidth: 50 },
      },
      margin: { left: 10, right: 10 },
    });

    // Summary
    const finalY = doc.lastAutoTable.finalY + 10;
    const addedCount = logsData.filter((l) => l.action === "add").length;
    const deductedCount = logsData.filter((l) => l.action === "deduct").length;

    doc.setFontSize(10);
    doc.setTextColor(55, 93, 165);
    doc.setFont(undefined, "bold");
    doc.text(`Total Records: ${logsData.length}`, 14, finalY);
    doc.text(
      `Added: ${addedCount} | Deducted: ${deductedCount}`,
      14,
      finalY + 6
    );

    // Download file
    const dateRange =
      start.toDateString() === end.toDateString()
        ? start.toISOString().split("T")[0]
        : `${start.toISOString().split("T")[0]}_to_${
            end.toISOString().split("T")[0]
          }`;
    doc.save(`Inventory_Report_${dateRange}.pdf`);
  };

  return (
    <Box>
      {/* Header */}
      <Fade in timeout={500}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            mb: { xs: 2, sm: 3 },
            borderRadius: 4,
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar
                sx={{
                  background:
                    "linear-gradient(135deg, #375da5 0%, #2a4a8a 100%)",
                  width: 48,
                  height: 48,
                }}
              >
                <InventoryIcon />
              </Avatar>
              <Box>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: "#1e3a5f" }}
                >
                  Inventory Management
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Track and manage your laundry supplies
                </Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                startIcon={<AddBoxIcon />}
                onClick={() => setNewItemDialogOpen(true)}
                sx={{
                  borderRadius: 2,
                  fontWeight: 600,
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)",
                  },
                }}
              >
                Add New Item
              </Button>
              <Button
                variant="outlined"
                startIcon={<HistoryIcon />}
                onClick={() => setLogsDialogOpen(true)}
                sx={{
                  borderRadius: 2,
                  fontWeight: 600,
                }}
              >
                View History
              </Button>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleOpenExportDialog}
                sx={{
                  borderRadius: 2,
                  fontWeight: 600,
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #059669 0%, #047857 100%)",
                  },
                }}
              >
                Export Inventory Report
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Fade>

      {/* Inventory Summary */}
      <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 3 }}>
        {inventory.map((item, index) => {
          const status = getStockStatus(item.quantity, item.type);
          return (
            <Grid item xs={12} sm={6} lg={4} key={item.id}>
              <Zoom in timeout={300 + index * 100}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 4,
                    overflow: "hidden",
                    transition: "all 0.3s",
                    border:
                      status.color === "error"
                        ? "3px solid #ef4444"
                        : status.color === "warning"
                        ? "3px solid #f59e0b"
                        : "3px solid #10b981",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 12px 24px rgba(0,0,0,0.15)",
                    },
                  }}
                >
                  {/* Header */}
                  <Box
                    sx={{
                      background: getInventoryGradient(item.type, item.name),
                      color: "white",
                      p: 2,
                      position: "relative",
                    }}
                  >
                    <Box
                      sx={{
                        position: "absolute",
                        top: -20,
                        right: -20,
                        width: 80,
                        height: 80,
                        borderRadius: "50%",
                        bgcolor: "rgba(255,255,255,0.1)",
                      }}
                    />
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        {getInventoryIcon(item.type)}
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {item.name}
                        </Typography>
                      </Box>
                      <Chip
                        label={status.label}
                        size="small"
                        color={status.color}
                        icon={
                          status.color === "error" ? (
                            <WarningIcon sx={{ fontSize: "16px !important" }} />
                          ) : null
                        }
                        sx={{
                          fontWeight: 700,
                          bgcolor:
                            status.color === "error"
                              ? "#ef4444"
                              : status.color === "warning"
                              ? "#f59e0b"
                              : "#10b981",
                          color: "white",
                          "& .MuiChip-icon": { color: "white" },
                        }}
                      />
                    </Stack>
                  </Box>

                  <CardContent sx={{ p: 2.5 }}>
                    {/* Quantity Display */}
                    <Box
                      sx={{
                        textAlign: "center",
                        py: 2,
                        px: 1,
                        mb: 2,
                        borderRadius: 3,
                        background:
                          "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                      }}
                    >
                      <Typography
                        variant="h2"
                        sx={{
                          fontWeight: 800,
                          color: "#1e3a5f",
                          lineHeight: 1,
                        }}
                      >
                        {item.quantity}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: "#64748b", fontWeight: 600, mt: 0.5 }}
                      >
                        {item.unit}
                      </Typography>
                    </Box>

                    {/* Action Buttons */}
                    <Stack direction="row" spacing={1}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<AddCircleIcon />}
                        onClick={() => openDialog(item, "add")}
                        sx={{
                          py: 1.2,
                          borderRadius: 2,
                          fontWeight: 700,
                          background:
                            "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                          "&:hover": {
                            background:
                              "linear-gradient(135deg, #059669 0%, #047857 100%)",
                          },
                        }}
                      >
                        Add
                      </Button>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<RemoveCircleIcon />}
                        onClick={() => openDialog(item, "deduct")}
                        disabled={item.quantity === 0}
                        sx={{
                          py: 1.2,
                          borderRadius: 2,
                          fontWeight: 700,
                          background:
                            "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                          "&:hover": {
                            background:
                              "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                          },
                          "&:disabled": {
                            background: "#e5e7eb",
                          },
                        }}
                      >
                        Deduct
                      </Button>
                    </Stack>

                    {/* Last Updated */}
                    {item.updatedAt && (
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          textAlign: "center",
                          mt: 1.5,
                          color: "#94a3b8",
                        }}
                      >
                        Last updated: {formatDate(item.updatedAt)}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Zoom>
            </Grid>
          );
        })}
      </Grid>

      {/* Add/Deduct Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 },
        }}
      >
        <DialogTitle
          sx={{
            background:
              dialogType === "add"
                ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            color: "white",
            fontWeight: 700,
          }}
        >
          {dialogType === "add" ? "➕ Add Stock" : "➖ Deduct Stock"}
          {selectedItem && ` - ${selectedItem.name}`}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {selectedItem && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "#f8fafc",
                  textAlign: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Current Stock
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 800, color: "#1e3a5f" }}
                >
                  {selectedItem.quantity} {selectedItem.unit}
                </Typography>
              </Box>
            )}
            <TextField
              fullWidth
              label={`Quantity (${selectedItem?.unit || ""})`}
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              inputProps={{ min: 1 }}
              autoFocus
            />
            <TextField
              fullWidth
              label="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., New delivery, Manual adjustment"
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            sx={{ borderRadius: 2, fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleStockUpdate}
            sx={{
              borderRadius: 2,
              fontWeight: 700,
              background:
                dialogType === "add"
                  ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                  : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            }}
          >
            {dialogType === "add" ? "Add Stock" : "Deduct Stock"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Logs Dialog */}
      <Dialog
        open={logsDialogOpen}
        onClose={() => setLogsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #375da5 0%, #2a4a8a 100%)",
            color: "white",
            fontWeight: 700,
          }}
        >
          📜 Inventory History
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Customer Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Qty</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Note</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No inventory history yet
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.slice(0, 50).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell sx={{ fontSize: "0.8rem" }}>
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: "#1e3a5f" }}>
                        {log.customerName || "-"}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {getItemName(log.inventoryId)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.action === "add" ? "Added" : "Deducted"}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.7rem",
                            bgcolor:
                              log.action === "add" ? "#10b981" : "#ef4444",
                            color: "white",
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 700,
                          color: log.action === "add" ? "#10b981" : "#ef4444",
                        }}
                      >
                        {log.action === "add" ? "+" : "-"}
                        {log.quantity}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.8rem", color: "#64748b" }}>
                        {log.note || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setLogsDialogOpen(false)}
            variant="contained"
            sx={{ borderRadius: 2, fontWeight: 600 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "white",
            fontWeight: 700,
          }}
        >
          📊 Export Inventory Report
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Format Selection */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Export Format
              </Typography>
              <ToggleButtonGroup
                value={exportFormat}
                exclusive
                onChange={(e, value) => value && setExportFormat(value)}
                fullWidth
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
            </Box>

            {/* Date Range */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Date Range
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Start Date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="End Date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Quick Presets */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Quick Select
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    const today = new Date().toISOString().split("T")[0];
                    setStartDate(today);
                    setEndDate(today);
                  }}
                  sx={{ borderRadius: 2 }}
                >
                  Today
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    const today = new Date();
                    const dayOfWeek = today.getDay();
                    const startOfWeek = new Date(today);
                    startOfWeek.setDate(today.getDate() - dayOfWeek);
                    setStartDate(startOfWeek.toISOString().split("T")[0]);
                    setEndDate(today.toISOString().split("T")[0]);
                  }}
                  sx={{ borderRadius: 2 }}
                >
                  This Week
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    const today = new Date();
                    const startOfMonth = new Date(
                      today.getFullYear(),
                      today.getMonth(),
                      1
                    );
                    setStartDate(startOfMonth.toISOString().split("T")[0]);
                    setEndDate(today.toISOString().split("T")[0]);
                  }}
                  sx={{ borderRadius: 2 }}
                >
                  This Month
                </Button>
              </Stack>
            </Box>

            {/* Info */}
            <Paper
              sx={{
                p: 2,
                borderRadius: 2,
                background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                border: "1px solid #86efac",
              }}
            >
              <Typography variant="body2" sx={{ color: "#166534" }}>
                📋 Export includes: Date, Customer Name, Item, Action, Qty, Note
              </Typography>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => setExportDialogOpen(false)}
            sx={{ borderRadius: 2, fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleExport}
            startIcon={<DownloadIcon />}
            sx={{
              borderRadius: 2,
              fontWeight: 700,
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            }}
          >
            Export Inventory Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add New Item Dialog */}
      <Dialog
        open={newItemDialogOpen}
        onClose={() => setNewItemDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            p: 1,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            color: "#1e3a5f",
            pb: 1,
          }}
        >
          ➕ Add New Inventory Item
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Item Name"
              placeholder="e.g., Downy Pink"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              fullWidth
              autoFocus
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                },
              }}
            />
            <FormControl fullWidth>
              <InputLabel>Item Type</InputLabel>
              <Select
                value={newItemType}
                label="Item Type"
                onChange={(e) => {
                  setNewItemType(e.target.value);
                  if (e.target.value !== "others") setCustomType("");
                }}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="downy">Fabric Conditioner (Downy)</MenuItem>
                <MenuItem value="detergent">Detergent</MenuItem>
                <MenuItem value="bleach">Bleach</MenuItem>
                <MenuItem value="others">Others</MenuItem>
              </Select>
            </FormControl>
            {newItemType === "others" && (
              <TextField
                label="Custom Item Type"
                placeholder="e.g., Softener, Starch"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                  },
                }}
              />
            )}
            <FormControl fullWidth>
              <InputLabel>Unit</InputLabel>
              <Select
                value={newItemUnit}
                label="Unit"
                onChange={(e) => {
                  setNewItemUnit(e.target.value);
                  if (e.target.value !== "others") setCustomUnit("");
                }}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="pcs">Pieces (pcs)</MenuItem>
                <MenuItem value="gallon">Gallon</MenuItem>
                <MenuItem value="others">Others </MenuItem>
              </Select>
            </FormControl>
            {newItemUnit === "others" && (
              <TextField
                label="Custom Unit"
                placeholder="e.g., kg, liter, box"
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                  },
                }}
              />
            )}
            <TextField
              label="Initial Quantity (optional)"
              type="number"
              placeholder="0"
              value={newItemQuantity}
              onChange={(e) => setNewItemQuantity(e.target.value)}
              inputProps={{ min: 0 }}
              fullWidth
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setNewItemDialogOpen(false)}
            sx={{ borderRadius: 2, fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddNewItem}
            disabled={!newItemName.trim()}
            sx={{
              borderRadius: 2,
              fontWeight: 600,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)",
              },
              "&:disabled": {
                background: "#ccc",
              },
            }}
          >
            Add Item
          </Button>
        </DialogActions>
      </Dialog>

      {/* Data Management */}
      <Fade in timeout={1100}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            mt: 3,
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
                Manage inventory data stored locally
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteForeverIcon />}
            onClick={async () => {
              if (
                window.confirm(
                  "Are you sure you want to clear all inventory items and logs? This cannot be undone."
                )
              ) {
                await clearInventory();
                fetchInventory();
                fetchLogs();
                setSnackbar({
                  open: true,
                  message: "All inventory items and logs cleared",
                  severity: "success",
                });
              }
            }}
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
            Clear Inventory
          </Button>
        </Paper>
      </Fade>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
