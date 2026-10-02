export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  tiltX: number;
  tiltY: number;
  time: number;
  /** Píxeles por milisegundo. Se calcula al muestrear el trazo. */
  velocity?: number;
}

export type BrushTool = 'fountain' | 'fude' | 'pencil' | 'eraser';

export interface Stroke {
  points: StrokePoint[];
  color: string;
  baseWidth: number;
  tool: BrushTool;
}

export type GridMode = 'palmer' | 'genkouyoushi' | 'none';

export interface Point2 {
  x: number;
  y: number;
}

export interface IdealStroke {
  points: Point2[];
}

export type IdealMode = 'repeat' | 'sequence';

/** Un momento de la construcción: el trazo nuevo y, si hace falta, los anteriores. */
export interface LessonStep {
  title: string;
  hint: string;
  strokes: IdealStroke[];
  mode: IdealMode;
}

export interface Lesson {
  id: string;
  category: 'palmer' | 'japanese';
  group: string;
  title: string;
  subTitle: string;
  instructions: string;
  characterOrWord: string;
  recommendedTool: BrushTool;
  suggestedGrid: Exclude<GridMode, 'none'>;
  strokesExpected?: number;
  idealStrokes?: IdealStroke[];
  idealMode?: IdealMode;
  /** Palmer: la fila modelo enseña estos fragmentos en orden. */
  steps?: LessonStep[];
  /** Oración en varias líneas: la primera con guía y las siguientes en blanco. */
  sheet?: boolean;
  dictation?: boolean;
  dictationSeconds?: number;
}

export interface EvaluationResult {
  score: number;
  accuracy: number;
  slantScore?: number;
  heightScore?: number;
  orderScore?: number;
  shapeScore?: number;
  directionScore?: number;
  endingScore?: number;
  wpm?: number;
  feedback: string;
  details?: string[];
}

export interface CharGeometry {
  char: string;
  strokes: Point2[][];
}
