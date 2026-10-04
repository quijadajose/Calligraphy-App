/**
 * Medallas del mes: un emblema de temporada por mes, dibujado en SVG.
 * Todas comparten marco (aro, disco y cintas); cambia el color y el dibujo del centro.
 */

interface MedalTheme {
  name: string;
  ring: string;
  ringDark: string;
  disc: string;
  ribbon: string;
  icon: string;
}

const fmt = (n: number) => Number(n.toFixed(2));

function polar(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [fmt(Math.cos(a) * r), fmt(Math.sin(a) * r)];
}

function rays(count: number, from: number, to: number, start: number, end: number, stroke: string, width: number): string {
  let out = '';
  for (let i = 0; i < count; i++) {
    const deg = start + ((end - start) * i) / Math.max(1, count - 1);
    const [x1, y1] = polar(from, deg);
    const [x2, y2] = polar(to, deg);
    out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round"/>`;
  }
  return out;
}

function ring(count: number, r: number, offset: number, draw: (x: number, y: number, deg: number) => string): string {
  let out = '';
  for (let i = 0; i < count; i++) {
    const deg = offset + (360 * i) / count;
    const [x, y] = polar(r, deg);
    out += draw(x, y, deg);
  }
  return out;
}

const sun = `
  ${rays(7, 17, 22, 180, 360, '#F08C00', 2.6)}
  <path d="M-14 5 A14 14 0 0 1 14 5 Z" fill="#E8590C"/>
  <path d="M-21 10 q5 -4 10.5 0 t10.5 0 t10.5 0 t10.5 0" fill="none" stroke="#1C7ED6" stroke-width="3" stroke-linecap="round"/>
  <path d="M-14 17 q5 -4 9.3 0 t9.3 0 t9.3 0" fill="none" stroke="#4DABF7" stroke-width="3" stroke-linecap="round"/>`;

const plum = `
  ${ring(5, 8.5, -90, (x, y) => `<circle cx="${x}" cy="${y}" r="8" fill="#F783AC" stroke="#E64980" stroke-width="1.2"/>`)}
  <circle r="5" fill="#FFD43B"/>
  ${ring(6, 7, -60, (x, y) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#E67700"/>`)}`;

const inkwell = `
  <path d="M15 -23 C22 -17 17 -7 6 -5 C9 -12 11 -18 15 -23 Z" fill="#F8F9FA" stroke="#ADB5BD" stroke-width="1"/>
  <path d="M3 -3 L15 -22" stroke="#495057" stroke-width="2" stroke-linecap="round"/>
  <rect x="-7" y="-8" width="12" height="7" rx="1.5" fill="#5C7CFA"/>
  <path d="M-13 -2 h24 v15 a5 5 0 0 1 -5 5 h-14 a5 5 0 0 1 -5 -5 Z" fill="#364FC7"/>
  <rect x="-9" y="3" width="16" height="8" rx="1.5" fill="#EDF2FF" opacity="0.9"/>
  <path d="M-10 0 v10" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.45"/>`;

const petal = 'M0 0 C-8 -6 -8 -14 -3.5 -19 L0 -15.5 L3.5 -19 C8 -14 8 -6 0 0 Z';
const sakura = `
  ${ring(5, 0, -90, (_x, _y, deg) => `<path d="${petal}" transform="rotate(${fmt(deg + 90)})" fill="#FFC9DE" stroke="#F06595" stroke-width="1.3"/>`)}
  <circle r="3.5" fill="#F06595"/>
  ${ring(5, 6.5, -54, (x, y) => `<circle cx="${x}" cy="${y}" r="1.3" fill="#C2255C"/>`)}`;

const carp = `
  <path d="M-19 -7 Q0 -15 13 -7 L21 -14 L18 0 L21 14 L13 7 Q0 15 -19 7 Z" fill="#FA5252" stroke="#C92A2A" stroke-width="1.2"/>
  <path d="M-4 -6 a4 4 0 0 1 0 8 M3 -6 a4 4 0 0 1 0 8 M-4 1 a4 4 0 0 1 0 8 M3 1 a4 4 0 0 1 0 8" fill="none" stroke="#FFE3E3" stroke-width="1.4" opacity="0.85"/>
  <ellipse cx="-19" cy="0" rx="3" ry="7" fill="#FFF5F5" stroke="#C92A2A" stroke-width="1.2"/>
  <circle cx="-11" cy="-2" r="3.6" fill="#fff"/>
  <circle cx="-10.5" cy="-2" r="1.8" fill="#212529"/>`;

