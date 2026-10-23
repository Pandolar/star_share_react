import React from 'react';

/**
 * 与 NiceCode 前端一致的确定性“小怪物”身份头像。
 * 种子规则沿用 nicecode：star_id 即本系统 users.id → seed = `nicecode-star-${id}`。
 * 纯本地 SVG，无额外依赖，同一用户在任何位置生成的图案完全一致。
 */

const COLORS = {
  body: ['#ff8fab', '#70d6c2', '#a98eea', '#ffd166', '#ff9f80', '#73c7f3', '#bd6ee8', '#99d98c'],
  accent: ['#ffe4ec', '#d8fff6', '#eee7ff', '#fff1b8', '#ffe1d6', '#dff4ff', '#f4dcff', '#e5ffd9'],
  background: ['#fff1f5', '#eaf8f2', '#f1edff', '#fff7df', '#fff0e8', '#eaf4ff', '#f7ecff', '#f0f7e8'],
};

const BODY_PATHS = [
  'M59 214C39 191 39 105 67 63C88 31 170 27 194 65C219 104 218 189 192 215C164 242 84 241 59 214Z',
  'M62 51H198Q218 51 218 72V211Q218 231 197 231H62Q42 231 42 210V72Q42 51 62 51Z',
  'M132 42C187 42 224 80 224 139C224 198 190 232 132 232C74 232 40 198 40 139C40 80 77 42 132 42Z',
  'M132 34C148 67 211 126 221 171C231 216 189 233 132 233C75 233 33 216 43 171C53 126 116 67 132 34Z',
  'M41 94C61 66 198 67 220 96C239 122 228 190 199 213C169 237 88 236 57 212C27 189 21 121 41 94Z',
  'M96 37C119 23 165 27 184 47C209 74 201 199 180 224C160 247 105 245 84 221C62 196 58 74 96 37Z',
  'M71 82C58 53 99 38 122 57C137 29 181 37 185 67C220 52 239 91 216 114C244 137 223 177 201 180C215 216 177 239 151 219C128 249 89 232 90 207C54 222 28 189 48 163C16 143 34 100 71 104C58 97 61 88 71 82Z',
  'M132 37L212 87L224 174L178 229H83L39 174L52 86L132 37Z',
  'M82 48C120 24 194 48 207 89C218 123 225 203 186 225C149 246 61 232 47 195C35 162 42 73 82 48Z',
  'M132 40C184 40 217 74 217 129V222L191 204L166 225L139 204L111 226L84 204L49 224V129C49 75 81 40 132 40Z',
];

const EYES = [
  '<g><circle cx="100" cy="122" r="20" fill="#fff"/><circle cx="164" cy="122" r="20" fill="#fff"/><circle cx="105" cy="126" r="9"/><circle cx="169" cy="126" r="9"/></g>',
  '<g><ellipse cx="98" cy="122" rx="15" ry="25" fill="#fff"/><ellipse cx="166" cy="122" rx="15" ry="25" fill="#fff"/><circle cx="98" cy="128" r="7"/><circle cx="166" cy="128" r="7"/></g>',
  '<g><circle cx="132" cy="120" r="34" fill="#fff"/><circle cx="138" cy="126" r="15"/><circle cx="144" cy="119" r="5" fill="#fff"/></g>',
  '<path d="M78 125Q100 99 122 125M143 125Q164 99 187 125" fill="none" stroke="#241b32" stroke-width="11" stroke-linecap="round"/>',
  '<g fill="#241b32"><circle cx="98" cy="122" r="8"/><circle cx="165" cy="122" r="8"/></g>',
  '<g><path d="M78 114L118 130M118 114L78 130M145 114L185 130M185 114L145 130" stroke="#241b32" stroke-width="8" stroke-linecap="round"/></g>',
  '<g><ellipse cx="99" cy="123" rx="24" ry="13" fill="#fff"/><ellipse cx="165" cy="123" rx="24" ry="13" fill="#fff"/><circle cx="106" cy="123" r="8"/><circle cx="172" cy="123" r="8"/></g>',
  (accent: string) => `<g><circle cx="100" cy="120" r="21" fill="${accent}" stroke="#241b32" stroke-width="6"/><circle cx="164" cy="120" r="21" fill="${accent}" stroke="#241b32" stroke-width="6"/><circle cx="100" cy="120" r="7"/><circle cx="164" cy="120" r="7"/></g>`,
  '<g fill="#fff" stroke="#241b32" stroke-width="5"><path d="M77 128Q98 84 120 128Z"/><path d="M143 128Q165 84 188 128Z"/></g><g fill="#241b32"><circle cx="100" cy="119" r="6"/><circle cx="166" cy="119" r="6"/></g>',
  '<g><circle cx="99" cy="122" r="19" fill="#fff"/><circle cx="165" cy="122" r="19" fill="#fff"/><path d="M99 111L105 122L99 133L93 122Z"/><path d="M165 111L171 122L165 133L159 122Z"/></g>',
  '<path d="M78 121Q99 139 121 121M143 121Q165 139 187 121" fill="none" stroke="#241b32" stroke-width="9" stroke-linecap="round"/>',
  '<g><circle cx="98" cy="122" r="23" fill="#241b32"/><circle cx="166" cy="122" r="23" fill="#241b32"/><circle cx="92" cy="114" r="7" fill="#fff"/><circle cx="160" cy="114" r="7" fill="#fff"/></g>',
];

