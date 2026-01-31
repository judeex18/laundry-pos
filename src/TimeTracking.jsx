import { useEffect, useState, useRef } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  Stack,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Fab,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import DeleteIcon from "@mui/icons-material/Delete";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  getTimeRecords,
  getTimeRecordsByDate,
  getActiveTimeRecord,
  clockInStaff,
  clockOutStaff,
  deleteTimeRecord,
  getStaffAttendanceSummary,
} from "./db/database";

// Staff list
const STAFF_LIST = ["Luz Amoguis", "Belen Misal"];

export default function TimeTracking() {
  const [timeRecords, setTimeRecords] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [clockInDialog, setClockInDialog] = useState({
    open: false,
    staffName: "",
  });
  const [clockOutDialog, setClockOutDialog] = useState({
    open: false,
    record: null,
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [exportDialog, setExportDialog] = useState({
    open: false,
    selectedStaff: [],
    dateRange: {
      start: new Date().toISOString().split("T")[0],
      end: new Date().toISOString().split("T")[0],
    },
  });
  const [photoDialog, setPhotoDialog] = useState({
    open: false,
    photo: null,
    title: "",
    date: "",
    time: "",
  });
  const [attendanceSummary, setAttendanceSummary] = useState([]);

  // Camera state
  const [cameraDialog, setCameraDialog] = useState({
    open: false,
    mode: "clockIn", // "clockIn" or "clockOut"
    staffName: "",
    stream: null,
    capturedPhoto: null,
  });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Load time records
  const loadTimeRecords = async () => {
    try {
      const records = await getTimeRecords();
      setTimeRecords(records);
    } catch (error) {
      console.error("Failed to load time records:", error);
      showSnackbar("Failed to load time records", "error");
    }
  };

  // Load attendance summary for current month
  const loadAttendanceSummary = async () => {
    try {
      const now = new Date();
      // Create dates in UTC to avoid timezone conversion issues
      const startOfMonth = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), 1),
      )
        .toISOString()
        .split("T")[0];
      const endOfMonth = new Date(
        Date.UTC(now.getFullYear(), now.getMonth() + 1, 0),
      )
        .toISOString()
        .split("T")[0];

      console.log(
        `Loading attendance summary for ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      );
      console.log(`Date range: ${startOfMonth} to ${endOfMonth}`);

      // Also check all time records
      const allRecords = await getTimeRecords();
      console.log(`All time records in database:`, allRecords);

      const summary = await getStaffAttendanceSummary(startOfMonth, endOfMonth);
      console.log(`Attendance summary result:`, summary);
      setAttendanceSummary(summary);
    } catch (error) {
      console.error("Failed to load attendance summary:", error);
    }
  };

  useEffect(() => {
    loadTimeRecords();
    loadAttendanceSummary();
  }, []);

  const showSnackbar = (message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleClockIn = async () => {
    if (!clockInDialog.staffName.trim()) {
      showSnackbar("Please enter staff name", "warning");
      return;
    }

    // Close the staff selection dialog and open camera dialog
    setClockInDialog({ open: false, staffName: "" });
    setCameraDialog({
      open: true,
      mode: "clockIn",
      staffName: clockInDialog.staffName.trim(),
      stream: null,
      capturedPhoto: null,
    });
  };

  const handleClockOut = async () => {
    // Close the confirmation dialog and open camera dialog
    setClockOutDialog({ open: false, record: null });
    setCameraDialog({
      open: true,
      mode: "clockOut",
      staffName: clockOutDialog.record.staffName,
      stream: null,
      capturedPhoto: null,
    });
  };

  const handleDeleteRecord = async (record) => {
    if (!window.confirm(`Delete time record for ${record.staffName}?`)) return;

    try {
      await deleteTimeRecord(record.id);
      await loadTimeRecords();
      await loadAttendanceSummary();
      showSnackbar("Time record deleted successfully", "success");
    } catch (error) {
      showSnackbar("Failed to delete time record", "error");
    }
  };

  // Camera Functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }, // Use front camera
        audio: false,
      });
      setCameraDialog((prev) => ({ ...prev, stream }));
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      showSnackbar(
        "Unable to access camera. Please check permissions.",
        "error",
      );
    }
  };

  const stopCamera = () => {
    if (cameraDialog.stream) {
      cameraDialog.stream.getTracks().forEach((track) => track.stop());
      setCameraDialog((prev) => ({ ...prev, stream: null }));
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const photoData = canvas.toDataURL("image/jpeg", 0.8);

    setCameraDialog((prev) => ({ ...prev, capturedPhoto: photoData }));
  };

  const handleCameraConfirm = async () => {
    if (!cameraDialog.capturedPhoto) {
      showSnackbar("Please capture a photo first", "warning");
      return;
    }

    try {
      if (cameraDialog.mode === "clockIn") {
        await clockInStaff(
          cameraDialog.staffName,
          "",
          cameraDialog.capturedPhoto,
        );
        showSnackbar(
          `${cameraDialog.staffName} clocked in successfully`,
          "success",
        );
      } else {
        await clockOutStaff(
          cameraDialog.staffName,
          "",
          cameraDialog.capturedPhoto,
        );
        showSnackbar(
          `${cameraDialog.staffName} clocked out successfully`,
          "success",
        );
      }

      await loadTimeRecords();
      await loadAttendanceSummary();

      // Close camera dialog
      stopCamera();
      setCameraDialog({
        open: false,
        mode: "clockIn",
        staffName: "",
        stream: null,
        capturedPhoto: null,
      });
    } catch (error) {
      showSnackbar(error.message, "error");
    }
  };

  const handleCameraClose = () => {
    stopCamera();
    setCameraDialog({
      open: false,
      mode: "clockIn",
      staffName: "",
      stream: null,
      capturedPhoto: null,
    });
  };

  // Effect to start camera when dialog opens
  useEffect(() => {
    if (cameraDialog.open) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [cameraDialog.open]);

  // Salary calculation function
  const calculateSalary = (staffName, records) => {
    // Salary rates per day for 8 hours
    const SALARY_RATES = {
      "Belen Misal": 250,
      "Luz Amoguis": 300,
    };

    const ratePerDay = SALARY_RATES[staffName] || 0;
    const ratePerHour = ratePerDay / 8; // Calculate hourly rate

    // Filter only completed records
    const completedRecords = records.filter((r) => r.status === "completed");

    let totalSalary = 0;
    let totalDeductions = 0;
    let totalWorkedHours = 0;

    completedRecords.forEach((record) => {
      const hoursWorked = record.totalHours || 0;
      totalWorkedHours += hoursWorked;

      // Calculate expected hours (8 hours per day)
      const expectedHours = 8;

      if (hoursWorked >= expectedHours) {
        // Full day salary if worked 8+ hours
        totalSalary += ratePerDay;
      } else {
        // Pro-rated salary for undertime
        const actualSalary = (hoursWorked / expectedHours) * ratePerDay;
        totalSalary += actualSalary;

        // Calculate deduction for undertime
        const deduction = ratePerDay - actualSalary;
        totalDeductions += deduction;
      }
    });

    const netSalary = totalSalary - totalDeductions;

    return {
      ratePerDay,
      ratePerHour,
      totalWorkedHours,
      totalSalary: Math.round(totalSalary * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netSalary: Math.round(netSalary * 100) / 100,
      completedDays: completedRecords.length,
    };
  };

  // PDF Export Functions
  const exportStaffPDF = async (staffName, records) => {
    const doc = new jsPDF();

    // Try to add logo
    try {
      const logoImg = new Image();
      logoImg.src = "/IansLogo.png";
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
        setTimeout(reject, 2000);
      });
      doc.addImage(logoImg, "PNG", 14, 8, 25, 25);
    } catch (e) {
      console.log("Logo not loaded, continuing without it");
    }

    // Header
    doc.setFontSize(18);
    doc.setTextColor(55, 93, 165);
    doc.text("Ian's Laundry Hub", 105, 18, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Staff Time Report", 105, 26, { align: "center" });

    doc.setFontSize(12);
    doc.text(`Staff: ${staffName}`, 105, 34, { align: "center" });

    // Calculate summary and salary
    const completedRecords = records.filter((r) => r.status === "completed");
    const totalHours = completedRecords.reduce(
      (sum, r) => sum + (r.totalHours || 0),
      0,
    );
    const totalDays = new Set(records.map((r) => r.date)).size;

    // Calculate salary
    const salaryInfo = calculateSalary(staffName, records);

    // Summary info
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Total Days: ${totalDays} | Total Hours: ${totalHours.toFixed(
        2,
      )} | Completed Records: ${completedRecords.length}`,
      105,
      42,
      { align: "center" },
    );

    // Salary information
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("Salary Information", 105, 50, { align: "center" });

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    let yPos = 58;
    doc.text(`Daily Rate: ₱${salaryInfo.ratePerDay}`, 20, yPos);
    doc.text(`Hourly Rate: ₱${salaryInfo.ratePerHour.toFixed(2)}`, 80, yPos);
    doc.text(`Completed Days: ${salaryInfo.completedDays}`, 140, yPos);

    yPos += 6;
    doc.text(
      `Total Worked Hours: ${salaryInfo.totalWorkedHours.toFixed(2)}h`,
      20,
      yPos,
    );
    doc.text(`Gross Salary: ₱${salaryInfo.totalSalary.toFixed(2)}`, 80, yPos);
    doc.text(
      `Total Deductions: ₱${salaryInfo.totalDeductions.toFixed(2)}`,
      140,
      yPos,
    );

    yPos += 6;
    doc.setFontSize(10);
    doc.setTextColor(55, 93, 165);
    doc.setFont("helvetica", "bold");
    doc.text(`Net Salary: ₱${salaryInfo.netSalary.toFixed(2)}`, 105, yPos, {
      align: "center",
    });
    doc.setFont("helvetica", "normal");

    // Table data
    const tableData = records.map((record, index) => [
      index + 1,
      new Date(record.date).toLocaleDateString(),
      record.timeIn
        ? new Date(record.timeIn).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
        : "-",
      record.timeOut
        ? new Date(record.timeOut).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
        : "-",
      record.totalHours ? record.totalHours.toFixed(2) : "-",
      record.status,
      record.timeInPhoto || record.timeOutPhoto ? "Yes" : "No",
      record.notes || "-",
    ]);

    // Add table
    autoTable(doc, {
      startY: yPos + 10,
      head: [
        [
          "#",
          "Date",
          "Time In",
          "Time Out",
          "Hours",
          "Status",
          "Photo",
          "Notes",
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
        1: { cellWidth: 18 },
        2: { cellWidth: 16 },
        3: { cellWidth: 16 },
        4: { cellWidth: 12 },
        5: { cellWidth: 12 },
        6: { cellWidth: 10 },
        7: { cellWidth: 25 },
      },
      margin: { left: 10, right: 10 },
    });

    // Generate filename
    const filename = `Time_Report_${staffName.replace(/\s+/g, "_")}_${
      new Date().toISOString().split("T")[0]
    }.pdf`;

    // Download file
    doc.save(filename);
  };

  const exportMultipleStaffPDF = async (selectedStaff, startDate, endDate) => {
    const doc = new jsPDF();

    // Try to add logo
    try {
      const logoImg = new Image();
      logoImg.src = "/IansLogo.png";
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
        setTimeout(reject, 2000);
      });
      doc.addImage(logoImg, "PNG", 14, 8, 25, 25);
    } catch (e) {
      console.log("Logo not loaded, continuing without it");
    }

    // Header
    doc.setFontSize(18);
    doc.setTextColor(55, 93, 165);
    doc.text("Ian's Laundry Hub", 105, 18, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Staff Time Reports", 105, 26, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Date Range: ${new Date(startDate).toLocaleDateString()} - ${new Date(
        endDate,
      ).toLocaleDateString()}`,
      105,
      34,
      { align: "center" },
    );

    let currentY = 42;

    // Process each staff member
    for (const staffName of selectedStaff) {
      const staffRecords = timeRecords.filter(
        (record) =>
          record.staffName === staffName &&
          record.date >= startDate &&
          record.date <= endDate,
      );

      if (staffRecords.length === 0) continue;

      // Staff header
      doc.setFontSize(12);
      doc.setTextColor(55, 93, 165);
      doc.text(`Staff: ${staffName}`, 14, currentY);
      currentY += 6;

      // Calculate summary and salary
      const completedRecords = staffRecords.filter(
        (r) => r.status === "completed",
      );
      const totalHours = completedRecords.reduce(
        (sum, r) => sum + (r.totalHours || 0),
        0,
      );

      // Calculate salary for this staff member
      const salaryInfo = calculateSalary(staffName, staffRecords);

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Total Hours: ${totalHours.toFixed(2)} | Records: ${
          completedRecords.length
        } | Net Salary: ₱${salaryInfo.netSalary.toFixed(2)}`,
        14,
        currentY,
      );
      currentY += 8;

      // Table data
      const tableData = staffRecords.map((record, index) => [
        index + 1,
        new Date(record.date).toLocaleDateString(),
        record.timeIn
          ? new Date(record.timeIn).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })
          : "-",
        record.timeOut
          ? new Date(record.timeOut).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })
          : "-",
        record.totalHours ? record.totalHours.toFixed(2) : "-",
        record.status,
        record.timeInPhoto || record.timeOutPhoto ? "Yes" : "No",
      ]);

      // Add table
      autoTable(doc, {
        startY: currentY,
        head: [
          ["#", "Date", "Time In", "Time Out", "Hours", "Status", "Photo"],
        ],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [55, 93, 165],
          textColor: 255,
          fontSize: 7,
          fontStyle: "bold",
        },
        bodyStyles: {
          fontSize: 6,
        },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 16 },
          2: { cellWidth: 14 },
          3: { cellWidth: 14 },
          4: { cellWidth: 12 },
          5: { cellWidth: 12 },
          6: { cellWidth: 10 },
        },
        margin: { left: 14, right: 14 },
      });

      currentY = doc.lastAutoTable.finalY + 10;

      // Add page break if needed
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
    }

    // Generate filename
    const filename = `Time_Reports_${startDate}_to_${endDate}.pdf`;

    // Download file
    doc.save(filename);
  };

  const handleExportIndividual = async (staffName) => {
    try {
      const staffRecords = timeRecords.filter(
        (record) => record.staffName === staffName,
      );
      if (staffRecords.length === 0) {
        showSnackbar(`No records found for ${staffName}`, "warning");
        return;
      }
      await exportStaffPDF(staffName, staffRecords);
      showSnackbar(`PDF exported for ${staffName}`, "success");
    } catch (error) {
      console.error("Export failed:", error);
      showSnackbar("Failed to export PDF", "error");
    }
  };

  const handleExportMultiple = async () => {
    if (exportDialog.selectedStaff.length === 0) {
      showSnackbar("Please select at least one staff member", "warning");
      return;
    }

    try {
      await exportMultipleStaffPDF(
        exportDialog.selectedStaff,
        exportDialog.dateRange.start,
        exportDialog.dateRange.end,
      );
      setExportDialog({ ...exportDialog, open: false, selectedStaff: [] });
      showSnackbar("PDF exported successfully", "success");
    } catch (error) {
      console.error("Export failed:", error);
      showSnackbar("Failed to export PDF", "error");
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "-";
    // Ensure UTC time is properly converted to local time
    const utcDate = new Date(
      dateString + (dateString.includes("Z") ? "" : "Z"),
    );
    return utcDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Manila", // Explicitly set timezone
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTodaysRecords = () => {
    const today = new Date().toISOString().split("T")[0];
    return timeRecords.filter((record) => record.date === today);
  };

  const getFilteredRecords = () => {
    if (activeTab === 0) return getTodaysRecords();
    return timeRecords.filter((record) => record.date === selectedDate);
  };

  const getActiveStaff = () => {
    return getTodaysRecords().filter((record) => record.status === "active");
  };

  return (
    <Box>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ fontWeight: 700, color: "#FFFFFF", mb: 3 }}
      >
        <AccessTimeIcon sx={{ mr: 2, verticalAlign: "middle" }} />
        Daily Time Record
      </Typography>

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                <PlayArrowIcon sx={{ mr: 1, color: "#10b981" }} />
                Clock In
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Start tracking time for a staff member
              </Typography>
              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={() => setClockInDialog({ open: true, staffName: "" })}
                sx={{
                  bgcolor: "#10b981",
                  "&:hover": { bgcolor: "#059669" },
                }}
              >
                Clock In Staff
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                <PersonIcon sx={{ mr: 1, color: "#f59e0b" }} />
                Active Staff ({getActiveStaff().length})
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Currently clocked in staff members
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {getActiveStaff().map((record) => (
                  <Chip
                    key={record.id}
                    icon={<PersonIcon />}
                    label={`${record.staffName} (${formatTime(record.timeIn)})`}
                    onClick={() => setClockOutDialog({ open: true, record })}
                    sx={{
                      cursor: "pointer",
                      "&:hover": { bgcolor: "#fef3c7" },
                    }}
                  />
                ))}
                {getActiveStaff().length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No staff currently clocked in
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab
            label="Today's Records"
            icon={<CalendarTodayIcon />}
            iconPosition="start"
          />
          <Tab
            label="Date Filter"
            icon={<AssessmentIcon />}
            iconPosition="start"
          />
        </Tabs>

        {activeTab === 1 && (
          <Box sx={{ p: 3, borderTop: 1, borderColor: "divider" }}>
            <TextField
              type="date"
              label="Select Date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              fullWidth
              sx={{ maxWidth: 300 }}
            />
          </Box>
        )}
      </Paper>

      {/* Time Records Table */}
      <Card elevation={2} sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Time Records -{" "}
            {activeTab === 0 ? "Today" : formatDate(selectedDate)}
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Staff Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Time In</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Time Out</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Total Hours</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Photo</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getFilteredRecords().length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No time records found for{" "}
                        {activeTab === 0 ? "today" : "selected date"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  getFilteredRecords().map((record) => (
                    <TableRow key={record.id} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar sx={{ width: 32, height: 32 }}>
                            <PersonIcon />
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {record.staffName}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{formatDate(record.date)}</TableCell>
                      <TableCell>{formatTime(record.timeIn)}</TableCell>
                      <TableCell>{formatTime(record.timeOut)}</TableCell>
                      <TableCell>
                        {record.totalHours > 0
                          ? `${record.totalHours.toFixed(2)}h`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={record.status}
                          color={
                            record.status === "active" ? "success" : "default"
                          }
                          variant={
                            record.status === "active" ? "filled" : "outlined"
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          {record.timeInPhoto && (
                            <Tooltip title="View Time In Photo">
                              <IconButton
                                size="small"
                                onClick={() =>
                                  setPhotoDialog({
                                    open: true,
                                    photo: record.timeInPhoto,
                                    title: "Time In Photo",
                                    date: formatDate(record.date),
                                    time: record.timeIn
                                      ? formatTime(record.timeIn)
                                      : "",
                                  })
                                }
                              >
                                <PhotoCameraIcon sx={{ color: "#10b981" }} />
                              </IconButton>
                            </Tooltip>
                          )}
                          {record.timeOutPhoto && (
                            <Tooltip title="View Time Out Photo">
                              <IconButton
                                size="small"
                                onClick={() =>
                                  setPhotoDialog({
                                    open: true,
                                    photo: record.timeOutPhoto,
                                    title: "Time Out Photo",
                                    date: formatDate(record.date),
                                    time: record.timeOut
                                      ? formatTime(record.timeOut)
                                      : "",
                                  })
                                }
                              >
                                <PhotoCameraIcon sx={{ color: "#ef4444" }} />
                              </IconButton>
                            </Tooltip>
                          )}
                          {!record.timeInPhoto && !record.timeOutPhoto && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              No photos
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          {record.status === "active" && (
                            <Tooltip title="Clock Out">
                              <IconButton
                                size="small"
                                onClick={() =>
                                  setClockOutDialog({ open: true, record })
                                }
                                sx={{ color: "#ef4444" }}
                              >
                                <StopIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Delete Record">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteRecord(record)}
                              sx={{ color: "#ef4444" }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Monthly Attendance Summary */}
      <Card elevation={2} sx={{ borderRadius: 3, mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            <AssessmentIcon sx={{ mr: 1, verticalAlign: "middle" }} />
            Monthly Attendance Summary
          </Typography>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Staff Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Days Worked</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Total Hours</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    Completed Records
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attendanceSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 2 }}>
                      <Typography color="text.secondary">
                        No attendance data for this month
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  attendanceSummary.map((staff) => (
                    <TableRow key={staff.staffName} hover>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {staff.staffName}
                      </TableCell>
                      <TableCell>{staff.totalDays}</TableCell>
                      <TableCell>{staff.totalHours.toFixed(2)}h</TableCell>
                      <TableCell>{staff.completedRecords}</TableCell>
                      <TableCell>
                        <Tooltip title="Export Individual PDF">
                          <IconButton
                            size="small"
                            onClick={() =>
                              handleExportIndividual(staff.staffName)
                            }
                            sx={{ color: "#1976d2" }}
                          >
                            <PictureAsPdfIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Export Button */}
          <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              startIcon={<PictureAsPdfIcon />}
              onClick={() => setExportDialog({ ...exportDialog, open: true })}
              sx={{
                bgcolor: "#1976d2",
                "&:hover": { bgcolor: "#1565c0" },
              }}
            >
              Export Multiple Staff PDF
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Clock In Dialog */}
      <Dialog
        open={clockInDialog.open}
        onClose={() => setClockInDialog({ open: false, staffName: "" })}
      >
        <DialogTitle>Clock In Staff</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>Staff Name</InputLabel>
            <Select
              value={clockInDialog.staffName}
              label="Staff Name"
              onChange={(e) =>
                setClockInDialog({
                  ...clockInDialog,
                  staffName: e.target.value,
                })
              }
            >
              {STAFF_LIST.map((staff) => (
                <MenuItem key={staff} value={staff}>
                  {staff}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setClockInDialog({ open: false, staffName: "" })}
          >
            Cancel
          </Button>
          <Button onClick={handleClockIn} variant="contained">
            Clock In
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clock Out Dialog */}
      <Dialog
        open={clockOutDialog.open}
        onClose={() => setClockOutDialog({ open: false, record: null })}
      >
        <DialogTitle>Clock Out Staff</DialogTitle>
        <DialogContent>
          <Typography>
            Clock out <strong>{clockOutDialog.record?.staffName}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Time in:{" "}
            {clockOutDialog.record
              ? formatTime(clockOutDialog.record.timeIn)
              : ""}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setClockOutDialog({ open: false, record: null })}
          >
            Cancel
          </Button>
          <Button onClick={handleClockOut} variant="contained" color="error">
            Clock Out
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <Dialog
        open={exportDialog.open}
        onClose={() =>
          setExportDialog({ ...exportDialog, open: false, selectedStaff: [] })
        }
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Export Staff Time Reports</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select staff members and date range for PDF export
          </Typography>

          {/* Date Range */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6}>
              <TextField
                label="Start Date"
                type="date"
                value={exportDialog.dateRange.start}
                onChange={(e) =>
                  setExportDialog({
                    ...exportDialog,
                    dateRange: {
                      ...exportDialog.dateRange,
                      start: e.target.value,
                    },
                  })
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="End Date"
                type="date"
                value={exportDialog.dateRange.end}
                onChange={(e) =>
                  setExportDialog({
                    ...exportDialog,
                    dateRange: {
                      ...exportDialog.dateRange,
                      end: e.target.value,
                    },
                  })
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          {/* Staff Selection */}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Select Staff Members:
          </Typography>
          <FormGroup>
            {STAFF_LIST.map((staff) => (
              <FormControlLabel
                key={staff}
                control={
                  <Checkbox
                    checked={exportDialog.selectedStaff.includes(staff)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setExportDialog({
                          ...exportDialog,
                          selectedStaff: [...exportDialog.selectedStaff, staff],
                        });
                      } else {
                        setExportDialog({
                          ...exportDialog,
                          selectedStaff: exportDialog.selectedStaff.filter(
                            (s) => s !== staff,
                          ),
                        });
                      }
                    }}
                  />
                }
                label={staff}
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setExportDialog({
                ...exportDialog,
                open: false,
                selectedStaff: [],
              })
            }
          >
            Cancel
          </Button>
          <Button
            onClick={handleExportMultiple}
            variant="contained"
            disabled={exportDialog.selectedStaff.length === 0}
          >
            Export PDF
          </Button>
        </DialogActions>
      </Dialog>

      {/* Camera Dialog */}
      <Dialog
        open={cameraDialog.open}
        onClose={handleCameraClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CameraAltIcon />
            {cameraDialog.mode === "clockIn" ? "Clock In" : "Clock Out"} -{" "}
            {cameraDialog.staffName}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please take a photo to verify your identity before{" "}
            {cameraDialog.mode === "clockIn" ? "clocking in" : "clocking out"}.
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            {/* Video Element */}
            <Box
              sx={{
                width: "100%",
                maxWidth: 400,
                height: 300,
                border: "2px solid #e0e0e0",
                borderRadius: 2,
                overflow: "hidden",
                display: cameraDialog.capturedPhoto ? "none" : "block",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </Box>

            {/* Captured Photo Preview */}
            {cameraDialog.capturedPhoto && (
              <Box
                sx={{
                  width: "100%",
                  maxWidth: 400,
                  height: 300,
                  border: "2px solid #10b981",
                  borderRadius: 2,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <img
                  src={cameraDialog.capturedPhoto}
                  alt="Captured photo"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
                <Chip
                  label="Photo Captured"
                  color="success"
                  size="small"
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                  }}
                />
              </Box>
            )}

            {/* Hidden Canvas for photo capture */}
            <canvas ref={canvasRef} style={{ display: "none" }} />

            {/* Camera Controls */}
            <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
              {!cameraDialog.capturedPhoto ? (
                <Fab
                  color="primary"
                  onClick={capturePhoto}
                  disabled={!cameraDialog.stream}
                  sx={{ width: 60, height: 60 }}
                >
                  <PhotoCameraIcon sx={{ fontSize: 28 }} />
                </Fab>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<CameraAltIcon />}
                  onClick={() =>
                    setCameraDialog((prev) => ({
                      ...prev,
                      capturedPhoto: null,
                    }))
                  }
                >
                  Retake Photo
                </Button>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCameraClose}>Cancel</Button>
          <Button
            onClick={handleCameraConfirm}
            variant="contained"
            disabled={!cameraDialog.capturedPhoto}
            color={cameraDialog.mode === "clockIn" ? "success" : "error"}
          >
            {cameraDialog.mode === "clockIn" ? "Clock In" : "Clock Out"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Photo View Dialog */}
      <Dialog
        open={photoDialog.open}
        onClose={() =>
          setPhotoDialog({
            open: false,
            photo: null,
            title: "",
            date: "",
            time: "",
          })
        }
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{photoDialog.title}</DialogTitle>
        <DialogContent>
          {(photoDialog.date || photoDialog.time) && (
            <Typography
              variant="h6"
              sx={{ textAlign: "center", mb: 2, color: "text.secondary" }}
            >
              {photoDialog.date && photoDialog.time
                ? `${photoDialog.date} - ${photoDialog.time}`
                : photoDialog.date || photoDialog.time}
            </Typography>
          )}
          {photoDialog.photo && (
            <Box sx={{ textAlign: "center" }}>
              <img
                src={photoDialog.photo}
                alt={photoDialog.title}
                style={{
                  maxWidth: "100%",
                  maxHeight: "500px",
                  borderRadius: "8px",
                  boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setPhotoDialog({
                open: false,
                photo: null,
                title: "",
                date: "",
                time: "",
              })
            }
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
