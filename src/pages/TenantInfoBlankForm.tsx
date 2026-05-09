import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, FileDown, RotateCcw } from "lucide-react";
import { saveAs } from "file-saver";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle,
} from "docx";

/**
 * পুলিশ-আদলের ভাড়াটিয়া নিবন্ধন ফরম (থানার নাম বাদে)।
 * ক্লিক করে যেকোনো লেবেল এডিট করা যাবে। কলাম রিসাইজ করা যাবে।
 * Print / PDF / Word ডাউনলোড।
 */

const STORAGE_KEY = "tenant-blank-form-labels-v3";
const COL_KEY = "tenant-blank-form-cols-v2";

const DEFAULT_LABELS = {
  buildingName: "শেখ বাচ্চু টাওয়ার",
  buildingAddress: "১৪/২, মোক্তার বাড়ী রোড, আউচপাড়া, টঙ্গী, গাজীপুর।",
  formTitle: "ভাড়াটিয়া নিবন্ধন ফরম",
  // location row
  ownerTenantName: "১। ফ্ল্যাট মালিক/ভাড়াটিয়ার নাম",
  flatNo: "২। ফ্ল্যাট নং",
  holdingNo: "৩। হোল্ডিং নং",
  // photo
  photoBox: "ছবি (পাসপোর্ট সাইজ)",
  // 1-9
  l1: "১। ভাড়াটিয়া/বাড়িওয়ালার নাম",
  l2: "২। পিতার নাম",
  l3a: "৩। জন্ম তারিখ",
  l3b: "বৈবাহিক অবস্থা",
  l4: "৪। স্থায়ী ঠিকানা",
  l5: "৫। পেশা ও প্রতিষ্ঠান/কর্মস্থলের ঠিকানা",
  l6a: "৬। ধর্ম",
  l6b: "শিক্ষাগত যোগ্যতা",
  l7a: "৭। মোবাইল নম্বর",
  l7b: "ই-মেইল",
  l8: "৮। জাতীয় পরিচয়পত্র নম্বর",
  l9: "৯। পাসপোর্ট নম্বর (যদি থাকে)",
  // 10
  l10: "১০। জরুরি যোগাযোগ",
  l10a: "(ক) নাম",
  l10b: "(খ) সম্পর্ক",
  l10c: "(গ) ঠিকানা",
  l10d: "(ঘ) মোবাইল নম্বর",
  // 11
  l11: "১১। পরিবার / মেসের সদস্যদের বিবরণ",
  mhSerial: "ক্রঃ নং",
  mhName: "নাম",
  mhAge: "বয়স",
  mhOcc: "পেশা",
  mhMobile: "মোবাইল নম্বর",
  // 12
  l12: "১২। গৃহকর্মীর তথ্য",
  l12a: "নাম",
  l12b: "জাতীয় পরিচয়পত্র নং",
  l12c: "মোবাইল নম্বর",
  l12d: "স্থায়ী ঠিকানা",
  // 13
  l13: "১৩। ড্রাইভারের তথ্য",
  l13a: "নাম",
  l13b: "জাতীয় পরিচয়পত্র নং",
  // 14-17
  l14a: "১৪। পূর্ববর্তী বাড়িওয়ালার নাম",
  l14b: "মোবাইল নম্বর",
  l15: "১৫। পূর্ববর্তী বাসা ছাড়ার কারণ",
  l16: "১৬। বর্তমান বাড়িওয়ালার নাম",
  l17: "১৭। বর্তমান বাড়িতে যে তারিখ থেকে বসবাস",
  date: "তারিখ",
  signTenant: "বাড়িওয়ালা/ভাড়াটিয়ার স্বাক্ষর",
  note: "বিঃ দ্রঃ এই ফরমের একটি কপি বাড়ির মালিক অবশ্যই সংরক্ষণ করবেন।",
};

type LabelKey = keyof typeof DEFAULT_LABELS;

const DEFAULT_MEMBER_COLS = [50, 220, 60, 160, 140];