const MOUTHS = [
  '<path d="M108 170Q132 188 157 170" fill="none" stroke="#241b32" stroke-width="8" stroke-linecap="round"/>',
  '<ellipse cx="132" cy="174" rx="22" ry="28" fill="#241b32"/><ellipse cx="132" cy="186" rx="12" ry="8" fill="#ff799d"/>',
  '<path d="M101 169Q132 202 164 169Z" fill="#fff" stroke="#241b32" stroke-width="7"/><path d="M132 174V190" stroke="#241b32" stroke-width="5"/>',
  '<path d="M104 178Q132 153 160 178Q132 197 104 178Z" fill="#241b32"/><path d="M120 183Q132 177 144 183" stroke="#ff799d" stroke-width="8" stroke-linecap="round"/>',
  '<path d="M104 178H160" stroke="#241b32" stroke-width="9" stroke-linecap="round"/>',
  (accent: string) => `<path d="M104 169Q132 189 160 169" fill="${accent}" stroke="#241b32" stroke-width="7"/><path d="M114 173L119 184M132 176V188M150 173L145 184" stroke="#241b32" stroke-width="4"/>`,
  '<path d="M106 176Q120 160 133 176Q146 160 160 176Q133 198 106 176Z" fill="#ff799d" stroke="#241b32" stroke-width="6"/>',
  '<circle cx="132" cy="175" r="7" fill="#241b32"/>',
  '<path d="M109 176Q132 160 156 176" fill="none" stroke="#241b32" stroke-width="8" stroke-linecap="round"/><path d="M124 176L128 188L138 176" fill="#fff"/>',
  '<path d="M110 169L121 181L132 169L143 181L155 169" fill="none" stroke="#241b32" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>',
];

const ATTACHMENTS = [
  (primary: string, accent: string) => `<path d="M91 62Q67 10 110 42M167 55Q193 9 191 67" fill="${accent}" stroke="#241b32" stroke-width="8" stroke-linecap="round"/>`,
  (primary: string, accent: string) => `<path d="M103 50L128 8L149 52Z" fill="${accent}" stroke="#241b32" stroke-width="8" stroke-linejoin="round"/>`,
  (primary: string, accent: string) => `<path d="M91 58Q58 41 53 9Q99 8 114 50M160 51Q181 12 219 17Q209 54 178 69" fill="${primary}" stroke="#241b32" stroke-width="8"/>`,
  () => '<path d="M95 54C69 31 68 5 84 7C102 8 110 29 112 49M160 49C164 17 182 1 194 12C206 23 190 47 175 60" fill="none" stroke="#241b32" stroke-width="9" stroke-linecap="round"/>',
  () => '<path d="M84 59L67 21L106 42L130 9L151 43L193 24L177 66Z" fill="#ffd166" stroke="#241b32" stroke-width="8" stroke-linejoin="round"/>',
  (primary: string, accent: string) => `<path d="M93 49Q73 10 105 24L132 51L158 23Q190 10 172 55" fill="${accent}" stroke="#241b32" stroke-width="8"/>`,
  (primary: string, accent: string) => `<path d="M80 66Q47 34 64 20Q83 6 108 52M169 54Q192 8 211 25Q225 43 185 72" fill="${accent}" stroke="#241b32" stroke-width="8"/>`,
  (primary: string, accent: string) => `<path d="M92 58Q74 14 97 10Q121 6 127 52M146 52Q153 8 176 14Q199 21 174 61" fill="${primary}" stroke="#241b32" stroke-width="8"/>`,
  (primary: string, accent: string) => `<path d="M74 64Q50 37 67 24Q84 11 108 53M175 57Q196 17 214 31Q230 47 190 72" fill="#fff" stroke="#241b32" stroke-width="8"/><circle cx="67" cy="24" r="8" fill="${accent}"/><circle cx="214" cy="31" r="8" fill="${accent}"/>`,
  (primary: string, accent: string) => `<path d="M103 53Q91 21 111 17Q132 13 133 50Q142 15 162 22Q182 30 163 57" fill="${accent}" stroke="#241b32" stroke-width="8"/>`,
  (primary: string, accent: string) => `<path d="M89 61Q53 57 58 35Q64 14 111 50M168 53Q204 22 216 44Q227 68 181 72" fill="${primary}" stroke="#241b32" stroke-width="8"/>`,
  (primary: string, accent: string) => `<path d="M94 56Q76 24 94 14Q114 3 127 49M147 50Q154 9 177 13Q200 17 174 60" fill="none" stroke="#241b32" stroke-width="10" stroke-linecap="round"/><circle cx="94" cy="14" r="10" fill="${accent}"/><circle cx="177" cy="13" r="10" fill="${accent}"/>`,
];

