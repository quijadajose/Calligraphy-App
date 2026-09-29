import { PalmRejection } from '../src/core/engine/PalmRejection';
import { StrokeSmoother } from '../src/core/engine/StrokeSmoother';
import { SlantAnalyzer } from '../src/core/evaluation/SlantAnalyzer';
import { loadCharGeometry } from '../src/core/evaluation/CharDataLoader';
import { classifyEnding, discreteFrechet, dtw, resample } from '../src/core/evaluation/geometry';
import { wordsPerMinute } from '../src/core/audio/DictationService';
import { Stroke, StrokePoint } from '../src/types/ink';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function point(x: number, y: number, time: number): StrokePoint {
  return { x, y, pressure: 0.6, tiltX: 0, tiltY: 0, time, velocity: 0.3 };
}

const curve = resample(
  [
    { x: 0, y: 0 },
    { x: 0.2, y: 0.5 },
    { x: 1, y: 1 }
  ],
  12
);
assert(discreteFrechet(curve, curve) < 0.001, 'Fréchet de una curva consigo misma debe ser 0');
assert(dtw(curve, curve) < 0.001, 'DTW de una curva consigo misma debe ser 0');
const other = curve.map((p) => ({ x: 1 - p.x, y: p.y }));
assert(discreteFrechet(curve, other) > 0.2, 'Fréchet debe separar trazos distintos');

const slantPoints: StrokePoint[] = [];
for (let i = 0; i < 24; i++) {
  const t = i / 23;
  const y = 30 + t * 90;
  const x = 180 - (t * 90) / Math.tan((52 * Math.PI) / 180);
  slantPoints.push(point(x, y, i * 16));
}
const slantStroke: Stroke = {
  points: slantPoints,
  color: '#111',
  baseWidth: 4,
  tool: 'fountain'
};
const slant = SlantAnalyzer.analyze([slantStroke]);
assert(Math.abs(slant.avgAngle - 52) <= 2, `ángulo esperado ~52, obtuvo ${slant.avgAngle}`);
assert(slant.slantScore >= 90, `nota de inclinación baja: ${slant.slantScore}`);

const hook = [
  ...Array.from({ length: 8 }, (_, i) => ({ x: 0.4, y: 0.2 + i * 0.08 })),
  ...Array.from({ length: 5 }, (_, i) => ({ x: 0.4 + i * 0.04, y: 0.76 - i * 0.07 }))
];
assert(classifyEnding(hook) === 'hane', `el gancho debería ser hane y fue ${classifyEnding(hook)}`);

const stop = Array.from({ length: 10 }, (_, i) => ({ x: i * 0.08, y: 0.5 }));
assert(classifyEnding(stop) === 'tome', `la parada debería ser tome y fue ${classifyEnding(stop)}`);

const sweep = Array.from({ length: 12 }, (_, i) => ({ x: 0.2 + i * 0.05, y: 0.3 + i * 0.05 }));
assert(classifyEnding(sweep) === 'harai', `el barrido debería ser harai y fue ${classifyEnding(sweep)}`);

const palm = new PalmRejection();
assert(palm.acceptDown({ pointerType: 'touch', pointerId: 1 } as PointerEvent) === false, 'el dedo no debe pintar');
assert(palm.acceptDown({ pointerType: 'mouse', pointerId: 2 } as PointerEvent) === true, 'el ratón pinta si no hay lápiz');
assert(palm.acceptDown({ pointerType: 'pen', pointerId: 3 } as PointerEvent) === true, 'el lápiz pinta');
assert(palm.acceptDown({ pointerType: 'mouse', pointerId: 4 } as PointerEvent) === false, 'el ratón se ignora con lápiz activo');

const smoothed = StrokeSmoother.smooth([
  point(0, 0, 0),
  point(10, 12, 16),
  point(20, 8, 32),
  point(40, 30, 48)
]);
assert(smoothed.length > 4, 'Catmull-Rom debe insertar puntos');

assert(wordsPerMinute('la pluma sigue', 30000) === 6, '3 palabras en 30s son 6 ppm');
assert(wordsPerMinute('木', 50) === 60, 'un envío instantáneo no debe inflar las ppm');

const ichi = await loadCharGeometry('一');
assert(ichi !== null && ichi.strokes.length === 1, '一 debe tener un trazo');
if (ichi) {
  const stroke = ichi.strokes[0];
  const dx = stroke[stroke.length - 1].x - stroke[0].x;
  assert(dx > 0.2, `一 debe ir de izquierda a derecha, dx=${dx}`);
}

const ki = await loadCharGeometry('木');
assert(ki !== null && ki.strokes.length === 4, `木 debe tener 4 trazos, tiene ${ki?.strokes.length}`);

const aKana = await loadCharGeometry('あ');
assert(aKana !== null && aKana.strokes.length === 3, `あ debe tener 3 trazos, tiene ${aKana?.strokes.length}`);

console.log('selfcheck ok');
