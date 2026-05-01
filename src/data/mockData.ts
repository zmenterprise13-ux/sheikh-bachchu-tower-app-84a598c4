// Mock data for Sheikh Bachchu Tower demo. Replace with Lovable Cloud later.

export type FlatStatus = "paid" | "unpaid" | "partial";
export type Role = "admin" | "owner";

export interface Flat {
  id: string;
  flatNo: string;       // e.g., "A-1", "B-3"
  floor: number;
  ownerName: string;
  ownerNameBn: string;
  phone: string;
  size: number;         // sqft
  serviceCharge: number;
  gasBill: number;
  parking: number;
  isOccupied: boolean;
}

export interface Bill {
  id: string;
  flatId: string;
  month: string;        // "2026-04"
  serviceCharge: number;
  gasBill: number;
  parking: number;
  total: number;
  paidAmount: number;
  status: FlatStatus;
  generatedAt: string;
  paidAt?: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;     // translation key
  description: string;
  amount: number;
}

export interface Notice {
  id: string;
  title: string;
  titleBn: string;
  body: string;
  bodyBn: string;
  date: string;
  important?: boolean;
}

const firstNamesEn = ["Karim","Rahim","Hasan","Salim","Jamal","Faruk","Anwar","Reza","Tareq","Imran","Shafiq","Nadim","Mahbub","Sohel","Rana","Babul","Arif","Kamal","Selim","Mizan"];
const firstNamesBn = ["করিম","রহিম","হাসান","সলিম","জামাল","ফারুক","আনোয়ার","রেজা","তারেক","ইমরান","শফিক","নাদিম","মাহবুব","সোহেল","রানা","বাবুল","আরিফ","কামাল","সেলিম","মিজান"];
const lastEn = ["Ahmed","Khan","Hossain","Rahman","Islam","Chowdhury","Mia","Sarker","Talukder","Hoque"];
const lastBn = ["আহমেদ","খান","হোসেন","রহমান","ইসলাম","চৌধুরী","মিয়া","সরকার","তালুকদার","হক"];

function randPhone() {
  const n = Math.floor(10000000 + Math.random() * 89999999);
  return `01${Math.floor(3 + Math.random() * 7)}${n.toString().slice(0, 8)}`;
}

// Generate 60 flats — 10 floors × 6 flats (A1..A3, B1..B3)
export const FLATS: Flat[] = (() => {
  const list: Flat[] = [];
  let seed = 1;
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let floor = 1; floor <= 10; floor++) {
    for (let unit = 1; unit <= 6; unit++) {
      const block = unit <= 3 ? "A" : "B";
      const num = ((unit - 1) % 3) + 1;
      const flatNo = `${floor}${block}-${num}`;
      const size = unit % 2 === 0 ? 1450 : 1250;
      const occupied = rng() > 0.08;
      const idx = Math.floor(rng() * firstNamesEn.length);
      const lidx = Math.floor(rng() * lastEn.length);
      list.push({
        id: `flat-${floor}-${unit}`,
        flatNo,
        floor,
        ownerName: `${firstNamesEn[idx]} ${lastEn[lidx]}`,
        ownerNameBn: `${firstNamesBn[idx]} ${lastBn[lidx]}`,
        phone: randPhone(),
        size,
        serviceCharge: size === 1450 ? 4500 : 3800,
        gasBill: 1080,
        parking: occupied && rng() > 0.4 ? 1500 : 0,
        isOccupied: occupied,
      });
    }
  }
  return list;
})();

// Current month
export const CURRENT_MONTH = "2026-04";

// Generate bills for current month — most paid, some unpaid/partial
export const BILLS: Bill[] = FLATS.map((f, i) => {
  const total = f.serviceCharge + f.gasBill + f.parking;
  let status: FlatStatus = "paid";
  let paidAmount = total;
  if (!f.isOccupied) {
    status = "unpaid";
    paidAmount = 0;
  } else if (i % 9 === 0) {
    status = "unpaid";
    paidAmount = 0;
  } else if (i % 13 === 0) {
    status = "partial";
    paidAmount = Math.round(total * 0.5);
  }
  return {
    id: `bill-${f.id}-${CURRENT_MONTH}`,
    flatId: f.id,
    month: CURRENT_MONTH,
    serviceCharge: f.serviceCharge,
    gasBill: f.gasBill,
    parking: f.parking,
    total,
    paidAmount,
    status,
    generatedAt: `${CURRENT_MONTH}-01`,
    paidAt: status === "paid" ? `${CURRENT_MONTH}-${String(5 + (i % 20)).padStart(2, "0")}` : undefined,
  };
});

export const EXPENSES: Expense[] = [
  { id: "e1", date: `${CURRENT_MONTH}-03`, category: "caretakerSalary", description: "Caretaker monthly salary", amount: 18000 },
  { id: "e2", date: `${CURRENT_MONTH}-03`, category: "security", description: "Security guards (3 shifts)", amount: 36000 },
  { id: "e3", date: `${CURRENT_MONTH}-05`, category: "cleaning", description: "Cleaning staff & supplies", amount: 12000 },
  { id: "e4", date: `${CURRENT_MONTH}-08`, category: "electricity", description: "Common area electricity bill", amount: 14500 },
  { id: "e5", date: `${CURRENT_MONTH}-10`, category: "waterPump", description: "Water pump maintenance + diesel", amount: 6800 },
  { id: "e6", date: `${CURRENT_MONTH}-15`, category: "liftMaintenance", description: "Quarterly lift servicing", amount: 9500 },
  { id: "e7", date: `${CURRENT_MONTH}-22`, category: "repair", description: "Rooftop water tank repair", amount: 7200 },
  { id: "e8", date: `${CURRENT_MONTH}-25`, category: "others", description: "Stationery & misc.", amount: 1800 },
];

export const NOTICES: Notice[] = [
  {
    id: "n1",
    title: "Water tank cleaning on Friday",
    titleBn: "শুক্রবার পানির ট্যাংক পরিষ্কার",
    body: "Water supply will be off from 10 AM to 2 PM on Friday for tank cleaning. Please store water in advance.",
    bodyBn: "ট্যাংক পরিষ্কারের জন্য শুক্রবার সকাল ১০টা থেকে দুপুর ২টা পর্যন্ত পানি সরবরাহ বন্ধ থাকবে। আগে থেকে পানি সংরক্ষণ করুন।",
    date: `${CURRENT_MONTH}-20`,
    important: true,
  },
  {
    id: "n2",
    title: "April service charge — pay by 10th",
    titleBn: "এপ্রিল মাসের সার্ভিস চার্জ — ১০ তারিখের মধ্যে পরিশোধ",
    body: "Kindly pay your April service charge and gas bill by the 10th to avoid late fees.",
    bodyBn: "বিলম্ব ফি এড়াতে অনুগ্রহ করে ১০ তারিখের মধ্যে এপ্রিলের সার্ভিস চার্জ ও গ্যাস বিল পরিশোধ করুন।",
    date: `${CURRENT_MONTH}-02`,
  },
  {
    id: "n3",
    title: "Lift servicing scheduled",
    titleBn: "লিফট সার্ভিসিং নির্ধারিত",
    body: "Quarterly lift servicing will be conducted on the 28th. Lifts may be temporarily unavailable.",
    bodyBn: "২৮ তারিখে ত্রৈমাসিক লিফট সার্ভিসিং করা হবে। সাময়িকভাবে লিফট বন্ধ থাকতে পারে।",
    date: `${CURRENT_MONTH}-25`,
  },
];

// The "logged in" owner for owner-view demo
export const DEMO_OWNER_FLAT_ID = "flat-3-2";
