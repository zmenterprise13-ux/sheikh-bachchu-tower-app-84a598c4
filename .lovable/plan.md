## সমস্যা

`src/pages/admin/AdminDues.tsx` (বকেয়া ও বিল পেজ) এখন ডিফল্টে `new Date()` থেকে calendar-এর current month দেখায় (e.g., `2026-05`)। কিন্তু ওই মাসের বিল এখনো generate হয়নি — সর্বশেষ generated bill month হলো `2026-04`। তাই পেজ ফাঁকা দেখাচ্ছে।

ইউজার চান: ডিফল্টে **সর্বশেষ bill month** (যে মাসের বিল আছে) দেখাবে, calendar month না।

## পরিবর্তন

**File:** `src/pages/admin/AdminDues.tsx`

1. কম্পোনেন্টে নতুন state `latestBillMonth` যোগ করব (initial = calendar month fallback)।
2. Mount-এ একবার `bills` থেকে `month` কলামের MAX query করে সর্বশেষ bill month বের করব এবং সেটাকেই initial selected `month` হিসেবে set করব (যদি current selection > latest হয়)।
3. পরিবর্তন করব:
   - `month` state-এর initial value → latest bill month (লোড হওয়া পর্যন্ত skeleton/loading)।
   - `isCurrent` চেক → `month === latestBillMonth` (calendar month-এর বদলে)।
   - month input-এর `max` → `latestBillMonth`।
   - "এ মাস / This month" বাটনের ক্লিক ও label → latest bill month-এ যাবে।
4. পরের-মাস (`>`) বাটন `latestBillMonth`-এর পরে যেতে দেবে না।

## কোন ফাইল বদলাবে

- `src/pages/admin/AdminDues.tsx` — শুধু এই একটি ফাইল।

কোনো DB migration বা অন্য পেজে পরিবর্তন লাগবে না।
