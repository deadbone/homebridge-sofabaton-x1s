import os from 'node:os';
import net from 'node:net';

export interface LocalNetwork { address: string; netmask: string; }
const ipNumber = (ip: string): number => ip.split('.').reduce((n, octet) => ((n << 8) | Number(octet)) >>> 0, 0);
const ipString = (n: number): string => [24, 16, 8, 0].map((shift) => (n >>> shift) & 255).join('.');

export function privateIp(ip: string): boolean {
  if (net.isIP(ip) !== 4) { return false; }
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}
export function sameSubnet(ip: string, local: LocalNetwork): boolean {
  return net.isIP(ip) === 4 && (ipNumber(ip) & ipNumber(local.netmask)) === (ipNumber(local.address) & ipNumber(local.netmask));
}
export function broadcastAddress(local: LocalNetwork): string {
  return ipString((ipNumber(local.address) | ~ipNumber(local.netmask)) >>> 0);
}
export function selectAppNetwork(hubIp: string, address?: string): LocalNetwork {
  if (!privateIp(hubIp)) { throw new Error('appCompatibility requires a private LAN hub IPv4 address.'); }
  const candidates = Object.values(os.networkInterfaces()).flatMap((items) => items ?? [])
    .filter((item) => item.family === 'IPv4' && !item.internal && privateIp(item.address))
    .filter((item) => address ? item.address === address : sameSubnet(hubIp, item));
  if (candidates.length !== 1) {
    throw new Error('Cannot select one LAN interface; set appCompatibilityAddress to a local private IPv4 address.');
  }
  return { address: candidates[0].address, netmask: candidates[0].netmask };
}
