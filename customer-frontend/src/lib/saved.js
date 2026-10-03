function readList(key) {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList(key, eventName, values) {
  localStorage.setItem(key, JSON.stringify(values));
  window.dispatchEvent(new Event(eventName));
}

export function wishlistIds() {
  return readList("bms_wishlist").map(Number).filter(Boolean);
}

export function inWishlist(id) {
  return wishlistIds().includes(Number(id));
}

export function toggleWishlist(id) {
  const current = wishlistIds();
  const next = current.includes(Number(id))
    ? current.filter((item) => item !== Number(id))
    : [...current, Number(id)];
  writeList("bms_wishlist", "bms-wishlist", next);
  return next.includes(Number(id));
}

export function librarySlugs() {
  return readList("bms_library").map(String);
}

export function inLibrary(slug) {
  return librarySlugs().includes(slug);
}

export function toggleLibrary(slug) {
  const current = librarySlugs();
  const next = current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];
  writeList("bms_library", "bms-library", next);
  return next.includes(slug);
}
