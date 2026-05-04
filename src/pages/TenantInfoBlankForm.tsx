import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, FileDown, RotateCcw } from "lucide-react";
import { saveAs } from "file-saver";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
} from "docx";

/**
 * Printable + editable blank tenant info form.
 * - Inline-edit any label by clicking on it (contentEditable)
 * - Drag column borders in tables to resize
 * - Print / Save as PDF via window.print()
 * - Download as Word (.docx)
 */

const STORAGE_KEY = "tenant-blank-form-labels-v1";
const COL_KEY = "tenant-blank-form-cols-v1";

const DEFAULT_LABELS = {
  buildingName: "শেখ বাচ্চু টাওয়ার",
  formTitle: "ভাড়াটিয়া তথ্য হালনাগাদ ফরম",
  flatNo: "ফ্ল্যাট নং",
  date: "তারিখ",
  moveInDate: "প্রবেশের তারিখ",
  photoBox: "ছবি (পাসপোর্ট সাইজ)",
  sectionA: "ক. ভাড়াটিয়ার ব্যক্তিগত তথ্য",
  nameBn: "নাম (বাংলা)",
  nameEn: "নাম (English)",
  fatherName: "পিতার নাম",
  motherName: "মাতার নাম",
  spouseName: "স্বামী/স্ত্রীর নাম",
  mobile: "মোবাইল নং",
  emergency: "জরুরি যোগাযোগ",
  email: "ইমেইল",
  nid: "NID নং",
  occupation: "পেশা",
  workplace: "কর্মস্থল",
  permAddr: "স্থায়ী ঠিকানা",
  presAddr: "বর্তমান ঠিকানা",
  sectionB: "খ. পরিবারের সদস্যবৃন্দ",
  totalMembers: "মোট সদস্য সংখ্যা",
  // member table headers
  mhSerial: "ক্রম",
  mhName: "নাম",
  mhRel: "সম্পর্ক",
  mhAge: "বয়স",
  mhGender: "লিঙ্গ",
  mhOcc: "পেশা / কী করে",
  mhEdu: "শিক্ষা / প্রতিষ্ঠান",
  mhMarried: "বিবাহিত?",
  mhMobile: "মোবাইল",
  sectionC: "গ. বিবাহিত সদস্যদের সন্তানদের তথ্য",
  // child table
  chSerial: "ক্রম",
  chParent: "পিতা/মাতার নাম",
  chName: "সন্তানের নাম",
  chAge: "বয়স",
  chStudy: "পড়াশোনা / কী করে",
  remarks: "অন্যান্য মন্তব্য",
  signTenant: "ভাড়াটিয়ার স্বাক্ষর",
  signAuthority: "কর্তৃপক্ষের স্বাক্ষর",
};

type LabelKey = keyof typeof DEFAULT_LABELS;

