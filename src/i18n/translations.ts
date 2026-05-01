export type Lang = "bn" | "en";

type T = Record<string, { bn: string; en: string }>;

export const translations: T = {
  appName: { bn: "শেখ বাচ্চু টাওয়ার", en: "Sheikh Bachchu Tower" },
  appTagline: { bn: "বিল্ডিং ম্যানেজমেন্ট", en: "Building Management" },

  // Roles
  admin: { bn: "অ্যাডমিন", en: "Admin" },
  owner: { bn: "ফ্ল্যাট ওনার", en: "Flat Owner" },
  switchRole: { bn: "রোল পরিবর্তন", en: "Switch role" },
  loginAs: { bn: "লগইন করুন", en: "Login as" },

  // Nav
  dashboard: { bn: "ড্যাশবোর্ড", en: "Dashboard" },
  flats: { bn: "ফ্ল্যাট সমূহ", en: "Flats" },
  dues: { bn: "বকেয়া ও বিল", en: "Dues & Bills" },
  expenses: { bn: "খরচ", en: "Expenses" },
  reports: { bn: "মাসিক রিপোর্ট", en: "Monthly Reports" },
  notices: { bn: "নোটিশ", en: "Notices" },
  myDues: { bn: "আমার বকেয়া", en: "My Dues" },
  myPayments: { bn: "পেমেন্ট হিস্ট্রি", en: "Payment History" },
  logout: { bn: "লগআউট", en: "Logout" },

  // Dashboard stats
  totalFlats: { bn: "মোট ফ্ল্যাট", en: "Total Flats" },
  collected: { bn: "এ মাসে আদায়", en: "Collected this Month" },
  pending: { bn: "বকেয়া", en: "Pending" },
  monthlyExpense: { bn: "মাসিক খরচ", en: "Monthly Expense" },
  netBalance: { bn: "নিট ব্যালেন্স", en: "Net Balance" },
  occupied: { bn: "ভাড়া দেয়া", en: "Occupied" },

  // Actions
  generateBills: { bn: "এ মাসের বিল জেনারেট করুন", en: "Generate this month's bills" },
  addExpense: { bn: "নতুন খরচ যোগ করুন", en: "Add Expense" },
  addNotice: { bn: "নোটিশ পোস্ট করুন", en: "Post Notice" },
  markPaid: { bn: "Paid মার্ক", en: "Mark Paid" },
  payNow: { bn: "এখন পেমেন্ট করুন", en: "Pay Now" },
  viewReport: { bn: "রিপোর্ট দেখুন", en: "View Report" },
  viewAll: { bn: "সব দেখুন", en: "View All" },
  save: { bn: "সংরক্ষণ", en: "Save" },
  cancel: { bn: "বাতিল", en: "Cancel" },
  download: { bn: "ডাউনলোড", en: "Download" },

  // Flat details
  flatNo: { bn: "ফ্ল্যাট নং", en: "Flat No" },
  ownerName: { bn: "ওনার", en: "Owner" },
  phone: { bn: "ফোন", en: "Phone" },
  serviceCharge: { bn: "সার্ভিস চার্জ", en: "Service Charge" },
  gasBill: { bn: "গ্যাস বিল", en: "Gas Bill" },
  parking: { bn: "পার্কিং", en: "Parking" },
  status: { bn: "স্ট্যাটাস", en: "Status" },
  paid: { bn: "পরিশোধিত", en: "Paid" },
  unpaid: { bn: "অপরিশোধিত", en: "Unpaid" },
  partial: { bn: "আংশিক", en: "Partial" },
  amount: { bn: "টাকা", en: "Amount" },
  total: { bn: "মোট", en: "Total" },
  due: { bn: "বকেয়া", en: "Due" },
  month: { bn: "মাস", en: "Month" },
  date: { bn: "তারিখ", en: "Date" },
  category: { bn: "খাত", en: "Category" },
  description: { bn: "বিবরণ", en: "Description" },
  action: { bn: "কাজ", en: "Action" },

  // Expense categories
  cleaning: { bn: "পরিচ্ছন্নতা", en: "Cleaning" },
  security: { bn: "সিকিউরিটি", en: "Security" },
  electricity: { bn: "কমন বিদ্যুৎ", en: "Common Electricity" },
  waterPump: { bn: "পানি পাম্প", en: "Water Pump" },
  liftMaintenance: { bn: "লিফট মেইন্টেনেন্স", en: "Lift Maintenance" },
  caretakerSalary: { bn: "কেয়ারটেকার বেতন", en: "Caretaker Salary" },
  repair: { bn: "মেরামত", en: "Repair" },
  others: { bn: "অন্যান্য", en: "Others" },

  // Reports
  income: { bn: "আয়", en: "Income" },
  expense: { bn: "ব্যয়", en: "Expense" },
  balance: { bn: "ব্যালেন্স", en: "Balance" },
  monthlyReport: { bn: "মাসিক হিসাব", en: "Monthly Account" },

  // Misc
  welcome: { bn: "স্বাগতম", en: "Welcome" },
  noData: { bn: "কোনো তথ্য নেই", en: "No data available" },
  recentNotices: { bn: "সাম্প্রতিক নোটিশ", en: "Recent Notices" },
  recentActivity: { bn: "সাম্প্রতিক কার্যক্রম", en: "Recent Activity" },
  collectionRate: { bn: "আদায়ের হার", en: "Collection Rate" },
  taka: { bn: "৳", en: "৳" },
};

export type TKey = keyof typeof translations;

const bnDigits = ["০","১","২","৩","৪","৫","৬","৭","৮","৯"];
export function formatNumber(n: number, lang: Lang): string {
  const s = Math.round(n).toLocaleString("en-US");
  if (lang === "en") return s;
  return s.replace(/\d/g, (d) => bnDigits[+d]);
}

export function formatMoney(n: number, lang: Lang): string {
  return `৳ ${formatNumber(n, lang)}`;
}
