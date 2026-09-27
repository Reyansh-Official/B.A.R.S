import { networkInterfaces } from "node:os";
import { headers } from "next/headers";

// On localhost, swap in this machine's Wi-Fi address so a phone scanning the QR code can reach the dev server.
export async function publicUrl(path: string): Promise<{ url: string; lan: boolean }> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const [hostname, port] = host.split(":");
  if (hostname !== "localhost" && hostname !== "127.0.0.1") return { url: `${proto}://${host}${path}`, lan: false };
  const ip = Object.values(networkInterfaces())
    .flat()
    .find((i) => i && i.family === "IPv4" && !i.internal)?.address;
  return ip ? { url: `http://${ip}${port ? `:${port}` : ""}${path}`, lan: true } : { url: `${proto}://${host}${path}`, lan: false };
}
