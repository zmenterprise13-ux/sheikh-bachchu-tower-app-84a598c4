import jsPDF from "jspdf";
import QRCode from "qrcode";
import { fromDue, noFee } from "@/lib/bkashMath";
import bkashLogo from "@/assets/bkash-logo.png";

export type ReceiptPR = {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  status: string;
  reviewed_at: string | null;
  created_at: string;
  bills?: { month: string } | null;
};

export type ReceiptFlat = {
  flat_no?: string | null;
  owner_name?: string | null;
};

export async function downloadReceiptPdf(
  pr: ReceiptPR,
  flat: ReceiptFlat | null,
  bkashCfg: { number: string; fee_pct: number },
) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const W = doc.internal.pageSize.getWidth();
  const isBkash = pr.method === "bkash";
  const { due, fee, total } = isBkash
    ? fromDue(Number(pr.amount), bkashCfg.fee_pct)
    : noFee(Number(pr.amount));

  // Header band — green
  doc.setFillColor(22, 163, 74);
  doc.rect(0, 0, W, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("SHEIKH BACCHU TOWER SOCIETY", 14, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("14/2, Sheikh Bacchu Tower, Mokterbari Road, Tongi, Gazipur", 14, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("PAYMENT RECEIPT", 14, 28);

  doc.setFontSize(9);
  doc.text(`Receipt #: ${pr.id.slice(0, 8).toUpperCase()}`, W - 14, 18, { align: "right" });
  doc.text(`Date: ${new Date(pr.reviewed_at ?? pr.created_at).toLocaleDateString()}`, W - 14, 24, { align: "right" });

  // Status badge
  doc.setTextColor(15, 23, 42);
  const badgeColor: [number, number, number] =
    pr.status === "approved" ? [34, 197, 94] : pr.status === "rejected" ? [239, 68, 68] : [234, 179, 8];
  doc.setFillColor(...badgeColor);
  doc.roundedRect(W - 44, 38, 30, 8, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(pr.status.toUpperCase(), W - 29, 43.5, { align: "center" });

  // Bill-to
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("BILLED TO", 14, 44);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`${flat?.owner_name ?? "-"}`, 14, 51);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Flat: ${flat?.flat_no ?? "-"}`, 14, 57);
  doc.text(`For Month: ${pr.bills?.month ?? "-"}`, 14, 63);

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 70, W - 14, 70);

  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("PAYMENT METHOD", 14, 80);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  if (isBkash) {
    try { doc.addImage(bkashLogo, "PNG", 14, 84, 12, 12, undefined, "FAST"); } catch {}
    doc.setTextColor(226, 19, 110);
    doc.text("bKash", 30, 92);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Send Money to: ${bkashCfg.number}`, 30, 97);
  } else {
    doc.text(pr.method.toUpperCase(), 14, 88);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Reference: ${pr.reference ?? "-"}`, W - 14, 88, { align: "right" });
  doc.text(`Submitted: ${new Date(pr.created_at).toLocaleString()}`, W - 14, 94, { align: "right" });
  if (pr.reviewed_at) doc.text(`Approved: ${new Date(pr.reviewed_at).toLocaleString()}`, W - 14, 100, { align: "right" });

  const tY = 112;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, tY, W - 28, 9, "F");
  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DESCRIPTION", 18, tY + 6);
  doc.text("AMOUNT (BDT)", W - 18, tY + 6, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  let row = tY + 17;
  doc.text("Due (base)", 18, row);
  doc.text(due.toFixed(2), W - 18, row, { align: "right" });
  if (isBkash) {
    row += 8;
    doc.text(`bKash Fee (${(bkashCfg.fee_pct * 100).toFixed(2)}%)`, 18, row);
    doc.text(fee.toFixed(2), W - 18, row, { align: "right" });
  }
  row += 4;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, row, W - 14, row);
  row += 8;

  doc.setFillColor(22, 163, 74);
  doc.rect(14, row - 6, W - 28, 11, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL PAID", 18, row + 1);
  doc.text(`BDT ${total.toFixed(2)}`, W - 18, row + 1, { align: "right" });

  try {
    const verifyPayload = JSON.stringify({
      id: pr.id,
      flat: flat?.flat_no ?? null,
      owner: flat?.owner_name ?? null,
      month: pr.bills?.month ?? null,
      method: pr.method,
      ref: pr.reference ?? null,
      due: due.toFixed(2),
      fee: fee.toFixed(2),
      total: total.toFixed(2),
      status: pr.status,
      date: pr.reviewed_at ?? pr.created_at,
    });
    const qrUrl = await QRCode.toDataURL(verifyPayload, { margin: 0, width: 128, errorCorrectionLevel: "M" });
    doc.addImage(qrUrl, "PNG", 14, 250, 28, 28, undefined, "FAST");
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Scan to verify receipt", 46, 262);
    doc.text(`Receipt ID: ${pr.id}`, 46, 267);
  } catch {}

  doc.setTextColor(148, 163, 184);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text("This is a system-generated receipt and does not require a signature.", W / 2, 285, { align: "center" });
  doc.text("Thank you for your payment.", W / 2, 290, { align: "center" });

  doc.save(`receipt-${pr.id.slice(0, 8)}.pdf`);
}
