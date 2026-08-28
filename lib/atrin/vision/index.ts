/**
 * Atrin Vision Engine
 * Vision → OCR → Page → Formula → Diagram → Handwriting → Objects → Curriculum → Education
 * OCR not implemented — stable interfaces for future adapters.
 */

export type * from "@/lib/atrin/vision/types";
export {
  VISION_PIPELINE_STAGES,
  prepareVisionInput,
  emptyVisionAnalysis,
  analyzeVision,
  VISION_ADAPTERS,
  matchVisionToCurriculum,
} from "@/lib/atrin/vision/pipeline";
export {
  parseMathStructures,
  MATH_PARSER_ADAPTERS,
  type MathParserAdapter,
} from "@/lib/atrin/vision/parsers/math";
export {
  normalizeChemicalFormula,
  parseChemistryStructures,
  CHEMISTRY_PARSER_ADAPTERS,
  type ChemistryParserAdapter,
} from "@/lib/atrin/vision/parsers/chemistry";
export {
  parsePhysicsStructures,
  PHYSICS_PARSER_ADAPTERS,
  type PhysicsParserAdapter,
} from "@/lib/atrin/vision/parsers/physics";