interface DNA {
  body: number;
  eyes: number;
  mouth: number;
  attachment: number;
  primaryColor: number;
  secondaryColor: number;
  backgroundColor: number;
  flip: boolean;
  rotation: number;
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nextRandom(seed: number): { seed: number; value: number } {
  let value = seed | 0;
  value = (value + 0x6d2b79f5) | 0;
  let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
  mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
  return { seed: value, value: ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296 };
}

const dnaCache: Record<string, DNA> = {};
let dnaCacheSize = 0;

function dnaFromSeed(seed: string): DNA {
  const cached = dnaCache[seed];
  if (cached) return cached;
  let state = hashSeed(seed);
  const next = () => {
    const result = nextRandom(state);
    state = result.seed;
    return result.value;
  };
  const dna: DNA = {
    body: Math.floor(next() * BODY_PATHS.length),
    eyes: Math.floor(next() * EYES.length),
    mouth: Math.floor(next() * MOUTHS.length),
    attachment: Math.floor(next() * ATTACHMENTS.length),
    primaryColor: Math.floor(next() * COLORS.body.length),
    secondaryColor: Math.floor(next() * COLORS.accent.length),
    backgroundColor: Math.floor(next() * COLORS.background.length),
    flip: next() > 0.75,
    rotation: Math.round((next() - 0.5) * 14),
  };
  if (dnaCacheSize > 400) {
    Object.keys(dnaCache).forEach((key) => { delete dnaCache[key]; });
    dnaCacheSize = 0;
  }
  dnaCache[seed] = dna;
  dnaCacheSize += 1;
  return dna;
}

export function identityAvatarDataUri(seed: string, size: number, label = 'avatar'): string {
  const dna = dnaFromSeed(seed);
  const primary = COLORS.body[dna.primaryColor];
  const accent = COLORS.accent[dna.secondaryColor];
  const background = COLORS.background[dna.backgroundColor];
  const eyes = EYES[dna.eyes];
  const mouth = MOUTHS[dna.mouth];
  const attachment = ATTACHMENTS[dna.attachment];
  const eyesMarkup = typeof eyes === 'function' ? eyes(accent) : eyes;
  const mouthMarkup = typeof mouth === 'function' ? mouth(accent) : mouth;
  const attachmentMarkup = typeof attachment === 'function' ? attachment(primary, accent) : attachment;
  const transform = `translate(128 132) rotate(${dna.rotation}) scale(${dna.flip ? -1 : 1} 1) scale(1) translate(-128 -132)`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 256 256" role="img" aria-label="${label}"><rect width="256" height="256" rx="34" fill="${background}"/><g transform="${transform}"><g class="attachment">${attachmentMarkup}</g><path d="${BODY_PATHS[dna.body]}" fill="${primary}" stroke="#241b32" stroke-width="9" stroke-linejoin="round"/><g class="eyes">${eyesMarkup}</g><g class="mouth">${mouthMarkup}</g><g fill="${accent}" opacity=".7"><circle cx="77" cy="158" r="6"/><circle cx="187" cy="163" r="5"/></g></g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export interface IdentityAvatarProps {
  /** 本业务系统 users.id（即 NiceCode 的 star_id） */
  userId?: number | string | null;
  size?: number;
  name?: string;
  className?: string;
}

const FALLBACK_COLORS = ['#1677ff', '#52c41a', '#722ed1', '#eb2f96', '#fa8c16', '#13c2c2', '#2f54eb', '#faad14'];

export const IdentityAvatar: React.FC<IdentityAvatarProps> = ({ userId, size = 32, name, className }) => {
  const key = String(userId ?? '').trim();
  if (!key) {
    const initial = (name || 'U').charAt(0).toUpperCase();
    let hash = 0;
    for (let i = 0; i < (name || 'U').length; i += 1) hash = (name || 'U').charCodeAt(i) + ((hash << 5) - hash);
    const color = FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white ${className || ''}`}
        style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.45 }}
        aria-label="用户头像"
      >
        {initial}
      </span>
    );
  }
  return (
    <img
      src={identityAvatarDataUri(`nicecode-star-${key}`, size * 2, `${name || key} avatar`)}
      width={size}
      height={size}
      alt={name ? `${name} 的头像` : `用户 ${key} 的头像`}
      className={`shrink-0 rounded-full ${className || ''}`}
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
};

export default IdentityAvatar;
