import { normalizeConsoleSlug } from '../../components/console-catalog';

export function getConsoleInfo(consoleType: string) {
  const slug = normalizeConsoleSlug(consoleType);
  const known: Record<string, { label: string; icon: string }> = {
    pc: { label: 'PC', icon: '💻' },
    playstation: { label: 'PlayStation', icon: '🎮' },
    xbox: { label: 'Xbox', icon: '🎯' },
    vr_headset: { label: 'VR', icon: '🥽' },
    nintendo_switch: { label: 'Nintendo Switch', icon: '🎮' },
  };
  return known[slug] || { label: consoleType || 'Unknown platform', icon: '🎮' };
}

export function compatiblePlatforms<T extends { platform_type: string; total_consoles: number; consoles: { id: number; console_type: string }[] }>(
  platforms: T[], supportedPlatforms?: string[],
): T[] {
  const supported = new Set((supportedPlatforms || []).map(normalizeConsoleSlug));
  return platforms.map((platform) => {
    const consoles = platform.consoles.filter((console) => supported.has(normalizeConsoleSlug(console.console_type)));
    return { ...platform, consoles, total_consoles: consoles.length };
  }).filter((platform) => platform.total_consoles > 0);
}
