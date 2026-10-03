import assigned from "./posters.json";

const POSTERS = {
  "Midnight Local": "/posters/midnight-local.jpg",
  "Paper Planes": "/posters/paper-planes.jpg",
  "Coast Road": "/posters/coast-road.jpg",
  "Northern Lights": "/posters/northern-lights.jpg",
  "Red Signal": "/posters/red-signal.jpg",
  "Glass House": "/posters/glass-house.jpg",
  "Salt Wind": "/posters/salt-wind.jpg",
  "Night Bazaar": "/posters/night-bazaar.jpg",
  "Blue Ticket": "/posters/blue-ticket.jpg",
  "Last Bench": "/posters/last-bench.jpg",
  "Winter Radio": "/posters/winter-radio.jpg",
  "Copper Lane": "/posters/copper-lane.jpg",
  ...assigned,
};

export function posterSrc(title, remote) {
  return remote || POSTERS[title] || null;
}

const LOOKS = {
  "Midnight Local": ["#120c1e", "#7c2d12", "#f59e0b"],
  "Paper Planes": ["#082f49", "#0369a1", "#fde68a"],
  "Coast Road": ["#042f2e", "#0f766e", "#fb7185"],
  "Northern Lights": ["#1e1b4b", "#4338ca", "#6ee7b7"],
};

const FALLBACK = [
  ["#1c1917", "#9f1239", "#fda4af"],
  ["#0c4a6e", "#0369a1", "#fde047"],
  ["#3f1d12", "#c2410c", "#fed7aa"],
  ["#14532d", "#166534", "#bbf7d0"],
  ["#1e1b4b", "#6d28d9", "#ddd6fe"],
  ["#111827", "#b45309", "#fde68a"],
  ["#042f2e", "#0e7490", "#a5f3fc"],
  ["#3b0764", "#be185d", "#fbcfe8"],
];

export function palette(title) {
  if (LOOKS[title]) return LOOKS[title];
  const index = [...(title || "A")].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return FALLBACK[index % FALLBACK.length];
}
