/**
 * Lightweight topic recognizers for STEM/language (detection only).
 */

export function detectMathTopics(normalized: string): string[] {
  const topics: Array<[RegExp, string]> = [
    [/معادله|equation/i, "equations"],
    [/کسر|fraction|\/\d/i, "fractions"],
    [/رادیکال|sqrt|√/i, "roots"],
    [/تابع|function/i, "functions"],
    [/حد\b|limit/i, "limits"],
    [/مشتق|derivative/i, "derivatives"],
    [/انتگرال|integral/i, "integrals"],
    [/هندسه|geometry/i, "geometry"],
    [/احتمال|probability/i, "probability"],
    [/آمار|statistics/i, "statistics"],
    [/جبر|algebra/i, "algebra"],
    [/حساب|arithmetic|جمع|تفریق/i, "arithmetic"],
    [/دنباله|sequence/i, "sequences"],
    [/ماتریس|matrix/i, "matrices"],
    [/مثلثات|sin|cos|tan|trig/i, "trigonometry"],
    [/مختصات|coordinate/i, "coordinate_geometry"],
  ];
  return topics.filter(([re]) => re.test(normalized)).map(([, id]) => id);
}

export function detectChemistryTopics(normalized: string): string[] {
  const topics: Array<[RegExp, string]> = [
    [/فرمول|formula|[A-Z][a-z]?\d/i, "formulas"],
    [/واکنش|reaction/i, "reactions"],
    [/مول(?![ا-ی])|(?<!فر)مول|\bmole\b/i, "moles"],
    [/اسید|acid/i, "acids"],
    [/(?:^|[^ا-ی])باز(?:[^ا-ی]|$)|(?<![a-z])base(?![a-z])/i, "bases"],
    [/استوکیومتری|stoichiometr/i, "stoichiometry"],
    [/موازنه|balanc/i, "balancing"],
    [/محلول|solution/i, "solutions"],
    [/ph\b/i, "ph"],
    [/اکسایش|oxidation/i, "oxidation"],
    [/احیا|reduction/i, "reduction"],
  ];
  return topics.filter(([re]) => re.test(normalized)).map(([, id]) => id);
}

export function detectPhysicsTopics(normalized: string): string[] {
  const topics: Array<[RegExp, string]> = [
    [/حرکت|motion|velocity|سرعت/i, "motion"],
    [/نیرو|force|نیوتن/i, "force"],
    [/انرژی|energy|کار\b/i, "energy"],
    [/الکتریسیته|جریان|ولتاژ|ohm|electric/i, "electricity"],
    [/مغناطیس|magnet/i, "magnetism"],
    [/نور|اپتیک|optics/i, "optics"],
    [/موج|wave/i, "waves"],
    [/گرما|حرارت|heat/i, "heat"],
    [/فشار|pressure/i, "pressure"],
    [/کوانتوم|نسبیت|modern\s*physics/i, "modern_physics"],
  ];
  return topics.filter(([re]) => re.test(normalized)).map(([, id]) => id);
}

export function detectLanguageTopics(normalized: string): string[] {
  const topics: Array<[RegExp, string]> = [
    [/دستور|گرامر|grammar/i, "grammar"],
    [/واژه|vocabulary|لغت/i, "vocabulary"],
    [/ترجمه|translate/i, "translation"],
    [/نگارش|انشا|writing/i, "writing"],
    [/خواندن|comprehension|reading/i, "reading"],
    [/املا|dictation/i, "dictation"],
  ];
  return topics.filter(([re]) => re.test(normalized)).map(([, id]) => id);
}
