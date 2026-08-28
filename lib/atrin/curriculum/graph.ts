/**
 * Curriculum knowledge graph — reusable graph interfaces + builders.
 * Future: videos, FAQ, exam/gifted/konkur edges without refactor.
 */

import { getCurriculumCatalog } from "@/lib/atrin/curriculum/registry";
import type {
  CurriculumGraphEdge,
  CurriculumKnowledgeGraph,
  CurriculumTopicNode,
} from "@/lib/atrin/curriculum/types";

export function buildCurriculumKnowledgeGraph(
  topics: CurriculumTopicNode[] = getCurriculumCatalog().topics,
): CurriculumKnowledgeGraph {
  const edges: CurriculumGraphEdge[] = [];

  for (const topic of topics) {
    for (const related of topic.relatedTopicIds) {
      edges.push({ from: topic.id, to: related, kind: "related", weight: 1 });
    }
    if (topic.previousLessonId) {
      edges.push({
        from: topic.id,
        to: topic.previousLessonId,
        kind: "previous",
      });
    }
    if (topic.nextLessonId) {
      edges.push({
        from: topic.id,
        to: topic.nextLessonId,
        kind: "next",
      });
    }
    for (const id of topic.exerciseIds) {
      edges.push({ from: topic.id, to: id, kind: "exercise" });
    }
    for (const id of topic.videoResourceIds) {
      edges.push({ from: topic.id, to: id, kind: "video" });
    }
    for (const id of topic.faqResourceIds) {
      edges.push({ from: topic.id, to: id, kind: "faq" });
    }
    for (const id of topic.examQuestionIds) {
      edges.push({ from: topic.id, to: id, kind: "exam" });
    }
    for (const id of topic.giftedQuestionIds) {
      edges.push({ from: topic.id, to: id, kind: "gifted" });
    }
    for (const id of topic.konkurQuestionIds) {
      edges.push({ from: topic.id, to: id, kind: "konkur" });
    }
  }

  return { nodes: topics, edges };
}

export function getRelatedTopics(
  topicId: string,
  graph: CurriculumKnowledgeGraph = buildCurriculumKnowledgeGraph(),
): CurriculumTopicNode[] {
  const relatedIds = graph.edges
    .filter((e) => e.from === topicId && e.kind === "related")
    .map((e) => e.to);
  return graph.nodes.filter((n) => relatedIds.includes(n.id));
}

export function getLearningPathNeighbors(topicId: string): {
  previousLessonId: string | null;
  nextLessonId: string | null;
} {
  const topic = getCurriculumCatalog().topics.find((t) => t.id === topicId);
  return {
    previousLessonId: topic?.previousLessonId ?? null,
    nextLessonId: topic?.nextLessonId ?? null,
  };
}
