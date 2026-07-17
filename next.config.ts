import type { NextConfig } from "next";
import { withWhopAppConfig } from "@whop/react/next.config";

const nextConfig: NextConfig = {
  transpilePackages: ["@whop/react", "frosted-ui"],
};

export default withWhopAppConfig(nextConfig);
