// Slug helpers. Client slug is URL-safe lowercase. Engagement slug appends
// a 4-char random suffix so multiple engagements per client don't collide.

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const ALPHA = "abcdefghijklmnopqrstuvwxyz0123456789";

export function randomSuffix(len = 4): string {
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)];
  return s;
}

export function engagementSlug(clientSlug: string): string {
  return `${clientSlug}-${randomSuffix(4)}`;
}

export function fourDigitPasscode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}
