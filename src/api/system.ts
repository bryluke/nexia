import { authenticateRequest } from "./auth.ts";

interface ServiceInfo {
  name: string;
  status: string;
  description: string;
}

async function getSystemInfo() {
  const hostname = (
    await Bun.$`hostname`.text()
  ).trim();

  const uptime = (
    await Bun.$`uptime -p`.text()
  ).trim();

  const loadAvg = (
    await Bun.$`cat /proc/loadavg`.text()
  )
    .trim()
    .split(" ")
    .slice(0, 3)
    .join(", ");

  // Memory
  const memInfo = await Bun.$`free -m`.text();
  const memLine = memInfo.split("\n")[1]!;
  const memParts = memLine.split(/\s+/);
  const memTotal = parseInt(memParts[1]!, 10);
  const memUsed = parseInt(memParts[2]!, 10);

  // Disk
  const diskInfo = await Bun.$`df -h / --output=size,used,avail,pcent`.text();
  const diskLine = diskInfo.trim().split("\n")[1]!.trim().split(/\s+/);

  // Services
  const serviceNames = ["caddy", "nexia", "docker", "ssh"];
  const services: ServiceInfo[] = [];
  for (const name of serviceNames) {
    try {
      const result =
        await Bun.$`systemctl is-active ${name} 2>/dev/null`.text();
      const status = result.trim();
      services.push({
        name,
        status: status === "active" ? "running" : status,
        description: getServiceDescription(name),
      });
    } catch {
      services.push({ name, status: "unknown", description: getServiceDescription(name) });
    }
  }

  return {
    hostname,
    uptime,
    loadAvg,
    memory: {
      totalMb: memTotal,
      usedMb: memUsed,
      percent: Math.round((memUsed / memTotal) * 100),
    },
    disk: {
      total: diskLine[0],
      used: diskLine[1],
      available: diskLine[2],
      percent: diskLine[3],
    },
    services,
  };
}

function getServiceDescription(name: string): string {
  switch (name) {
    case "caddy":
      return "Reverse proxy, TLS";
    case "nexia":
      return "This application";
    case "docker":
      return "Container runtime";
    case "ssh":
      return "SSH server";
    default:
      return "";
  }
}

export async function handleSystemInfo(req: Request): Promise<Response> {
  if (!authenticateRequest(req))
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const info = await getSystemInfo();
    return Response.json(info);
  } catch (err: any) {
    return Response.json(
      { error: err.message || "Failed to get system info" },
      { status: 500 }
    );
  }
}