const umbrella = `
  <path d="M0 0 V15 a4 4 0 0 1 -8 0" fill="none" stroke="#495057" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M-21 1 A21 19 0 0 1 21 1 Q15.75 -3 10.5 1 Q5.25 -3 0 1 Q-5.25 -3 -10.5 1 Q-15.75 -3 -21 1 Z" fill="#7950F2" stroke="#5F3DC4" stroke-width="1.2"/>
  <path d="M0 -18 V0 M0 -18 Q-6 -8 -10.5 1 M0 -18 Q6 -8 10.5 1" fill="none" stroke="#B197FC" stroke-width="1.2"/>
  <path d="M15 8 q2 3 0 4.5 q-2 -1.5 0 -4.5 Z M19 15 q2 3 0 4.5 q-2 -1.5 0 -4.5 Z" fill="#4DABF7"/>`;

const fan = `
  <rect x="-2" y="7" width="4" height="15" rx="2" fill="#8C6239"/>
  <circle cx="0" cy="-5" r="15" fill="#E6FCF5" stroke="#0CA678" stroke-width="2"/>
  <path d="M-14 -3 q3.5 -4 7 0 t7 0 t7 0 t7 0" fill="none" stroke="#12B886" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M-12 3 q3 -4 6 0 t6 0 t6 0 t6 0" fill="none" stroke="#38D9A9" stroke-width="2.4" stroke-linecap="round"/>
  <circle cx="5" cy="-12" r="3.5" fill="#FF6B6B"/>`;

const fireworks = `
  ${rays(12, 5, 17, 0, 330, '#FCC419', 2.2)}
  ${ring(12, 20, 15, (x, y, deg) => `<circle cx="${x}" cy="${y}" r="1.8" fill="${Math.round(deg) % 60 === 15 ? '#FF8787' : '#74C0FC'}"/>`)}
  <circle r="3" fill="#FFF3BF"/>`;

const moon = `
  <circle cx="2" cy="-3" r="15" fill="#FFE066"/>
  <circle cx="-3" cy="-7" r="3" fill="#FCC419"/>
  <circle cx="7" cy="1" r="2.2" fill="#FCC419"/>
  <circle cx="4" cy="-11" r="1.6" fill="#FCC419"/>
  <path d="M-18 21 Q-16 6 -10 -2 M-14 21 Q-12 10 -5 4 M-20 21 Q-22 10 -24 6" fill="none" stroke="#E9ECEF" stroke-width="1.8" stroke-linecap="round"/>`;

const lantern = `
  <circle r="20" fill="#FFD43B" opacity="0.22"/>
  <path d="M0 -26 V-21" stroke="#868E96" stroke-width="2"/>
  <rect x="-8" y="-22" width="16" height="5" rx="1.5" fill="#343A40"/>
  <rect x="-14" y="-18" width="28" height="33" rx="12" fill="#F03E3E"/>
  <path d="M-13.5 -10 Q0 -7.5 13.5 -10 M-14 -3 Q0 -0.5 14 -3 M-14 4 Q0 6.5 14 4 M-13 10.5 Q0 13 13 10.5" fill="none" stroke="#C92A2A" stroke-width="1.5"/>
  <path d="M-6 -16 Q-9 -1 -6 13" fill="none" stroke="#FFC9C9" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
  <rect x="-8" y="14" width="16" height="5" rx="1.5" fill="#343A40"/>
  <path d="M0 19 V25" stroke="#FAB005" stroke-width="2.4" stroke-linecap="round"/>`;

function mapleLeaf(): string {
  const lobes: Array<[number, number]> = [[-90, 21], [-38, 19], [-142, 19], [22, 13], [158, 13]];
  const sorted = [...lobes].sort((a, b) => a[0] - b[0]);
  const points: string[] = [];
  sorted.forEach(([deg, r], i) => {
    const next = sorted[(i + 1) % sorted.length];
    const nextDeg = next[0] + (i === sorted.length - 1 ? 360 : 0);
    points.push(polar(r, deg).join(','));
    const mid = (deg + nextDeg) / 2;
    const inner = mid > 60 && mid < 120 ? 4 : 7;
    points.push(polar(inner, mid).join(','));
  });
  const veins = lobes.map(([deg, r]) => {
    const [x, y] = polar(r * 0.75, deg);
    return `M0 2 L${x} ${y}`;
  }).join(' ');
  return `
  <path d="M0 2 L2 22" stroke="#A61E4D" stroke-width="2.2" stroke-linecap="round"/>
  <polygon points="${points.join(' ')}" fill="#F76707" stroke="#D9480F" stroke-width="1.4" stroke-linejoin="round" transform="translate(0 2)"/>
  <path d="${veins}" fill="none" stroke="#FFD8A8" stroke-width="1.1" stroke-linecap="round" transform="translate(0 2)"/>`;
}

