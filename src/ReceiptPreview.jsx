import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import {
  Dialog,
  DialogContent,
  Typography,
  Divider,
  Button,
  Box,
  Stack,
  Avatar,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocalLaundryServiceIcon from "@mui/icons-material/LocalLaundryService";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ReceiptIcon from "@mui/icons-material/Receipt";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PaymentsIcon from "@mui/icons-material/Payments";
import PaidIcon from "@mui/icons-material/Paid";
import CloseIcon from "@mui/icons-material/Close";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import PrintIcon from "@mui/icons-material/Print";

export default function ReceiptPreview({
  open,
  onClose,
  data,
  onPaymentUpdate,
}) {
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [gcashNumber, setGcashNumber] = useState("");
  const [gcashRefNumber, setGcashRefNumber] = useState("");
  const [qrEnlarged, setQrEnlarged] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open && data) {
      setPaymentMethod(data.method === "Unpaid" ? "Cash" : data.method);
      if (data.method === "GCash") {
        setAmountPaid(String(data.total));
      } else {
        setAmountPaid(data.amountPaid ? String(data.amountPaid) : "");
      }
      setGcashNumber(data.gcashNumber || "");
      setGcashRefNumber(data.gcashRefNumber || "");
    }
  }, [open, data]);

  if (!data) return null;

  const isPaid = data.method && data.method !== "Unpaid";
  const change = amountPaid
    ? Math.max(0, Number(amountPaid) - Number(data.total))
    : 0;

  // PDF generation function
  // Helper to fetch image as base64
  const getBase64FromUrl = async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleDownloadPDF = async () => {
    const doc = new jsPDF({ unit: "mm", format: [57, 120] });
    let y = 5;

    // Header - Shop Name
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("Ian's Laundry Hub", 28.5, y, { align: "center" });
    y += 5;

    doc.setFontSize(7);
    doc.setFont(undefined, "normal");
    doc.text("================================", 28.5, y, { align: "center" });
    y += 4;

    // Receipt Info
    doc.setFont(undefined, "bold");
    doc.setFontSize(8);
    doc.text(`Receipt #: ${data.receiptNumber || "-"}`, 2, y);
    doc.setFontSize(7);
    doc.setFont(undefined, "normal");
    y += 3.5;
    doc.text(`Customer: ${data.customer ? data.customer : "-"}`, 2, y);
    y += 3.5;
    doc.text(`Phone: ${data.phone ? data.phone : "-"}`, 2, y);
    y += 3.5;
    const formattedDate = data.date || new Date().toLocaleString();
    doc.text(`Date: ${formattedDate}`, 2, y);
    y += 4;

    doc.text("================================", 28.5, y, { align: "center" });
    y += 4;

    // Items Header
    doc.setFont(undefined, "bold");
    doc.text("Item", 2, y);
    doc.text("Qty", 38, y);
    doc.text("Total", 55, y, { align: "right" });
    y += 3;
    doc.setFont(undefined, "normal");
    doc.text("--------------------------------", 28.5, y, { align: "center" });
    y += 3.5;

    // Items
    if (Array.isArray(data.items) && data.items.length > 0) {
      data.items.forEach((item) => {
        const itemName = (item.name || "Item").toString();
        const qty = item.loads || item.qty || 1;
        const itemTotal = (Number(item.price || 0) * qty).toFixed(2);

        // Item name (wrap if too long)
        const maxWidth = 32;
        const lines = doc.splitTextToSize(itemName, maxWidth);
        doc.text(lines[0], 2, y);

        // Qty and Total on same line
        doc.text(`${qty}`, 38, y);
        doc.text(`${itemTotal}`, 55, y, { align: "right" });
        y += 3.5;

        // Additional lines for long item names
        if (lines.length > 1) {
          for (let i = 1; i < lines.length; i++) {
            doc.text(lines[i], 2, y);
            y += 3.5;
          }
        }
      });
    } else {
      doc.text("No items", 2, y);
      y += 3.5;
    }

    y += 1;
    doc.text("=================================", 28.5, y, { align: "center" });
    y += 4;

    // Total
    doc.setFont(undefined, "bold");
    doc.setFontSize(9);
    doc.text("TOTAL:", 2, y);
    doc.text(`₱${Number(data.total).toFixed(2)}`, 55, y, { align: "right" });
    y += 4;
    doc.setFontSize(7);
    doc.setFont(undefined, "normal");

    // Payment details
    if (!isPaid) {
      doc.setTextColor(255, 0, 0);
      doc.setFont(undefined, "bold");
      doc.text("*** UNPAID ***", 28.5, y, { align: "center" });
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "normal");
      y += 4;
    } else {
      if ((paymentMethod || data.method) === "GCash") {
        doc.text(`Payment Method: GCash`, 2, y);
        y += 3.5;
        doc.text(
          `GCash Ref: ${gcashRefNumber || data.gcashRefNumber || "-"}`,
          2,
          y,
        );
        y += 3.5;
      } else {
        doc.text(`Payment: ${paymentMethod || data.method || "-"}`, 2, y);
        y += 3.5;
        const received = amountPaid || data.amountPaid || "0.00";
        doc.text(`Amount Paid: ₱${received}`, 2, y);
        y += 3.5;
        const changeAmount = Number(received) - Number(data.total);
        doc.text(`Change: ₱${changeAmount.toFixed(2)}`, 2, y);
        y += 3.5;
      }
    }

    y += 2;
    doc.text("=================================", 28.5, y, { align: "center" });
    y += 4;

    // Footer
    doc.setFont(undefined, "bold");
    doc.text("Thank you for choosing", 28.5, y, { align: "center" });
    y += 3.5;
    doc.text("Ian's Laundry Hub!", 28.5, y, { align: "center" });
    y += 3.5;
    doc.setFont(undefined, "normal");
    doc.text("Please drop with us again!", 28.5, y, { align: "center" });

    doc.save(`receipt_${data.receiptNumber || "order"}.pdf`);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=220,height=600");
    const receiptHTML = `
      <html>
        <head>
          <title>Receipt - ${data.receiptNumber || "Order"}</title>
          <style>
            @page {
              size: 57mm 120mm;
              margin: 0;
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 9px;
              line-height: 1.3;
              margin: 0;
              padding: 3mm;
              width: 57mm;
              box-sizing: border-box;
            }
            .center { text-align: center; }
            .left { text-align: left; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .separator { 
              border-top: 1px dashed #000; 
              margin: 3px 0; 
            }
            .double-separator { 
              border-top: 2px solid #000; 
              margin: 3px 0; 
            }
            .header {
              font-size: 12px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              margin: 2px 0;
            }
            .item-name {
              flex: 1;
              padding-right: 5px;
            }
            .item-qty {
              width: 25px;
              text-align: center;
            }
            .item-total {
              width: 45px;
              text-align: right;
            }
            .total-section {
              font-size: 10px;
              font-weight: bold;
              margin: 5px 0;
            }
            @media print {
              body { 
                margin: 0; 
                width: 57mm;
                padding: 3mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="center header">Ian's Laundry Hub</div>
          <div class="center" style="font-size: 7px;">================================</div>
          
          <div class="left">
            <strong style="font-size: 10px;">Receipt #: ${data.receiptNumber || "-"}</strong><br>
            Customer: ${data.customer || "-"}<br>
            Phone: ${data.phone || "-"}<br>
            Date: ${data.date || new Date().toLocaleString()}
          </div>
          
          <div class="center" style="font-size: 7px;">================================</div>
          
          <div class="item-row bold" style="margin: 5px 0 2px 0;">
            <div class="item-name">Item</div>
            <div class="item-qty">Qty</div>
            <div class="item-total">Total</div>
          </div>
          <div class="center" style="font-size: 7px; border-top: 1px dashed #000; margin: 2px 0;"></div>
          
          ${
            Array.isArray(data.items) && data.items.length > 0
              ? data.items
                  .map((item) => {
                    const qty = item.loads || item.qty || 1;
                    const itemTotal = (Number(item.price || 0) * qty).toFixed(
                      2,
                    );
                    const itemName = (item.name || "Item").toString();
                    return `
                      <div class="item-row">
                        <div class="item-name">${itemName}</div>
                        <div class="item-qty">${qty}</div>
                        <div class="item-total">₱${itemTotal}</div>
                      </div>
                    `;
                  })
                  .join("")
              : '<div class="left">No items</div>'
          }
          
          <div class="center" style="font-size: 7px;">====================================</div>
          
          <div class="item-row total-section">
            <div>TOTAL:</div>
            <div>₱${Number(data.total).toFixed(2)}</div>
          </div>
          
          <div class="separator"></div>
          
          ${
            isPaid
              ? `
            <div class="left">
              Payment: ${data.method || "-"}<br>
              ${
                data.method !== "GCash"
                  ? `
                Amount Paid: ₱${data.amountPaid || "0.00"}<br>
                Change: ₱${data.change || "0.00"}
              `
                  : `
                GCash Ref: ${data.gcashRefNumber || "-"}
              `
              }
            </div>
          `
              : '<div class="center bold" style="color: #000; margin: 5px 0;">*** UNPAID ***</div>'
          }
          
          <div class="center" style="font-size: 7px; margin-top: 5px;">====================================</div>
          
          <div class="center bold" style="margin-top: 5px;">Thank you for choosing Ian's Laundry Hub!</div>
          <div class="center" style="font-size: 8px;">Please drop with us again!</div>
        </body>
      </html>
    `;
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handlePayment = () => {
    if (!amountPaid || Number(amountPaid) < Number(data.total)) {
      return;
    }

    const paymentData = {
      method: paymentMethod,
      amountPaid: Number(amountPaid),
      change: change,
    };

    if (paymentMethod === "GCash") {
      paymentData.gcashNumber = gcashNumber;
      paymentData.gcashRefNumber = gcashRefNumber;
    }

    if (onPaymentUpdate && data.receiptNumber) {
      onPaymentUpdate(data.receiptNumber, paymentData);
    }
  };

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
      {/* Header */}
      <Box
        sx={{
          background: isPaid
            ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
            : "linear-gradient(135deg, #375da5 0%, #2a4a8a 100%)",
          color: "white",
          py: 3,
          textAlign: "center",
        }}
      >
        <Avatar
          sx={{
            width: 56,
            height: 56,
            background: "rgba(255,255,255,0.2)",
            mx: "auto",
            mb: 1.5,
          }}
        >
          {isPaid ? (
            <CheckCircleIcon sx={{ fontSize: 32 }} />
          ) : (
            <ReceiptIcon sx={{ fontSize: 32 }} />
          )}
        </Avatar>
        <Typography variant="h6" fontWeight={700}>
          {isPaid ? "Payment Complete" : "Order Receipt"}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
          {isPaid ? "Thank you for your payment" : "Process payment below"}
        </Typography>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        {/* Download and Print Receipt Buttons */}
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleDownloadPDF}
            sx={{ flex: 1, fontWeight: 600 }}
          >
            Download Receipt
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handlePrint}
            startIcon={<PrintIcon />}
            sx={{ flex: 1, fontWeight: 600 }}
          >
            Print Receipt
          </Button>
        </Box>
        {/* Receipt Number */}
        {data.receiptNumber && (
          <Box
            sx={{
              textAlign: "center",
              mb: 2,
              p: 1.5,
              background: "linear-gradient(135deg, #375da5 0%, #2a4a8a 100%)",
              borderRadius: 2,
              color: "white",
            }}
          >
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Receipt Number
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {data.receiptNumber}
            </Typography>
          </Box>
        )}

        {/* Customer Info */}
        <Box
          sx={{
            p: 2,
            background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
            borderRadius: 2,
            mb: 2,
          }}
        >
          <Stack spacing={1}>
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

        {/* Order Items - Cashier Style */}
        <Typography
          variant="subtitle2"
          color="text.secondary"
          sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}
        >
          <ReceiptIcon fontSize="small" /> Order Details
        </Typography>

        <Stack spacing={1} sx={{ mb: 2 }}>
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
                    ₱{item.price} × {item.loads}
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

        {/* Cashier Section */}
        <Box
          sx={{
            p: 2,
            background: "linear-gradient(135deg, #375da5 0%, #2a4a8a 100%)",
            borderRadius: 2,
            color: "white",
            mb: 2,
          }}
        >
          {/* Total Amount */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: isPaid ? 1 : 0,
            }}
          >
            <Typography variant="body1" fontWeight={500}>
              Total Amount
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              ₱{Number(data.total).toFixed(2)}
            </Typography>
          </Box>

          {/* If already paid, show payment info */}
          {isPaid && (
            <>
              <Divider sx={{ my: 1.5, borderColor: "rgba(255,255,255,0.2)" }} />
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1,
                }}
              >
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Payment Method
                </Typography>
                <Typography fontWeight={600}>{data.method}</Typography>
              </Box>
              {data.method !== "GCash" && (
                <>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Amount Paid
                    </Typography>
                    <Typography fontWeight={600}>
                      ₱{Number(data.amountPaid || data.total).toFixed(2)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Change
                    </Typography>
                    <Typography fontWeight={700} sx={{ color: "#4ade80" }}>
                      ₱{Number(data.change || 0).toFixed(2)}
                    </Typography>
                  </Box>
                </>
              )}
            </>
          )}
        </Box>

        {/* GCash Info if paid via GCash */}
        {isPaid && data.method === "GCash" && data.gcashRefNumber && (
          <Box
            sx={{
              p: 2,
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              borderRadius: 2,
              mb: 2,
              color: "white",
            }}
          >
            <Stack spacing={1}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <AccountBalanceWalletIcon sx={{ fontSize: 20 }} />
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  GCash Number
                </Typography>
                <Typography fontWeight={600} sx={{ ml: "auto" }}>
                  {data.gcashNumber}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <ReceiptIcon sx={{ fontSize: 20 }} />
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Reference No.
                </Typography>
                <Typography fontWeight={700} sx={{ ml: "auto" }}>
                  {data.gcashRefNumber}
                </Typography>
              </Box>
            </Stack>
          </Box>
        )}

        {/* Payment Form - Only show if unpaid and onPaymentUpdate is provided */}
        {!isPaid && onPaymentUpdate && (
          <Box sx={{ mt: 2 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 1.5, display: "flex", alignItems: "center", gap: 1 }}
            >
              <PaidIcon fontSize="small" /> Process Payment
            </Typography>

            {/* Payment Method Toggle */}
            <ToggleButtonGroup
              value={paymentMethod}
              exclusive
              onChange={(e, newMethod) => {
                if (newMethod) {
                  setPaymentMethod(newMethod);
                  if (newMethod === "GCash") {
                    setAmountPaid(String(data.total));
                  }
                }
              }}
              fullWidth
              sx={{ mb: 2 }}
            >
              <ToggleButton
                value="Cash"
                sx={{
                  py: 1.5,
                  fontWeight: 600,
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
                <PaymentsIcon sx={{ mr: 1 }} />
                Cash
              </ToggleButton>
              <ToggleButton
                value="GCash"
                sx={{
                  py: 1.5,
                  fontWeight: 600,
                  "&.Mui-selected": {
                    background:
                      "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                    color: "white",
                    "&:hover": {
                      background:
                        "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                    },
                  },
                }}
              >
                <Box
                  component="span"
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <img
                    src="/GcashLogo.png"
                    alt="GCash Logo"
                    style={{ width: 24, height: 24, marginRight: 8 }}
                  />
                  GCash
                </Box>
              </ToggleButton>
            </ToggleButtonGroup>

            {/* GCash Fields */}
            {paymentMethod === "GCash" && (
              <Stack spacing={2} sx={{ mb: 2 }}>
                {/* QR Code */}
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    onClick={() => setQrEnlarged(true)}
                    sx={{
                      position: "relative",
                      display: "inline-block",
                      cursor: "pointer",
                      "&:hover .zoom-overlay": {
                        opacity: 1,
                      },
                    }}
                  >
                    <Box
                      component="img"
                      src="/GcashQR.jpg"
                      alt="GCash QR Code"
                      sx={{
                        maxWidth: "100%",
                        height: "auto",
                        maxHeight: 180,
                        borderRadius: 2,
                        border: "2px solid #e2e8f0",
                        transition: "transform 0.2s",
                        "&:hover": {
                          transform: "scale(1.02)",
                        },
                      }}
                    />
                    <Box
                      className="zoom-overlay"
                      sx={{
                        position: "absolute",
                        bottom: 8,
                        right: 8,
                        bgcolor: "rgba(0,0,0,0.6)",
                        color: "white",
                        borderRadius: "50%",
                        width: 32,
                        height: 32,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: 0.7,
                        transition: "opacity 0.2s",
                      }}
                    >
                      <ZoomInIcon sx={{ fontSize: 20 }} />
                    </Box>
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 1 }}
                  >
                    Tap QR code to enlarge for scanning
                  </Typography>
                </Box>
                <TextField
                  fullWidth
                  label="GCash Number"
                  value={gcashNumber}
                  onChange={(e) => setGcashNumber(e.target.value)}
                  placeholder="09XX XXX XXXX"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Reference Number"
                  value={gcashRefNumber}
                  onChange={(e) => setGcashRefNumber(e.target.value)}
                  placeholder="Enter GCash reference number"
                  size="small"
                />
              </Stack>
            )}

            {/* Amount Input and Change only for non-GCash */}
            {paymentMethod !== "GCash" && (
              <>
                <TextField
                  fullWidth
                  label="Amount Received"
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder={`Min: ₱${Number(data.total).toFixed(2)}`}
                  sx={{
                    mb: 2,
                    "& input[type=number]": {
                      MozAppearance: "textfield",
                    },
                    "& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button":
                      {
                        WebkitAppearance: "none",
                        margin: 0,
                      },
                  }}
                  InputProps={{
                    startAdornment: (
                      <Typography sx={{ mr: 1, color: "text.secondary" }}>
                        ₱
                      </Typography>
                    ),
                  }}
                  error={
                    amountPaid !== "" && Number(amountPaid) < Number(data.total)
                  }
                  helperText={
                    amountPaid !== "" && Number(amountPaid) < Number(data.total)
                      ? "Amount must be at least ₱" +
                        Number(data.total).toFixed(2)
                      : ""
                  }
                />
                {/* Change Display */}
                {amountPaid && Number(amountPaid) >= Number(data.total) && (
                  <Box
                    sx={{
                      p: 2,
                      background:
                        "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      borderRadius: 2,
                      color: "white",
                      mb: 2,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography fontWeight={500}>Change</Typography>
                    <Typography variant="h5" fontWeight={700}>
                      ₱{change.toFixed(2)}
                    </Typography>
                  </Box>
                )}
              </>
            )}

            {/* Submit Payment Button */}
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handlePayment}
              disabled={
                (paymentMethod !== "GCash" &&
                  (!amountPaid || Number(amountPaid) < Number(data.total))) ||
                (paymentMethod === "GCash" && (!gcashNumber || !gcashRefNumber))
              }
              sx={{
                py: 1.5,
                borderRadius: 2,
                fontWeight: 700,
                background:
                  paymentMethod === "GCash"
                    ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                    : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                "&:hover": {
                  background:
                    paymentMethod === "GCash"
                      ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)"
                      : "linear-gradient(135deg, #059669 0%, #047857 100%)",
                },
              }}
            >
              <PaidIcon sx={{ mr: 1 }} />
              Confirm Payment
            </Button>
          </Box>
        )}

        {/* Close Button */}
        <Button
          fullWidth
          variant={isPaid ? "contained" : "outlined"}
          size="large"
          onClick={onClose}
          sx={{
            mt: 2,
            py: 1.5,
            borderRadius: 2,
            fontWeight: 600,
          }}
        >
          {isPaid ? "Done" : "Close"}
        </Button>
      </DialogContent>

      {/* Enlarged QR Code Modal */}
      <Dialog
        open={qrEnlarged}
        onClose={() => setQrEnlarged(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: "white",
            position: "relative",
          },
        }}
      >
        <Box
          sx={{
            p: 3,
            textAlign: "center",
            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
          }}
        >
          <Typography variant="h6" fontWeight={700} color="white">
            GCash QR Code
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)" }}>
            Scan to pay ₱{data?.total ? Number(data.total).toFixed(2) : "0.00"}
          </Typography>
        </Box>
        <Box sx={{ p: 3, textAlign: "center", bgcolor: "white" }}>
          <Box
            component="img"
            src="/GcashQR.jpg"
            alt="GCash QR Code Enlarged"
            sx={{
              maxWidth: "100%",
              height: "auto",
              maxHeight: "60vh",
              borderRadius: 2,
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            }}
          />
          <Button
            variant="contained"
            onClick={() => setQrEnlarged(false)}
            startIcon={<CloseIcon />}
            sx={{
              mt: 3,
              px: 4,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600,
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              },
            }}
          >
            Close
          </Button>
        </Box>
      </Dialog>
    </Dialog>
  );
}
