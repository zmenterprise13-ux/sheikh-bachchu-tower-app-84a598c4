import { Download as DownloadIcon, ExternalLink } from "lucide-react";

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

/**
 * Renders notice body text with URLs converted to clickable buttons.
 * APK download links show a "Download" button; other links show "Open link".
 */
export function NoticeBody({
  text,
  lang,
  className,
}: {
  text: string;
  lang: "bn" | "en";
  className?: string;
}) {
  if (!text) return null;
  const parts = text.split(URL_REGEX);

  return (
    <div className={className}>
      {parts.map((part, i) => {
        if (URL_REGEX.test(part)) {
          // Reset regex state (since global flag is sticky on .test)
          URL_REGEX.lastIndex = 0;
          const isApk = /\.apk(\?|$)/i.test(part);
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 mr-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity break-all"
            >
              {isApk ? (
                <>
                  <DownloadIcon className="h-3.5 w-3.5 shrink-0" />
                  {lang === "bn" ? "APK ডাউনলোড করুন" : "Download APK"}
                </>
              ) : (
                <>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  {lang === "bn" ? "লিঙ্ক খুলুন" : "Open link"}
                </>
              )}
            </a>
          );
        }
        return (
          <span key={i} className="whitespace-pre-line">
            {part}
          </span>
        );
      })}
    </div>
  );
}
