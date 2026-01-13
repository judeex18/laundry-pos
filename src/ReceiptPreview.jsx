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
    const doc = new jsPDF({ unit: "mm", format: [56, 120] });
    let y = 4;
    // Add logo from public folder
    try {
      const logoBase64 = await getBase64FromUrl("/IansLogo.png");
      doc.addImage(logoBase64, "PNG", 20, y, 12, 12); // Very small logo for 56mm
      y += 14;
    } catch (e) {
      y += 2;
    }
    doc.setFontSize(10);
    doc.text("Ian's Laundry Hub", 28, y, { align: "center" });
    y += 4;
    doc.setFontSize(7);
    doc.text(`Receipt #: ${data.receiptNumber || "-"}`, 2, y);
    y += 3;
    doc.text(`Customer: ${data.customer ? data.customer : "-"}`, 2, y);
    y += 3;
    doc.text(`Phone: ${data.phone ? data.phone : "-"}`, 2, y);
    y += 3;
    doc.text(`Date: ${data.date || new Date().toLocaleString()}`, 2, y);
    y += 4;
    doc.text("Items:", 2, y);
    y += 3;
    if (Array.isArray(data.items) && data.items.length > 0) {
      data.items.forEach((item) => {
        // Fit item name and price on one line, truncate if too long
        const itemName = (item.name || "Item").toString();
        // Use item.loads for main service, item.qty for add-ons, fallback to 1
        const qty = item.loads || item.qty || 1;
        // Show total for this item (price * qty)
        const itemTotal = (Number(item.price || 0) * qty).toFixed(2);
        let line = `${itemName} x${qty}`;
        // Limit item name to 10 chars for very tight 56mm paper
        if (line.length > 10) line = line.slice(0, 10) + "…";
        // Align price to the right, no peso sign
        doc.text(line, 3, y, { maxWidth: 30 });
        doc.text(`${itemTotal}`, 53, y, { align: "right" });
        y += 3;
      });
    } else {
      doc.text("-", 3, y);
      y += 3;
    }
    y += 1;
    doc.line(2, y, 54, y);
    y += 3;
    // Payment section
    const total = `${Number(data.total).toFixed(2)}`;
    const received = `${amountPaid || data.amountPaid || "0.00"}`;
    const changeStr = `${change.toFixed(2)}`;
    if (!isPaid) {
      doc.setTextColor(255, 0, 0);
      doc.text("UNPAID", 28, y, { align: "center" });
      doc.setTextColor(0, 0, 0);
      y += 4;
      doc.text(`Total: ${total}`, 3, y);
      y += 4;
    } else {
      doc.text(`Total: ${total}`, 3, y);
      y += 3;
      if ((paymentMethod || data.method) === "GCash") {
        doc.text(`Payment: GCash`, 3, y);
        y += 3;
        doc.text(
          `GCash Ref: ${gcashRefNumber || data.gcashRefNumber || "-"}`,
          3,
          y
        );
        y += 3;
      } else {
        doc.text(`Received Amount: ${received}`, 3, y);
        y += 3;
        doc.text(`Change: ${changeStr}`, 3, y);
        y += 3;
        doc.text(`Payment: ${paymentMethod || data.method || "-"}`, 3, y);
        y += 3;
      }
    }
    // Add extra space if near the bottom
    if (y > 110) y = 115;
    else y += 3;
    doc.setFontSize(8);
    doc.text("Thank you!", 28, y, { align: "center" });
    doc.save(`receipt_${data.receiptNumber || "order"}.pdf`);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    const receiptContent = `
      <html>
        <head>
          <title>Receipt - ${data.receiptNumber || "Order"}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 10px;
              max-width: 56mm;
              margin: 0 auto;
              font-size: 12px;
            }
            .header {
              text-align: center;
              margin-bottom: 15px;
            }
            .logo {
              width: 40px;
              height: 40px;
              margin: 0 auto 8px;
            }
            .item {
              display: flex;
              justify-content: space-between;
              margin: 4px 0;
              font-size: 11px;
            }
            .total {
              border-top: 1px solid #000;
              padding-top: 8px;
              margin-top: 8px;
              font-weight: bold;
              font-size: 12px;
            }
            .thank-you {
              text-align: center;
              margin-top: 15px;
              font-size: 12px;
            }
            @media print {
              body { margin: 0; padding: 5px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/IansLogo.png" alt="Logo" class="logo" onerror="this.style.display='none'">
            <h2 style="margin: 5px 0; font-size: 14px;">Ian's Laundry Hub</h2>
          </div>
          <div style="margin-bottom: 10px;">
            <div style="font-size: 11px;"><strong>Receipt #:</strong> ${
              data.receiptNumber || "-"
            }</div>
            <div style="font-size: 11px;"><strong>Customer:</strong> ${
              data.customer || "-"
            }</div>
            <div style="font-size: 11px;"><strong>Phone:</strong> ${
              data.phone || "-"
            }</div>
            <div style="font-size: 11px;"><strong>Date:</strong> ${
              data.date || new Date().toLocaleString()
            }</div>
          </div>
          <div style="margin: 15px 0;">
            <strong>Items:</strong>
            ${
              Array.isArray(data.items) && data.items.length > 0
                ? data.items
                    .map((item) => {
                      const qty = item.loads || item.qty || 1;
                      const itemTotal = (Number(item.price || 0) * qty).toFixed(
                        2
                      );
                      const itemName = (item.name || "Item").toString();
                      const truncatedName =
                        itemName.length > 15
                          ? itemName.slice(0, 15) + "…"
                          : itemName;
                      return `<div class="item"><span>${truncatedName} x${qty}</span><span>${itemTotal}</span></div>`;
                    })
                    .join("")
                : "<div>-</div>"
            }
          </div>
          <div class="total">
            <div class="item"><span>Total:</span><span>${Number(
              data.total
            ).toFixed(2)}</span></div>
            ${
              isPaid
                ? `
              <div><strong>Payment:</strong> ${data.method || "-"}</div>
              ${
                data.method !== "GCash"
                  ? `
                <div><strong>Received:</strong> ${
                  data.amountPaid || "0.00"
                }</div>
                <div><strong>Change:</strong> ${data.change || "0.00"}</div>
              `
                  : `
                <div><strong>GCash Ref:</strong> ${
                  data.gcashRefNumber || "-"
                }</div>
              `
              }
            `
                : '<div style="color: red;"><strong>UNPAID</strong></div>'
            }
          </div>
          <div class="thank-you">Thank you!</div>
        </body>
      </html>
    `;
    printWindow.document.write(receiptContent);
    printWindow.document.close();
    printWindow.print();
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

    if (onPaymentUpdate && data.id) {
      onPaymentUpdate(data.id, paymentData);
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
                  sx={{ mb: 2 }}
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
