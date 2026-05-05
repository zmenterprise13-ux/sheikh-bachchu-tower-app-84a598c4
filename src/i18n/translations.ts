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
  flatsTable: { bn: "ফ্ল্যাট টেবিল", en: "Flats Table" },
  ownersDirectory: { bn: "মালিক তালিকা", en: "Owners List" },
  buildingOverview: { bn: "বিল্ডিং সারসংক্ষেপ", en: "Building Overview" },
  building3D: { bn: "৩ডি ভিউ", en: "3D View" },
  shops: { bn: "দোকান", en: "Shops" },
  parkingNav: { bn: "পার্কিং", en: "Parking" },
  dues: { bn: "বকেয়া ও বিল", en: "Dues & Bills" },
 expenses: { bn: "খরচ", en: "Expenses" },
  loans: { bn: "লোন", en: "Loans" },
  committee: { bn: "কমিটি", en: "Committee" },
  tenantInfo: { bn: "ভাড়াটিয়া তথ্য", en: "Tenant Info" },
  reports: { bn: "মাসিক রিপোর্ট", en: "Monthly Reports" },
  notices: { bn: "নোটিশ", en: "Notices" },
  myDues: { bn: "আমার বকেয়া", en: "My Dues" },
 myPayments: { bn: "পেমেন্ট হিস্ট্রি", en: "Payment History" },
myReceipts: { bn: "রিসিপট ইতিহাস", en: "Receipts" },
ownerReceipts: { bn: "মালিকদের রিসিপট", en: "Owner Receipts" },
  ledger: { bn: "লেজার", en: "Ledger" },
  reconcile: { bn: "রিকনসাইল", en: "Reconcile" },
  myLedger: { bn: "আমার লেজার", en: "My Ledger" },
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
  more: { bn: "আরও", en: "More" },
  save: { bn: "সংরক্ষণ", en: "Save" },
  cancel: { bn: "বাতিল", en: "Cancel" },
  download: { bn: "ডাউনলোড", en: "Download" },
  submit: { bn: "জমা দিন", en: "Submit" },
  approve: { bn: "অনুমোদন", en: "Approve" },
  reject: { bn: "বাতিল", en: "Reject" },
  pendingStatus: { bn: "অপেক্ষমান", en: "Pending" },
  approved: { bn: "অনুমোদিত", en: "Approved" },
  rejected: { bn: "প্রত্যাখ্যাত", en: "Rejected" },
  paymentRequests: { bn: "পেমেন্ট অনুরোধ", en: "Payment Requests" },
  submitPayment: { bn: "পেমেন্ট জমা দিন", en: "Submit Payment" },
  paymentMethod: { bn: "পেমেন্ট মাধ্যম", en: "Method" },
  reference: { bn: "রেফারেন্স / TrxID", en: "Reference / TrxID" },
  bkash: { bn: "বিকাশ", en: "bKash" },
  nagad: { bn: "নগদ", en: "Nagad" },
  rocket: { bn: "রকেট", en: "Rocket" },
  bank: { bn: "ব্যাংক", en: "Bank" },
  cash: { bn: "নগদ অর্থ", en: "Cash" },
  receipt: { bn: "রিসিপ্ট", en: "Receipt" },
  downloadReceipt: { bn: "রিসিপ্ট ডাউনলোড", en: "Download Receipt" },

  // Flat details
  flatNo: { bn: "ফ্ল্যাট নং", en: "Flat No" },
  ownerName: { bn: "ওনার", en: "Owner" },
  phone: { bn: "ফোন", en: "Phone" },
  serviceCharge: { bn: "সার্ভিস চার্জ", en: "Service Charge" },
  gasBill: { bn: "গ্যাস বিল", en: "Gas Bill" },
  parking: { bn: "পার্কিং", en: "Parking" },
  eidBonus: { bn: "ঈদ বোনাস", en: "Eid Bonus" },
  otherCharge: { bn: "অন্যান্য আদায়", en: "Other Charge" },
  otherNote: { bn: "বিবরণ", en: "Note" },
  billingSettings: { bn: "বিলিং সেটিংস", en: "Billing Settings" },
  settings: { bn: "সেটিংস", en: "Settings" },
 changePassword: { bn: "পাসওয়ার্ড পরিবর্তন", en: "Change Password" },
 myProfile: { bn: "আমার প্রোফাইল", en: "My Profile" },
  dueDay: { bn: "ডিউ-ডে", en: "Due Day" },
  status: { bn: "স্ট্যাটাস", en: "Status" },
  paid: { bn: "পরিশোধিত", en: "Paid" },
  unpaid: { bn: "অপরিশোধিত", en: "Unpaid" },
  partial: { bn: "আংশিক", en: "Partial" },
  generated: { bn: "তৈরি হয়েছে", en: "Generated" },
  failed: { bn: "ব্যর্থ", en: "Failed" },
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
  financeReport: { bn: "আয়-ব্যয় রিপোর্ট", en: "Income & Expense" },

  // Occupant / shops / parking
  occupantType: { bn: "বর্তমান বাসিন্দা", en: "Current Occupant" },
  ownerLabel: { bn: "মালিক", en: "Owner" },
  tenantLabel: { bn: "ভাড়াটিয়া", en: "Tenant" },
  occupantName: { bn: "বাসিন্দার নাম", en: "Occupant Name" },
  ownerPhoto: { bn: "মালিকের ছবি", en: "Owner Photo" },
  occupantPhoto: { bn: "বাসিন্দার ছবি", en: "Occupant Photo" },
  uploadPhoto: { bn: "ছবি আপলোড", en: "Upload Photo" },
  edit: { bn: "এডিট", en: "Edit" },
  shopNo: { bn: "দোকান নং", en: "Shop No" },
  side: { bn: "পাশ", en: "Side" },
  east: { bn: "পূর্ব", en: "East" },
  west: { bn: "পশ্চিম", en: "West" },
  rent: { bn: "ভাড়া", en: "Rent" },
  slotNo: { bn: "স্লট নং", en: "Slot No" },
  assignedTo: { bn: "বরাদ্দ", en: "Assigned to" },
  monthlyFee: { bn: "মাসিক ফি", en: "Monthly Fee" },
  unassigned: { bn: "বরাদ্দ নেই", en: "Unassigned" },

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
