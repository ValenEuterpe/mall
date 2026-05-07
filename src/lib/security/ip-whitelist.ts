// src/lib/security/ip-whitelist.ts

import { AUTH_CONFIG } from "@/lib/config/auth.config";

const config = AUTH_CONFIG.mallOwner;

/**
 * Check if IP is allowed based on whitelist configuration
 */
export function isIpAllowed(clientIp: string): boolean {
    // If no whitelist configured, allow all
    if (!config.ipWhitelistEnabled || config.allowedIps.length === 0) {
        return true;
    }

    // Unknown IP is not allowed when whitelist is enabled
    if (clientIp === "unknown") {
        return false;
    }

    // Check exact match
    if (config.allowedIps.includes(clientIp)) {
        return true;
    }

    // Check CIDR ranges
    for (const allowedIp of config.allowedIps) {
        if (allowedIp.includes("/")) {
            if (isIpInCidr(clientIp, allowedIp)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Check if IP is in CIDR range (IPv4)
 */
export function isIpInCidr(ip: string, cidr: string): boolean {
    try {
        const [range, bits] = cidr.split("/");
        const mask = ~(Math.pow(2, 32 - parseInt(bits, 10)) - 1);

        const ipNum = ip
            .split(".")
            .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
        const rangeNum = range
            .split(".")
            .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);

        return (ipNum & mask) === (rangeNum & mask);
    } catch {
        return false;
    }
}

/**
 * Get whitelist status for logging
 */
export function getWhitelistStatus(): {
    enabled: boolean;
    count: number;
} {
    return {
        enabled: config.ipWhitelistEnabled,
        count: config.allowedIps.length,
    };
}