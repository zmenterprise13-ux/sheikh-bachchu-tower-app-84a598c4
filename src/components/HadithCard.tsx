import { useMemo, useState } from "react";
import { BookOpen, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type Hadith = { text: string; ref: string };

const HADITHS: Hadith[] = [
  { text: "নিশ্চয়ই সকল কাজের ফলাফল নিয়তের উপর নির্ভর করে।", ref: "সহিহ বুখারি ১" },
  { text: "তোমাদের মধ্যে সে-ই উত্তম, যে কুরআন শেখে এবং অন্যকে শেখায়।", ref: "সহিহ বুখারি ৫০২৭" },
  { text: "মুসলিম সে-ই, যার জিহ্বা ও হাত থেকে অন্য মুসলিমরা নিরাপদ থাকে।", ref: "সহিহ বুখারি ১০" },
  { text: "তোমরা একে অপরকে ভালোবাসা ছাড়া পরিপূর্ণ ঈমানদার হতে পারবে না।", ref: "সহিহ মুসলিম ৫৪" },
  { text: "যে ব্যক্তি আল্লাহ ও পরকালে বিশ্বাস রাখে, সে যেন ভালো কথা বলে অথবা চুপ থাকে।", ref: "সহিহ বুখারি ৬০১৮" },
  { text: "দয়া যে বস্তুতে থাকে, তা সৌন্দর্যময় করে; আর যে বস্তু থেকে উঠিয়ে নেওয়া হয়, তা কুৎসিত করে দেয়।", ref: "সহিহ মুসলিম ২৫৯৪" },
  { text: "সবচেয়ে উত্তম মানুষ সে, যে মানুষের জন্য বেশি উপকারী।", ref: "মু’জামুল আওসাত" },
  { text: "প্রতিটি ভালো কাজই সদকা।", ref: "সহিহ বুখারি ৬০২১" },
  { text: "নিশ্চয়ই আল্লাহ ধৈর্যশীলদের সঙ্গে আছেন।", ref: "সূরা বাকারা ১৫৩" },
  { text: "যে নিজের জন্য যা পছন্দ করে, ভাইয়ের জন্যও তা পছন্দ না করা পর্যন্ত কেউ পরিপূর্ণ ঈমানদার হতে পারে না।", ref: "সহিহ বুখারি ১৩" },
  { text: "তোমরা মানুষের প্রতি দয়া করো, আল্লাহ তোমাদের প্রতি দয়া করবেন।", ref: "সুনানে আবু দাউদ ৪৯৪১" },
  { text: "হাসিমুখে ভাইয়ের সাথে সাক্ষাৎ করাও সদকা।", ref: "জামে তিরমিজি ১৯৭০" },
  { text: "যে আল্লাহর উপর ভরসা করে, আল্লাহ তার জন্য যথেষ্ট।", ref: "সূরা তালাক ৩" },
  { text: "পরিচ্ছন্নতা ঈমানের অর্ধেক।", ref: "সহিহ মুসলিম ২২৩" },
  { text: "মা-বাবার সন্তুষ্টিতেই আল্লাহর সন্তুষ্টি, আর মা-বাবার অসন্তুষ্টিতেই আল্লাহর অসন্তুষ্টি।", ref: "জামে তিরমিজি ১৮৯৯" },
  { text: "সবচেয়ে প্রিয় আমল হলো ছোট হলেও যা নিয়মিত করা হয়।", ref: "সহিহ বুখারি ৬৪৬৪" },
  { text: "প্রতিবেশীর সাথে সদাচরণ করো, তুমি প্রকৃত মুমিন হবে।", ref: "জামে তিরমিজি ২৩০৫" },
  { text: "মিথ্যা থেকে দূরে থাকো, কেননা মিথ্যা পাপের দিকে নিয়ে যায়।", ref: "সহিহ বুখারি ৬০৯৪" },
  { text: "যে অন্যের দোষ ঢেকে রাখে, কিয়ামতের দিন আল্লাহ তার দোষ ঢেকে রাখবেন।", ref: "সহিহ মুসলিম ২৫৮০" },
  { text: "দোয়াই ইবাদতের মূল।", ref: "জামে তিরমিজি ৩৩৭১" },
];

export function HadithCard() {
  const initial = useMemo(() => Math.floor(Math.random() * HADITHS.length), []);
  const [idx, setIdx] = useState(initial);
  const h = HADITHS[idx];

  const next = () => {
    let n = Math.floor(Math.random() * HADITHS.length);
    if (n === idx) n = (n + 1) % HADITHS.length;
    setIdx(n);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/20 p-4 sm:p-5 animate-slide-up-fade",
        "bg-gradient-to-br from-primary/[0.08] via-card to-card shadow-soft"
      )}
      style={{ animationDelay: "80ms" }}
    >
      {/* decorative orb */}
      <div aria-hidden className="pointer-events-none absolute -top-12 -right-10 h-32 w-32 rounded-full bg-primary/15 blur-3xl animate-float-slow" />
      {/* shimmer */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-y-0 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 animate-shimmer" />
      </div>

      <div className="relative flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-sm ring-1 ring-primary/20">
          <BookOpen className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">আজকের হাদিস</span>
            <button
              onClick={next}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-primary transition-colors"
              aria-label="পরবর্তী হাদিস"
            >
              <RefreshCw className="h-3 w-3" />
              পরবর্তী
            </button>
          </div>
          <p
            key={idx}
            className="text-sm sm:text-[15px] leading-relaxed text-foreground font-medium animate-fade-in"
          >
            “{h.text}”
          </p>
          <div className="mt-1.5 text-[11px] text-muted-foreground italic">— {h.ref}</div>
        </div>
      </div>
    </div>
  );
}
