import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

// Gjør at `next dev` fungerer med Cloudflare-bindings lokalt.
import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
