// Copies build output (static assets) into the standalone dir so prod :3001
// can serve /_next/static/* and public/* — Next.js standalone does NOT ship
// these by default; they must be copied after `next build`.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const standaloneRoot = path.join(root, ".next-prod", "standalone");

// 1) .next-prod/static -> standalone/.next-prod/static
const staticSrc = path.join(root, ".next-prod", "static");
const staticDst = path.join(standaloneRoot, ".next-prod", "static");
if (existsSync(staticSrc)) {
  mkdirSync(path.dirname(staticDst), { recursive: true });
  rmSync(staticDst, { recursive: true, force: true });
  cpSync(staticSrc, staticDst, { recursive: true });
  console.log(`copied ${staticSrc} -> ${staticDst}`);
} else {
  console.log(`skip: ${staticSrc} not found`);
}

// 2) public -> standalone/public
const pubSrc = path.join(root, "public");
const pubDst = path.join(standaloneRoot, "public");
if (existsSync(pubSrc)) {
  mkdirSync(standaloneRoot, { recursive: true });
  rmSync(pubDst, { recursive: true, force: true });
  cpSync(pubSrc, pubDst, { recursive: true });
  console.log(`copied ${pubSrc} -> ${pubDst}`);
} else {
  console.log(`skip: ${pubSrc} not found`);
}

console.log("standalone assets copy done");
