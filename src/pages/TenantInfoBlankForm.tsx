import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

/**
 * Printable blank tenant info form — designed for hand fill-up.
 * Users can print directly or "Save as PDF" from browser print dialog.
 */
export default function TenantInfoBlankForm() {
  useEffect(() => {
    document.title = "ভাড়াটিয়া তথ্য ফরম";
  }, []);

  const Line = ({ label, w = "100%" }: { label: string; w?: string }) => (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-end", width: w, marginBottom: 6 }}>
      <span style={{ whiteSpace: "nowrap", fontSize: 12, fontWeight: 600 }}>{label}:</span>
      <span style={{ flex: 1, borderBottom: "1px dotted #333", height: 18 }} />
    </div>
  );

  const Box = ({ label, h = 60 }: { label: string; h?: number }) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{label}:</div>
      <div style={{ border: "1px solid #333", height: h, borderRadius: 2 }} />
    </div>
  );

  const memberRows = Array.from({ length: 6 });
  const childRows = Array.from({ length: 4 });

  return (
    <div className="bg-white text-black min-h-screen">
      <div className="no-print sticky top-0 bg-white border-b p-3 flex justify-between items-center print:hidden">
        <h1 className="text-lg font-semibold">ভাড়াটিয়া তথ্য ফরম (ফাঁকা)</h1>
        <Button onClick={() => window.print()} size="sm">
          <Printer className="h-4 w-4 mr-1" /> প্রিন্ট / PDF সেভ
        </Button>
      </div>

      <div className="form-page print-area" style={{ padding: 24, maxWidth: 800, margin: "0 auto", fontFamily: "'SolaimanLipi', 'Noto Sans Bengali', sans-serif" }}>
        <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: 8, marginBottom: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>শেখ বাচ্চু টাওয়ার</h1>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 4 }}>ভাড়াটিয়া তথ্য হালনাগাদ ফরম</h2>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <Line label="ফ্ল্যাট নং" />
            <Line label="তারিখ" />
            <Line label="প্রবেশের তারিখ" />
          </div>
          <div style={{ width: 110, height: 130, border: "1px solid #333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, textAlign: "center" }}>
            ছবি<br />(পাসপোর্ট সাইজ)
          </div>
        </div>

        <h3 style={{ fontSize: 13, fontWeight: 700, background: "#eee", padding: 4, marginTop: 8 }}>ক. ভাড়াটিয়ার ব্যক্তিগত তথ্য</h3>
        <Line label="নাম (বাংলা)" />
        <Line label="নাম (English)" />
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}><Line label="পিতার নাম" /></div>
          <div style={{ flex: 1 }}><Line label="মাতার নাম" /></div>
        </div>
        <Line label="স্বামী/স্ত্রীর নাম" />
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}><Line label="মোবাইল নং" /></div>
          <div style={{ flex: 1 }}><Line label="জরুরি যোগাযোগ" /></div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}><Line label="ইমেইল" /></div>
          <div style={{ flex: 1 }}><Line label="NID নং" /></div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}><Line label="পেশা" /></div>
          <div style={{ flex: 1 }}><Line label="কর্মস্থল" /></div>
        </div>
        <Box label="স্থায়ী ঠিকানা" h={50} />
        <Box label="বর্তমান ঠিকানা" h={40} />

        <h3 style={{ fontSize: 13, fontWeight: 700, background: "#eee", padding: 4, marginTop: 8 }}>খ. পরিবারের সদস্যবৃন্দ</h3>
        <Line label="মোট সদস্য সংখ্যা" w="50%" />
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginTop: 4 }}>
          <thead>
            <tr style={{ background: "#f0f0f0" }}>
              <th style={cellHead}>ক্রম</th>
              <th style={cellHead}>নাম</th>
              <th style={cellHead}>সম্পর্ক</th>
              <th style={cellHead}>বয়স</th>
              <th style={cellHead}>লিঙ্গ</th>
              <th style={cellHead}>পেশা / কী করে</th>
              <th style={cellHead}>শিক্ষা / প্রতিষ্ঠান</th>
              <th style={cellHead}>বিবাহিত?</th>
              <th style={cellHead}>মোবাইল</th>
            </tr>
          </thead>
          <tbody>
            {memberRows.map((_, i) => (
              <tr key={i}>
                <td style={cell}>{i + 1}</td>
                <td style={cell}></td>
                <td style={cell}></td>
                <td style={cell}></td>
                <td style={cell}></td>
                <td style={cell}></td>
                <td style={cell}></td>
                <td style={cell}></td>
                <td style={cell}></td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 style={{ fontSize: 13, fontWeight: 700, background: "#eee", padding: 4, marginTop: 12 }}>গ. বিবাহিত সদস্যদের সন্তানদের তথ্য</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "#f0f0f0" }}>
              <th style={cellHead}>ক্রম</th>
              <th style={cellHead}>পিতা/মাতার নাম</th>
              <th style={cellHead}>সন্তানের নাম</th>
              <th style={cellHead}>বয়স</th>
              <th style={cellHead}>পড়াশোনা / কী করে</th>
            </tr>
          </thead>
          <tbody>
            {childRows.map((_, i) => (
              <tr key={i}>
                <td style={cell}>{i + 1}</td>
                <td style={cell}></td>
                <td style={cell}></td>
                <td style={cell}></td>
                <td style={cell}></td>
              </tr>
            ))}
          </tbody>
        </table>

        <Box label="অন্যান্য মন্তব্য" h={50} />

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32 }}>
          <div style={{ textAlign: "center", width: "40%" }}>
            <div style={{ borderTop: "1px solid #000", paddingTop: 4, fontSize: 12 }}>ভাড়াটিয়ার স্বাক্ষর</div>
          </div>
          <div style={{ textAlign: "center", width: "40%" }}>
            <div style={{ borderTop: "1px solid #000", paddingTop: 4, fontSize: 12 }}>কর্তৃপক্ষের স্বাক্ষর</div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4; margin: 12mm; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}

const cell: React.CSSProperties = { border: "1px solid #333", height: 28, padding: 2 };
const cellHead: React.CSSProperties = { border: "1px solid #333", padding: 4, textAlign: "left", fontWeight: 700 };
