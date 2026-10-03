import Link from "next/link";

const COLUMNS = [
  {
    title: "Movies by language",
    links: [
      ["Hindi", "/movies?language=Hindi"],
      ["English", "/movies?language=English"],
      ["Tamil", "/movies?language=Tamil"],
    ],
  },
  {
    title: "Movies by genre",
    links: [
      ["Drama", "/movies?genre=Drama"],
      ["Comedy", "/movies?genre=Comedy"],
      ["Thriller", "/movies?genre=Thriller"],
      ["Family", "/movies?genre=Family"],
    ],
  },
  {
    title: "Movies in cinemas",
    links: [
      ["Now showing", "/movies"],
      ["Upcoming movies", "/movies?status=coming_soon"],
      ["Cinemas", "/#cinemas"],
    ],
  },
  {
    title: "Live entertainment",
    links: [
      ["Stream", "/explore/stream"],
      ["Events", "/explore/events"],
      ["Plays", "/explore/plays"],
      ["Sports", "/explore/sports"],
      ["Activities", "/explore/activities"],
      ["Gift cards", "/explore/gift-cards"],
    ],
  },
  {
    title: "Help",
    links: [
      ["My bookings", "/bookings"],
      ["Offers", "/offers"],
      ["Help", "/help"],
      ["Sign in", "/login"],
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-10 bg-[#333338] text-[#b0b0b0]">
      <div className="mx-auto grid max-w-[1240px] gap-8 px-6 py-10 sm:grid-cols-2 lg:grid-cols-5">
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="text-xs font-semibold uppercase tracking-wide text-white">{column.title}</p>
            <div className="mt-3 space-y-2 text-sm">
              {column.links.map(([label, href]) => (
                <Link key={label} href={href} className="block hover:text-white">{label}</Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-[1240px] px-6 py-4 text-xs text-[#8d8d8d]">
          book<span className="text-brand">my</span>show · movie tickets for your city
        </p>
      </div>
    </footer>
  );
}
