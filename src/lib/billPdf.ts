import jsPDF from "jspdf";

export type BillPdfData = {
  flatNo: string;
  ownerName: string | null;
  month: string; // YYYY-MM
  serviceCharge: number;
  gasBill: number;
  parking: number;
  eidBonus: number;
  otherCharge: number;
  total: number;
  paid: number;
  due: number;
  dueDate?: string | null;
  paidAt?: string | null;
  generatedOn?: string | null;
  buildingName?: string;
};

const fmtBDT = (n: number) =>
  `BDT ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const monthLabel = (m: string) => {
  try {
    return new Date(`${m}-01`).toLocaleDateString("en-US", { year: "numeric", month: "long" });
  } catch {
    return m;
  }
};

export function generateBillPdf(data: BillPdfData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;

  // ===== Watermark (diagonal, repeating) =====
  doc.saveGraphicsState();
  // @ts-ignore - GState exists at runtime
  doc.setGState(new (doc as any).GState({ opacity: 0.07 }));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(40);
  doc.setTextColor(0, 0, 0);
  const wmText = `FLAT ${data.flatNo}  ·  ${monthLabel(data.month)}`;
  for (let y = 80; y < pageH; y += 140) {
    for (let x = -100; x < pageW + 100; x += 360) {
      doc.text(wmText, x, y, { angle: 30 });
    }
  }
  doc.restoreGraphicsState();

  // ===== Header =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(20, 20, 30);
  doc.text(data.buildingName || "Sheikh Bachchu Tower", margin, margin + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 120);
  doc.text("Monthly Service Bill", margin, margin + 28);

  // Right side: bill meta
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 30);
  doc.text(`Bill — ${monthLabel(data.month)}`, pageW - margin, margin + 10, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 120);
  if (data.generatedOn) {
    doc.text(`Generated: ${data.generatedOn}`, pageW - margin, margin + 26, { align: "right" });
  }

  // Divider
  doc.setDrawColor(220, 220, 228);
  doc.setLineWidth(1);
  doc.line(margin, margin + 44, pageW - margin, margin + 44);

  // ===== Owner / flat info =====
  let y = margin + 70;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 120);
  doc.text("BILLED TO", margin, y);
  doc.text("FLAT", pageW / 2, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 30);
  doc.text(data.ownerName || "—", margin, y + 18);
  doc.text(data.flatNo, pageW / 2, y + 18);

  // ===== Charges table =====
  y += 60;
  const colLabelX = margin;
  const colAmountX = pageW - margin;
  const rowH = 26;

  const drawHeader = () => {
    doc.setFillColor(245, 246, 250);
    doc.rect(margin - 8, y - 14, pageW - 2 * margin + 16, rowH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(70, 70, 90);
    doc.text("DESCRIPTION", colLabelX, y);
    doc.text("AMOUNT", colAmountX, y, { align: "right" });
  };
  drawHeader();
  y += rowH;

  const items: { label: string; amount: number }[] = [
    { label: "Service Charge", amount: data.serviceCharge },
    { label: "Gas Bill", amount: data.gasBill },
  ];
  if (data.parking > 0) items.push({ label: "Parking", amount: data.parking });
  if (data.eidBonus > 0) items.push({ label: "Eid Bonus", amount: data.eidBonus });
  if (data.otherCharge > 0) items.push({ label: "Other Charge", amount: data.otherCharge });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 55);
  for (const it of items) {
    doc.text(it.label, colLabelX, y);
    doc.text(fmtBDT(it.amount), colAmountX, y, { align: "right" });
    doc.setDrawColor(235, 236, 240);
    doc.line(margin, y + 8, pageW - margin, y + 8);
    y += rowH;
  }

  // ===== Totals =====
  y += 10;
  doc.setDrawColor(20, 20, 30);
  doc.setLineWidth(1.2);
  doc.line(margin, y, pageW - margin, y);
  y += 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 30);
  doc.text("TOTAL", colLabelX, y);
  doc.text(fmtBDT(data.total), colAmountX, y, { align: "right" });

  y += 26;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(80, 130, 80);
  doc.text("Paid", colLabelX, y);
  doc.text(fmtBDT(data.paid), colAmountX, y, { align: "right" });

  y += 22;
  const dueColor: [number, number, number] = data.due > 0 ? [200, 50, 60] : [80, 130, 80];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...dueColor);
  doc.text("Due", colLabelX, y);
  doc.text(fmtBDT(data.due), colAmountX, y, { align: "right" });

  // ===== Meta footer =====
  y += 50;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 120);
  if (data.dueDate) {
    doc.text(`Due date: ${data.dueDate}`, margin, y);
    y += 16;
  }
  if (data.paidAt) {
    doc.text(`Paid on: ${data.paidAt}`, margin, y);
    y += 16;
  }

  // Footer line
  doc.setDrawColor(230, 230, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, pageH - 60, pageW - margin, pageH - 60);
  doc.setFontSize(9);
  doc.setTextColor(140, 140, 150);
  doc.text(
    "This is a system-generated bill. For queries contact building admin.",
    pageW / 2,
    pageH - 42,
    { align: "center" },
  );

  const filename = `Bill_Flat-${data.flatNo}_${data.month}.pdf`;
  doc.save(filename);
}