const DEFAULT_MEMBER_COLS = [40, 130, 90, 50, 60, 130, 140, 70, 90]; // px
const DEFAULT_CHILD_COLS = [40, 160, 160, 60, 220];

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
      if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULT_MEMBER_COLS;
  });
  const [childCols, setChildCols] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(COL_KEY + ":c");
      if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULT_CHILD_COLS;
  });

  useEffect(() => {
    document.title = "ভাড়াটিয়া তথ্য ফরম";
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(labels));
  }, [labels]);
  useEffect(() => {
    localStorage.setItem(COL_KEY + ":m", JSON.stringify(memberCols));
  }, [memberCols]);
  useEffect(() => {
    localStorage.setItem(COL_KEY + ":c", JSON.stringify(childCols));
  }, [childCols]);

  const setLabel = (k: LabelKey, v: string) =>
    setLabels((prev) => ({ ...prev, [k]: v }));

  const resetAll = () => {
    if (!confirm("সব এডিট রিসেট করতে চান?")) return;
    setLabels(DEFAULT_LABELS);
    setMemberCols(DEFAULT_MEMBER_COLS);
    setChildCols(DEFAULT_CHILD_COLS);
  };

  const downloadDocx = async () => {
    const doc = buildDocx(labels, memberCols, childCols);
    const blob = await Packer.toBlob(doc);
    saveAs(blob, "ভাড়াটিয়া-তথ্য-ফরম.docx");
  };

  const memberRows = Array.from({ length: 6 });
  const childRows = Array.from({ length: 4 });

  return (
    <div className="bg-white text-black min-h-screen">
      <div className="no-print sticky top-0 z-20 bg-white border-b p-3 flex flex-wrap gap-2 justify-between items-center print:hidden">
        <div>
          <h1 className="text-lg font-semibold">ভাড়াটিয়া তথ্য ফরম (এডিটেবল)</h1>
          <p className="text-xs text-muted-foreground">
            যেকোনো লেবেলে ক্লিক করে এডিট করুন। টেবিল কলামের ডান বর্ডার টেনে রিসাইজ করুন।
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetAll}>
            <RotateCcw className="h-4 w-4 mr-1" /> রিসেট
          </Button>
          <Button variant="outline" size="sm" onClick={downloadDocx}>
            <FileDown className="h-4 w-4 mr-1" /> Word ডাউনলোড
          </Button>
          <Button onClick={() => window.print()} size="sm">
            <Printer className="h-4 w-4 mr-1" /> প্রিন্ট / PDF
          </Button>
        </div>
      </div>

      <div
        className="form-page print-area"
        style={{
          padding: 24,
          maxWidth: 820,
          margin: "0 auto",
          fontFamily: "'SolaimanLipi', 'Noto Sans Bengali', sans-serif",
        }}
      >
        <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: 8, marginBottom: 12 }}>
          <Editable
            as="h1"
            value={labels.buildingName}
            onChange={(v) => setLabel("buildingName", v)}
            style={{ fontSize: 20, fontWeight: 700, margin: 0 }}
          />
          <Editable
            as="h2"
            value={labels.formTitle}
            onChange={(v) => setLabel("formTitle", v)}
            style={{ fontSize: 14, fontWeight: 600, margin: 4 }}
          />
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <Line label={labels.flatNo} onLabelChange={(v) => setLabel("flatNo", v)} />
            <Line label={labels.date} onLabelChange={(v) => setLabel("date", v)} />
            <Line label={labels.moveInDate} onLabelChange={(v) => setLabel("moveInDate", v)} />
          </div>
          <div
            style={{
              width: 110, height: 130, border: "1px solid #333",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, textAlign: "center", padding: 4,
            }}
          >
            <Editable
              as="span"
              value={labels.photoBox}
              onChange={(v) => setLabel("photoBox", v)}
              multiline
            />
          </div>
        </div>

        <SectionHeader value={labels.sectionA} onChange={(v) => setLabel("sectionA", v)} />
        <Line label={labels.nameBn} onLabelChange={(v) => setLabel("nameBn", v)} />
        <Line label={labels.nameEn} onLabelChange={(v) => setLabel("nameEn", v)} />
        <Row>
          <Line label={labels.fatherName} onLabelChange={(v) => setLabel("fatherName", v)} />
          <Line label={labels.motherName} onLabelChange={(v) => setLabel("motherName", v)} />
        </Row>
        <Line label={labels.spouseName} onLabelChange={(v) => setLabel("spouseName", v)} />
        <Row>
          <Line label={labels.mobile} onLabelChange={(v) => setLabel("mobile", v)} />
          <Line label={labels.emergency} onLabelChange={(v) => setLabel("emergency", v)} />
        </Row>
        <Row>
          <Line label={labels.email} onLabelChange={(v) => setLabel("email", v)} />
          <Line label={labels.nid} onLabelChange={(v) => setLabel("nid", v)} />
        </Row>
        <Row>
          <Line label={labels.occupation} onLabelChange={(v) => setLabel("occupation", v)} />
          <Line label={labels.workplace} onLabelChange={(v) => setLabel("workplace", v)} />
        </Row>
        <Box label={labels.permAddr} onLabelChange={(v) => setLabel("permAddr", v)} h={50} />
        <Box label={labels.presAddr} onLabelChange={(v) => setLabel("presAddr", v)} h={40} />

        <SectionHeader value={labels.sectionB} onChange={(v) => setLabel("sectionB", v)} />
        <Line label={labels.totalMembers} onLabelChange={(v) => setLabel("totalMembers", v)} w="50%" />

        <ResizableTable
          cols={memberCols}
          onColsChange={setMemberCols}
          headers={[
            { key: "mhSerial", val: labels.mhSerial },
            { key: "mhName", val: labels.mhName },
            { key: "mhRel", val: labels.mhRel },
            { key: "mhAge", val: labels.mhAge },
            { key: "mhGender", val: labels.mhGender },
            { key: "mhOcc", val: labels.mhOcc },
            { key: "mhEdu", val: labels.mhEdu },
            { key: "mhMarried", val: labels.mhMarried },
            { key: "mhMobile", val: labels.mhMobile },
          ]}
          onHeaderChange={(k, v) => setLabel(k as LabelKey, v)}
          rows={memberRows.length}
          firstColAuto={(i) => String(i + 1)}
        />

        <SectionHeader value={labels.sectionC} onChange={(v) => setLabel("sectionC", v)} />
        <ResizableTable
          cols={childCols}
          onColsChange={setChildCols}
          headers={[
            { key: "chSerial", val: labels.chSerial },
            { key: "chParent", val: labels.chParent },
            { key: "chName", val: labels.chName },
            { key: "chAge", val: labels.chAge },
            { key: "chStudy", val: labels.chStudy },
          ]}
          onHeaderChange={(k, v) => setLabel(k as LabelKey, v)}
          rows={childRows.length}
          firstColAuto={(i) => String(i + 1)}
        />

        <Box label={labels.remarks} onLabelChange={(v) => setLabel("remarks", v)} h={50} />

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32 }}>
          <div style={{ textAlign: "center", width: "40%" }}>
            <div style={{ borderTop: "1px solid #000", paddingTop: 4, fontSize: 12 }}>
              <Editable as="span" value={labels.signTenant} onChange={(v) => setLabel("signTenant", v)} />
            </div>
          </div>
          <div style={{ textAlign: "center", width: "40%" }}>
            <div style={{ borderTop: "1px solid #000", paddingTop: 4, fontSize: 12 }}>
              <Editable as="span" value={labels.signAuthority} onChange={(v) => setLabel("signAuthority", v)} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .editable {
          outline: none;
          cursor: text;
          border-radius: 2px;
          padding: 0 2px;
        }
        .editable:hover { background: #fff8c5; }
        .editable:focus { background: #fff3a3; box-shadow: 0 0 0 1px #c9a227; }
        .col-resizer {
          position: absolute;
          top: 0;
          right: -3px;
          width: 6px;
          height: 100%;
          cursor: col-resize;
          z-index: 5;
        }
        .col-resizer:hover { background: rgba(59,130,246,.3); }
        @media print {
          .no-print { display: none !important; }
          .editable:hover, .editable:focus { background: transparent !important; box-shadow: none !important; }
          .col-resizer { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ------------------------ Sub components ------------------------ */

function Editable({
  as = "span",
  value,
  onChange,
  style,
  multiline = false,
}: {
  as?: "span" | "h1" | "h2" | "h3" | "div";
  value: string;
  onChange: (v: string) => void;
  style?: React.CSSProperties;
  multiline?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  // Keep DOM in sync only when the prop changes from outside (reset)
  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value;
    }
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
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
      }}
      style={style}
    >
      {value}
    </Tag>
  );
}

function Line({
  label,
  onLabelChange,
  w = "100%",
}: {
  label: string;
  onLabelChange: (v: string) => void;
  w?: string;
}) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-end", width: w, marginBottom: 6 }}>
      <span style={{ whiteSpace: "nowrap", fontSize: 12, fontWeight: 600 }}>
        <Editable as="span" value={label} onChange={onLabelChange} />:
      </span>
      <span style={{ flex: 1, borderBottom: "1px dotted #333", height: 18 }} />
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

function Box({
  label,
  onLabelChange,
  h = 60,
}: {
  label: string;
  onLabelChange: (v: string) => void;
  h?: number;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
        <Editable as="span" value={label} onChange={onLabelChange} />:
      </div>
      <div style={{ border: "1px solid #333", height: h, borderRadius: 2 }} />
    </div>
  );
}

function SectionHeader({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <h3 style={{ fontSize: 13, fontWeight: 700, background: "#eee", padding: 4, marginTop: 8 }}>
      <Editable as="span" value={value} onChange={onChange} />
    </h3>
  );
}

function ResizableTable({
  cols,
  onColsChange,
  headers,
  onHeaderChange,
  rows,
  firstColAuto,
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
      const newCols = [...cols];
      newCols[idx] = next;
      onColsChange(newCols);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div style={{ overflowX: "auto", marginTop: 4 }}>
      <table style={{ borderCollapse: "collapse", fontSize: 11, tableLayout: "fixed" }}>
        <colgroup>
          {cols.map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            {headers.map((h, i) => (
              <th key={h.key} style={{ ...cellHead, position: "relative" }}>
                <Editable as="span" value={h.val} onChange={(v) => onHeaderChange(h.key, v)} />
                {i < cols.length - 1 && (
                  <span className="col-resizer" onMouseDown={(e) => startResize(i, e)} />
                )}
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

const cell: React.CSSProperties = { border: "1px solid #333", height: 28, padding: 2, verticalAlign: "top" };
const cellHead: React.CSSProperties = { border: "1px solid #333", padding: 4, textAlign: "left", fontWeight: 700 };

/* ------------------------ Word (.docx) builder ------------------------ */

function buildDocx(L: typeof DEFAULT_LABELS, memberCols: number[], childCols: number[]): Document {
  const p = (text: string, opts: { bold?: boolean; size?: number; align?: any; spacing?: number } = {}) =>
    new Paragraph({
      alignment: opts.align,
      spacing: { after: opts.spacing ?? 80 },
      children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? 22 })],
    });

  const lineRow = (label: string) =>
    new Paragraph({
      tabStops: [{ type: "right" as any, position: 9000 }],
      spacing: { after: 60 },
      children: [
        new TextRun({ text: `${label}: `, bold: true, size: 22 }),
        new TextRun({
          text: "_".repeat(60),
          size: 22,
        }),
      ],
    });

  const sectionHeader = (text: string) =>
    new Paragraph({
      shading: { type: "clear" as any, fill: "DDDDDD" },
      spacing: { before: 160, after: 100 },
      children: [new TextRun({ text, bold: true, size: 24 })],
    });

  // Convert px to DXA roughly (1px ≈ 15 DXA at 96dpi) — and scale to fit US Letter ~9000 DXA
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
        })
      ),
    });

    const bodyRows = Array.from({ length: rows }).map((_, r) =>
      new TableRow({
        children: cols.map((w, c) =>
          new TableCell({
            width: { size: w, type: WidthType.DXA },
            borders: cellBorders,
            children: [new Paragraph({ children: [new TextRun({ text: c === 0 ? String(r + 1) : " ", size: 20 })] })],
          })
        ),
      })
    );

    return new Table({
      width: { size: totalW, type: WidthType.DXA },
      columnWidths: cols,
      rows: [headerRow, ...bodyRows],
    });
  };

  return new Document({
    styles: {
      default: { document: { run: { font: "Nirmala UI", size: 22 } } },
    },
    sections: [
      {
        properties: {
          page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } },
        },
        children: [
          p(L.buildingName, { bold: true, size: 32, align: AlignmentType.CENTER, spacing: 60 }),
          p(L.formTitle, { bold: true, size: 24, align: AlignmentType.CENTER, spacing: 200 }),

          lineRow(L.flatNo),
          lineRow(L.date),
          lineRow(L.moveInDate),

          sectionHeader(L.sectionA),
          lineRow(L.nameBn),
          lineRow(L.nameEn),
          lineRow(L.fatherName),
          lineRow(L.motherName),
          lineRow(L.spouseName),
          lineRow(L.mobile),
          lineRow(L.emergency),
          lineRow(L.email),
          lineRow(L.nid),
          lineRow(L.occupation),
          lineRow(L.workplace),
          lineRow(L.permAddr),
          lineRow(L.presAddr),

          sectionHeader(L.sectionB),
          lineRow(L.totalMembers),
          buildTable(
            [L.mhSerial, L.mhName, L.mhRel, L.mhAge, L.mhGender, L.mhOcc, L.mhEdu, L.mhMarried, L.mhMobile],
            memberCols,
            6
          ),

          new Paragraph({ children: [new TextRun(" ")], spacing: { before: 120 } }),
          sectionHeader(L.sectionC),
          buildTable([L.chSerial, L.chParent, L.chName, L.chAge, L.chStudy], childCols, 4),

          new Paragraph({ children: [new TextRun(" ")], spacing: { before: 120 } }),
          lineRow(L.remarks),

          new Paragraph({ children: [new TextRun(" ")], spacing: { before: 400 } }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({ text: "________________________", size: 22 }),
              new TextRun({ text: "                                       ", size: 22 }),
              new TextRun({ text: "________________________", size: 22 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({ text: L.signTenant, size: 20 }),
              new TextRun({ text: "                                                ", size: 20 }),
              new TextRun({ text: L.signAuthority, size: 20 }),
            ],
          }),
        ],
      },
    ],
  });
}
