# Sidebar Fix Plan

## সমস্যা
- `src/components/SideNav.tsx` এ `<aside className="hidden lg:block ...">` — মানে শুধু **≥1024px** ডেস্কটপে সাইডবার দেখায়।
- আপনার viewport **393px** (মোবাইল), তাই সাইডবার পুরো লুকানো। নিচে শুধু 5-item bottom `MobileNav` দেখা যায়, যেটায় সব মেনু আইটেম নেই (যেমন 