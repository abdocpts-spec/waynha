import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // مجلد بناء مستقل للنسخة العامة (NEXT_DIST_DIR=.next-prod) حتى لا يتعارض مع خادم التطوير
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // تجربة الموقع من الهاتف على نفس الواي فاي، أو عبر نفق عام، أثناء التطوير
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.trycloudflare.com"],
};

export default nextConfig;
