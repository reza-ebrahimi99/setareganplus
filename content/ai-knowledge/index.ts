import type { KnowledgeBlock } from "@/types/knowledge";
import { contactKnowledge } from "./contact";
import { faqKnowledge } from "./faq";
import { founderKnowledge } from "./founder";
import { ghalamchiKnowledge } from "./ghalamchi";
import { historyKnowledge } from "./history";
import { institutionKnowledge } from "./institution";
import { schoolKnowledge } from "./school";
import { servicesKnowledge } from "./services";
import { starosKnowledge } from "./staros";
import { statisticsKnowledge } from "./statistics";
import { summerClubKnowledge } from "./summer-club";

/** All static knowledge packs for the file-based loader. */
export const staticKnowledgeBlocks: KnowledgeBlock[] = [
  ...institutionKnowledge,
  ...historyKnowledge,
  ...servicesKnowledge,
  ...schoolKnowledge,
  ...ghalamchiKnowledge,
  ...summerClubKnowledge,
  ...faqKnowledge,
  ...contactKnowledge,
  ...statisticsKnowledge,
  ...founderKnowledge,
  ...starosKnowledge,
];
