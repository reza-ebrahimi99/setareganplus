/**
 * Atrin Vision Engine — types for future OCR / page / formula / handwriting.
 * No OCR implementation in this sprint.
 */

import type {
  EducationGrade,
  EducationSubject,
} from "@/lib/atrin/education/types";

export type VisionInputKind =
  | "homework_photo"
  | "book_page"
  | "exam_sheet"
  | "worksheet"
  | "notebook"
  | "handwriting"
  | "diagram"
  | "geometry"
  | "chart"
  | "chemical_equation"
  | "graph";

export type VisionInput = {
  kind: VisionInputKind;
  sourceRef?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  createdAt: number;
};

export type VisionConfidence = {
  overall: number;
  page?: number;
  subject?: number;
  formulas?: number;
  figures?: number;
  handwriting?: number;
  curriculum?: number;
};

export type VisionDetectedPage = {
  pageNumber: number | null;
  confidence: number;
  bookHint?: string;
};

export type VisionDetectedFormula = {
  id: string;
  latexHint?: string;
  plaintext: string;
  confidence: number;
  bbox?: { x: number; y: number; w: number; h: number };
};

export type VisionDetectedFigure = {
  id: string;
  kind: "diagram" | "geometry" | "chart" | "graph" | "table" | "other";
  label?: string;
  confidence: number;
};

export type VisionDetectedTable = {
  id: string;
  rowsHint?: number;
  colsHint?: number;
  confidence: number;
};

export type VisionDetectedHandwriting = {
  id: string;
  textHint: string;
  confidence: number;
};

export type VisionDetectedExercise = {
  number: number | null;
  promptHint: string;
  confidence: number;
};

export type VisionAnalysisResult = {
  ok: boolean;
  reason?: "not_implemented" | "unsupported" | "low_confidence";
  input: VisionInput;
  detectedPage: VisionDetectedPage | null;
  detectedSubject: EducationSubject | null;
  detectedGrade: EducationGrade;
  detectedFormulas: VisionDetectedFormula[];
  detectedFigures: VisionDetectedFigure[];
  detectedTables: VisionDetectedTable[];
  detectedHandwriting: VisionDetectedHandwriting[];
  detectedChapterId: string | null;
  detectedLessonId: string | null;
  detectedExercise: VisionDetectedExercise | null;
  curriculumItemIds: string[];
  confidence: VisionConfidence;
};

export type VisionPipelineStage =
  | "ocr"
  | "page_detection"
  | "formula_detection"
  | "diagram_detection"
  | "handwriting"
  | "object_detection"
  | "curriculum_matching"
  | "education_engine";

export type VisionAdapter = {
  readonly id: string;
  readonly stages: VisionPipelineStage[];
  readonly supports: VisionInputKind[];
  analyze(input: VisionInput): Promise<VisionAnalysisResult>;
};

/** Math parser — recognize structures; no solving. */
export type MathParseKind =
  | "fraction"
  | "root"
  | "matrix"
  | "function"
  | "limit"
  | "derivative"
  | "integral"
  | "geometry"
  | "statistics"
  | "probability"
  | "trigonometry"
  | "unknown";

export type MathParseNode = {
  kind: MathParseKind;
  raw: string;
  normalized?: string;
  children?: MathParseNode[];
};

export type MathParseResult = {
  ok: boolean;
  reason?: "not_implemented";
  nodes: MathParseNode[];
};

/** Chemistry parser — normalize formulas; no balancing solver yet. */
export type ChemistryParseKind =
  | "formula"
  | "reaction"
  | "acid"
  | "base"
  | "organic"
  | "periodic"
  | "mole"
  | "oxidation"
  | "reduction"
  | "unknown";

export type ChemistryParseNode = {
  kind: ChemistryParseKind;
  raw: string;
  normalizedFormula?: string;
};

export type ChemistryParseResult = {
  ok: boolean;
  reason?: "not_implemented";
  nodes: ChemistryParseNode[];
};

/** Physics parser — units/constants recognition; no numeric solve. */
export type PhysicsParseKind =
  | "motion"
  | "energy"
  | "force"
  | "pressure"
  | "electricity"
  | "magnetism"
  | "heat"
  | "optics"
  | "modern"
  | "unit"
  | "constant"
  | "unknown";

export type PhysicsParseNode = {
  kind: PhysicsParseKind;
  raw: string;
  unitHint?: string;
  constantHint?: string;
};

export type PhysicsParseResult = {
  ok: boolean;
  reason?: "not_implemented";
  nodes: PhysicsParseNode[];
};