export default function TenantInfoBlankForm() {
  const [labels, setLabels] = useState<typeof DEFAULT_LABELS>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_LABELS, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_LABELS;
  });

  const [memberCols, setMemberCols] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(COL_KEY + ":m");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === DEFAULT_MEMBER_COLS.length) return parsed;
      }
    } catch {}
    return DEFAULT_MEMBER_COLS;
  });

  useEffect(() => { document.title = "ভাড়াটিয়া নিবন্ধন ফরম"; }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(labels)); }, [labels]);
  useEffect(() => { localStorage.setItem(COL_KEY + ":m", JSON.stringify(memberCols)); }, [memberCols]);

  const setLabel = (k: LabelKey, v: string) => setLabels((prev) => ({ ...prev, [k]: v }));

  const resetAll = () => {
    if (!confirm("সব এডিট রিসেট করতে চান?")) return;
    setLabels(DEFAULT_LABELS);
    setMemberCols(DEFAULT_MEMBER_COLS);
  };

  const downloadDocx = async () => {
    const doc = buildDocx(labels, memberCols);
    const blob = await Packer.toBlob(doc);
    saveAs(blob, "ভাড়াটিয়া-নিবন্ধন-ফরম.docx");
  };

  const memberRows = Array.from({ length: 6 });

  return (
    <div className="bg-white text-black min-h-screen">
      <div className="no-print sticky top-0 z-20 bg-white border-b p-3 flex flex-wrap gap-2 justify-between items-center print:hidden">
        <div>
          <h1 className="text-lg font-semibold">ভাড়াটিয়া নিবন্ধন ফরম (এডিটেবল)</h1>
          <p className="text-xs text-muted-foreground">যেকোনো লেবেলে ক্লিক করে এডিট করুন।</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetAll}><RotateCcw className="h-4 w-4 mr-1" /> রিসেট</Button>
          <Button variant="outline" size="sm" onClick={downloadDocx}><FileDown className="h-4 w-4 mr-1" /> Word</Button>
          <Button onClick={() => window.print()} size="sm"><Printer className="h-4 w-4 mr-1" /> প্রিন্ট / PDF</Button>
        </div>
      </div>

      <div
        className="form-page print-area"
        style={{
          padding: "10mm 12mm", width: "210mm", minHeight: "297mm",
          boxSizing: "border-box", margin: "0 auto", background: "#fff",
          fontFamily: "'SolaimanLipi', 'Noto Sans Bengali', sans-serif", fontSize: 12,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: 6, marginBottom: 8 }}>
          <Editable as="h1" value={labels.buildingName} onChange={(v) => setLabel("buildingName", v)} style={{ fontSize: 20, fontWeight: 700, margin: 0 }} />
          <Editable as="div" value={labels.buildingAddress} onChange={(v) => setLabel("buildingAddress", v)} style={{ fontSize: 11, margin: "2px 0 0" }} />
          <Editable as="h2" value={labels.formTitle} onChange={(v) => setLabel("formTitle", v)} style={{ fontSize: 14, fontWeight: 700, margin: "6px 0 0" }} />
        </div>

        {/* Address row + Photo */}
        <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <Row><Line label={labels.beat} onLabelChange={(v) => setLabel("beat", v)} /><Line label={labels.ward} onLabelChange={(v) => setLabel("ward", v)} /></Row>
            <Row><Line label={labels.flat} onLabelChange={(v) => setLabel("flat", v)} /><Line label={labels.holding} onLabelChange={(v) => setLabel("holding", v)} /></Row>
            <Row><Line label={labels.road} onLabelChange={(v) => setLabel("road", v)} /><Line label={labels.area} onLabelChange={(v) => setLabel("area", v)} /></Row>
            <Line label={labels.postCode} onLabelChange={(v) => setLabel("postCode", v)} w="50%" />
          </div>
          <div style={{ width: 100, height: 120, border: "1px solid #333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, textAlign: "center", padding: 4 }}>
            <Editable as="span" value={labels.photoBox} onChange={(v) => setLabel("photoBox", v)} multiline />
          </div>
        </div>

        {/* 1-9 */}
        <Line label={labels.l1} onLabelChange={(v) => setLabel("l1", v)} />
        <Line label={labels.l2} onLabelChange={(v) => setLabel("l2", v)} />
        <Row><Line label={labels.l3a} onLabelChange={(v) => setLabel("l3a", v)} /><Line label={labels.l3b} onLabelChange={(v) => setLabel("l3b", v)} /></Row>
        <Box label={labels.l4} onLabelChange={(v) => setLabel("l4", v)} h={36} />
        <Box label={labels.l5} onLabelChange={(v) => setLabel("l5", v)} h={36} />
        <Row><Line label={labels.l6a} onLabelChange={(v) => setLabel("l6a", v)} /><Line label={labels.l6b} onLabelChange={(v) => setLabel("l6b", v)} /></Row>
        <Row><Line label={labels.l7a} onLabelChange={(v) => setLabel("l7a", v)} /><Line label={labels.l7b} onLabelChange={(v) => setLabel("l7b", v)} /></Row>
        <Line label={labels.l8} onLabelChange={(v) => setLabel("l8", v)} />
        <Line label={labels.l9} onLabelChange={(v) => setLabel("l9", v)} />

        {/* 10 Emergency */}
        <div style={{ marginTop: 4, fontWeight: 700, fontSize: 12 }}>
          <Editable as="span" value={labels.l10} onChange={(v) => setLabel("l10", v)} /> :
        </div>
        <Row><Line label={labels.l10a} onLabelChange={(v) => setLabel("l10a", v)} /><Line label={labels.l10b} onLabelChange={(v) => setLabel("l10b", v)} /></Row>
        <Row><Line label={labels.l10c} onLabelChange={(v) => setLabel("l10c", v)} /><Line label={labels.l10d} onLabelChange={(v) => setLabel("l10d", v)} /></Row>

        {/* 11 Family */}
        <div style={{ marginTop: 6, fontWeight: 700, fontSize: 12 }}>
          <Editable as="span" value={labels.l11} onChange={(v) => setLabel("l11", v)} /> :
        </div>
        <ResizableTable
          cols={memberCols}
          onColsChange={setMemberCols}
          headers={[
            { key: "mhSerial", val: labels.mhSerial },
            { key: "mhName", val: labels.mhName },
            { key: "mhAge", val: labels.mhAge },
            { key: "mhOcc", val: labels.mhOcc },
            { key: "mhMobile", val: labels.mhMobile },
          ]}
          onHeaderChange={(k, v) => setLabel(k as LabelKey, v)}
          rows={memberRows.length}
          firstColAuto={(i) => String(i + 1)}
        />

        {/* 12 Helper */}
        <div style={{ marginTop: 6, fontWeight: 700, fontSize: 12 }}>
          <Editable as="span" value={labels.l12} onChange={(v) => setLabel("l12", v)} /> :
        </div>
        <Row><Line label={labels.l12a} onLabelChange={(v) => setLabel("l12a", v)} /><Line label={labels.l12b} onLabelChange={(v) => setLabel("l12b", v)} /></Row>
        <Row><Line label={labels.l12c} onLabelChange={(v) => setLabel("l12c", v)} /><Line label={labels.l12d} onLabelChange={(v) => setLabel("l12d", v)} /></Row>

        {/* 13 Driver */}
        <div style={{ marginTop: 4, fontWeight: 700, fontSize: 12 }}>
          <Editable as="span" value={labels.l13} onChange={(v) => setLabel("l13", v)} /> :
        </div>
        <Row><Line label={labels.l13a} onLabelChange={(v) => setLabel("l13a", v)} /><Line label={labels.l13b} onLabelChange={(v) => setLabel("l13b", v)} /></Row>

        {/* 14-17 */}
        <Row><Line label={labels.l14a} onLabelChange={(v) => setLabel("l14a", v)} /><Line label={labels.l14b} onLabelChange={(v) => setLabel("l14b", v)} /></Row>
        <Box label={labels.l15} onLabelChange={(v) => setLabel("l15", v)} h={28} />
        <Line label={labels.l16} onLabelChange={(v) => setLabel("l16", v)} />
        <Line label={labels.l17} onLabelChange={(v) => setLabel("l17", v)} />

        {/* Signature */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
          <div style={{ width: "40%", fontSize: 12 }}>
            <Editable as="span" value={labels.date} onChange={(v) => setLabel("date", v)} /> : ___________________
          </div>
          <div style={{ width: "45%", textAlign: "center" }}>
            <div style={{ borderTop: "1px solid #000", paddingTop: 4, fontSize: 12, marginTop: 24 }}>
              <Editable as="span" value={labels.signTenant} onChange={(v) => setLabel("signTenant", v)} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, fontStyle: "italic", fontSize: 10 }}>
          <Editable as="span" value={labels.note} onChange={(v) => setLabel("note", v)} />
        </div>
      </div>

      <style>{`
        .editable { outline: none; cursor: text; border-radius: 2px; padding: 0 2px; }
        .editable:hover { background: #fff8c5; }
        .editable:focus { background: #fff3a3; box-shadow: 0 0 0 1px #c9a227; }
        .col-resizer { position: absolute; top: 0; right: -3px; width: 6px; height: 100%; cursor: col-resize; z-index: 5; }
        .col-resizer:hover { background: rgba(59,130,246,.3); }
        @page { size: A4; margin: 8mm; }
        @media print {
          html, body { background: #fff !important; }
          .no-print { display: none !important; }
          .form-page { width: 210mm !important; min-height: auto !important; padding: 0 !important; margin: 0 auto !important; box-shadow: none !important; }
          .editable:hover, .editable:focus { background: transparent !important; box-shadow: none !important; }
          .col-resizer { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ------------------------ Sub components ------------------------ */

function Editable({
  as = "span", value, onChange, style, multiline = false,
}: {
  as?: "span" | "h1" | "h2" | "h3" | "div";
  value: string;
  onChange: (v: string) => void;
  style?: React.CSSProperties;
  multiline?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) ref.current.innerText = value;
  }, [value]);
  const Tag = as as any;
  return (
    <Tag
      ref={ref as any}
      className="editable"
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={(e: any) => onChange(e.currentTarget.innerText)}
      onKeyDown={(e: any) => {
        if (!multiline && e.key === "Enter") { e.preventDefault(); (e.currentTarget as HTMLElement).blur(); }
      }}
      style={style}
    >
      {value}
    </Tag>
  );
}

function Line({ label, onLabelChange, w = "100%" }: { label: string; onLabelChange: (v: string) => void; w?: string }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-end", width: w, marginBottom: 4 }}>
      <span style={{ whiteSpace: "nowrap", fontSize: 12, fontWeight: 600 }}>
        <Editable as="span" value={label} onChange={onLabelChange} />:
      </span>
      <span style={{ flex: 1, borderBottom: "1px dotted #333", height: 16 }} />
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 12 }}>{
    Array.isArray(children)
      ? children.map((c, i) => <div key={i} style={{ flex: 1 }}>{c}</div>)
      : <div style={{ flex: 1 }}>{children}</div>
  }</div>;
}

function Box({ label, onLabelChange, h = 60 }: { label: string; onLabelChange: (v: string) => void; h?: number }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
        <Editable as="span" value={label} onChange={onLabelChange} />:
      </div>
      <div style={{ border: "1px solid #333", height: h, borderRadius: 2 }} />
    </div>
  );
}

function ResizableTable({
  cols, onColsChange, headers, onHeaderChange, rows, firstColAuto,
}: {
  cols: number[];
  onColsChange: (c: number[]) => void;
  headers: { key: string; val: string }[];
  onHeaderChange: (key: string, value: string) => void;
  rows: number;
  firstColAuto?: (i: number) => string;
}) {
  const startResize = (idx: number, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = cols[idx];
    const onMove = (ev: MouseEvent) => {
      const next = Math.max(30, startW + (ev.clientX - startX));
      const newCols = [...cols]; newCols[idx] = next; onColsChange(newCols);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div style={{ overflowX: "auto", marginTop: 2 }}>
      <table style={{ borderCollapse: "collapse", fontSize: 11, tableLayout: "fixed", width: "100%" }}>
        <colgroup>
          {cols.map((w, i) => <col key={i} style={{ width: w }} />)}
        </colgroup>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            {headers.map((h, i) => (
              <th key={h.key} style={{ ...cellHead, position: "relative" }}>
                <Editable as="span" value={h.val} onChange={(v) => onHeaderChange(h.key, v)} />
                {i < cols.length - 1 && <span className="col-resizer" onMouseDown={(e) => startResize(i, e)} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {cols.map((_, c) => (
                <td key={c} style={cell}>{c === 0 && firstColAuto ? firstColAuto(r) : ""}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const cell: React.CSSProperties = { border: "1px solid #333", height: 24, padding: 2, verticalAlign: "top" };
const cellHead: React.CSSProperties = { border: "1px solid #333", padding: 4, textAlign: "left", fontWeight: 700 };

/* ------------------------ Word (.docx) builder ------------------------ */

function buildDocx(L: typeof DEFAULT_LABELS, memberCols: number[]): Document {
  const p = (text: string, opts: { bold?: boolean; size?: number; align?: any; spacing?: number } = {}) =>
    new Paragraph({
      alignment: opts.align,
      spacing: { after: opts.spacing ?? 80 },
      children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? 22 })],
    });

  const lineRow = (label: string) =>
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: `${label}: `, bold: true, size: 22 }),
        new TextRun({ text: "_".repeat(70), size: 22 }),
      ],
    });

  const sectionHeader = (text: string) =>
    new Paragraph({
      shading: { type: "clear" as any, fill: "DDDDDD" },
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text, bold: true, size: 22 })],
    });

  const toDxa = (pxArr: number[]) => {
    const totalPx = pxArr.reduce((a, b) => a + b, 0);
    const targetDxa = 9000;
    return pxArr.map((px) => Math.round((px / totalPx) * targetDxa));
  };

  const buildTable = (headers: string[], colsPx: number[], rows: number) => {
    const cols = toDxa(colsPx);
    const totalW = cols.reduce((a, b) => a + b, 0);
    const border = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
    const cellBorders = { top: border, bottom: border, left: border, right: border };

    const headerRow = new TableRow({
      tableHeader: true,
      children: headers.map((h, i) =>
        new TableCell({
          width: { size: cols[i], type: WidthType.DXA },
          borders: cellBorders,
          shading: { type: "clear" as any, fill: "EEEEEE" },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20 })] })],
        })),
    });

    const bodyRows = Array.from({ length: rows }).map((_, r) =>
      new TableRow({
        children: cols.map((w, c) =>
          new TableCell({
            width: { size: w, type: WidthType.DXA },
            borders: cellBorders,
            children: [new Paragraph({ children: [new TextRun({ text: c === 0 ? String(r + 1) : " ", size: 20 })] })],
          })),
      }));

    return new Table({ width: { size: totalW, type: WidthType.DXA }, columnWidths: cols, rows: [headerRow, ...bodyRows] });
  };

  return new Document({
    styles: { default: { document: { run: { font: "Nirmala UI", size: 22 } } } },
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 600, right: 600, bottom: 600, left: 600 } } },
        children: [
          p(L.buildingName, { bold: true, size: 30, align: AlignmentType.CENTER, spacing: 40 }),
          p(L.buildingAddress, { size: 20, align: AlignmentType.CENTER, spacing: 60 }),
          p(L.formTitle, { bold: true, size: 24, align: AlignmentType.CENTER, spacing: 160 }),

          lineRow(L.beat), lineRow(L.ward), lineRow(L.flat), lineRow(L.holding),
          lineRow(L.road), lineRow(L.area), lineRow(L.postCode),

          lineRow(L.l1), lineRow(L.l2), lineRow(L.l3a), lineRow(L.l3b),
          lineRow(L.l4), lineRow(L.l5),
          lineRow(L.l6a), lineRow(L.l6b),
          lineRow(L.l7a), lineRow(L.l7b),
          lineRow(L.l8), lineRow(L.l9),

          sectionHeader(L.l10),
          lineRow(L.l10a), lineRow(L.l10b), lineRow(L.l10c), lineRow(L.l10d),

          sectionHeader(L.l11),
          buildTable([L.mhSerial, L.mhName, L.mhAge, L.mhOcc, L.mhMobile], memberCols, 6),

          sectionHeader(L.l12),
          lineRow(L.l12a), lineRow(L.l12b), lineRow(L.l12c), lineRow(L.l12d),

          sectionHeader(L.l13),
          lineRow(L.l13a), lineRow(L.l13b),

          lineRow(L.l14a), lineRow(L.l14b),
          lineRow(L.l15), lineRow(L.l16), lineRow(L.l17),

          new Paragraph({ children: [new TextRun(" ")], spacing: { before: 300 } }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "________________________", size: 22 })],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: L.signTenant, size: 20 })],
          }),
          new Paragraph({
            spacing: { before: 200 },
            children: [new TextRun({ text: L.note, italics: true, size: 18 })],
          }),
        ],
      },
    ],
  });
}