function snowflake(): string {
  let arms = '';
  for (let i = 0; i < 6; i++) {
    const deg = i * 60 - 90;
    const [x, y] = polar(19, deg);
    const [bx, by] = polar(11, deg);
    const [l1x, l1y] = polar(6, deg - 45);
    const [l2x, l2y] = polar(6, deg + 45);
    arms += `<line x1="0" y1="0" x2="${x}" y2="${y}"/>`;
    arms += `<line x1="${bx}" y1="${by}" x2="${fmt(bx + l1x)}" y2="${fmt(by + l1y)}"/>`;
    arms += `<line x1="${bx}" y1="${by}" x2="${fmt(bx + l2x)}" y2="${fmt(by + l2y)}"/>`;
  }
  return `<g stroke="#1C7ED6" stroke-width="2.6" stroke-linecap="round">${arms}</g><circle r="3.4" fill="#fff" stroke="#1C7ED6" stroke-width="2"/>`;
}

const THEMES: MedalTheme[] = [
  { name: 'Sol de año nuevo', ring: '#FAB005', ringDark: '#E67700', disc: '#FFF9DB', ribbon: '#E8590C', icon: sun },
  { name: 'Flor de ciruelo', ring: '#F06595', ringDark: '#C2255C', disc: '#FFF0F6', ribbon: '#A61E4D', icon: plum },
  { name: 'Tintero', ring: '#4C6EF5', ringDark: '#364FC7', disc: '#EDF2FF', ribbon: '#3B5BDB', icon: inkwell },
  { name: 'Cerezo', ring: '#F783AC', ringDark: '#D6336C', disc: '#FFF0F6', ribbon: '#E64980', icon: sakura },
  { name: 'Carpa', ring: '#FA5252', ringDark: '#C92A2A', disc: '#E7F5FF', ribbon: '#1971C2', icon: carp },
  { name: 'Paraguas', ring: '#845EF7', ringDark: '#6741D9', disc: '#F3F0FF', ribbon: '#5F3DC4', icon: umbrella },
  { name: 'Abanico', ring: '#20C997', ringDark: '#0CA678', disc: '#F8F9FA', ribbon: '#087F5B', icon: fan },
  { name: 'Fuegos artificiales', ring: '#FCC419', ringDark: '#F08C00', disc: '#1B2559', ribbon: '#364FC7', icon: fireworks },
  { name: 'Luna de otoño', ring: '#748FFC', ringDark: '#4263EB', disc: '#1B2559', ribbon: '#F59F00', icon: moon },
  { name: 'Farol', ring: '#FF922B', ringDark: '#E8590C', disc: '#3B1F14', ribbon: '#C92A2A', icon: lantern },
  { name: 'Hoja de arce', ring: '#FD7E14', ringDark: '#D9480F', disc: '#FFF4E6', ribbon: '#A61E4D', icon: mapleLeaf() },
  { name: 'Copo de nieve', ring: '#339AF0', ringDark: '#1C7ED6', disc: '#E7F5FF', ribbon: '#1864AB', icon: snowflake() }
];

export function medalName(month: number): string {
  return THEMES[((month % 12) + 12) % 12].name;
}

/**
 * SVG de la medalla de un mes (0 = enero). `true`: ganada; `'pending'`: el mes en curso,
 * en color pero atenuada; `false`: apagada.
 */
export function medalSvg(month: number, earned: boolean | 'pending', size = 64): string {
  const t = THEMES[((month % 12) + 12) % 12];
  const state = earned === true ? '' : earned === 'pending' ? ' is-pending' : ' is-locked';
  return `<svg class="medal${state}" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
  <path d="M36 66 L27 96 L37 90 L43 98 L50 74 Z" fill="${t.ribbon}"/>
  <path d="M64 66 L73 96 L63 90 L57 98 L50 74 Z" fill="${t.ribbon}" opacity="0.8"/>
  <circle cx="50" cy="44" r="38" fill="${t.ring}" stroke="${t.ringDark}" stroke-width="3"/>
  <circle cx="50" cy="44" r="30" fill="${t.disc}" stroke="${t.ringDark}" stroke-width="1.5"/>
  <path d="M23 33 A29 29 0 0 1 44 15.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.55"/>
  <g transform="translate(50 44)">${t.icon}</g>
</svg>`;
}
