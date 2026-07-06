import type { Subject, SubjectId, YearLevel } from "@/types";

// ---------------------------------------------------------------------------
// Subject catalogue for NSW Years 10–12.
//
// Topics are split by year level:
//   - year12 → Stage 6 HSC modules
//   - year11 → Stage 6 Preliminary modules
//   - year10 → Stage 5 focus areas
//
// VERIFICATION (checked against NESA / NSW Government syllabus pages, Jul 2026):
//   ✓ Biology, Chemistry, Physics — Year 11 & Year 12 modules verified against
//     the Stage 6 (2017) syllabus pages (still current for HSC until the new
//     2025 syllabuses phase in from 2027).
//   ✓ Mathematics Advanced/Extension 1 — Stage 6 topic names & the NESA content
//     code scheme (MA-…, ME-…) verified; per-year split per the 2017 syllabus.
//   ✓ English Advanced/Standard — Common Module + Modules A/B/C and the Year 11
//     modules verified against NESA English Stage 6 pages.
//   ~ Economics, Business Studies, Modern History — Stage 6 module structure is
//     the established 2017 syllabus organisation (not re-fetched page-by-page
//     this session).
//   ~ All Year 10 (Stage 5) topic groupings are aligned to the relevant Stage 5
//     syllabus focus areas but are indicative rather than individually verified.
// The in-app disclaimers reflect this.
// ---------------------------------------------------------------------------

export const SUBJECTS: Subject[] = [
  {
    id: "math-adv",
    name: "Mathematics Advanced",
    short: "Maths Adv",
    area: "Mathematics",
    gradient: ["#7c65f1", "#5d37c9"],
    icon: "∑",
    blurb: "Functions, calculus, statistical analysis and financial maths.",
    bands: 6,
    years: ["year10", "year11", "year12"],
    topicsByYear: {
      year10: [
        "Algebra & Equations",
        "Linear & Non-linear Relationships",
        "Pythagoras & Trigonometry",
        "Surds & Indices",
        "Statistics & Probability",
      ],
      year11: [
        "Functions",
        "Trigonometric Functions",
        "Calculus (Introduction)",
        "Exponential & Logarithmic Functions",
      ],
      year12: [
        "Functions",
        "Trigonometric Functions",
        "Calculus",
        "Exponential & Logarithmic Functions",
        "Financial Mathematics",
        "Statistical Analysis",
      ],
    },
    topics: [
      "Functions",
      "Trigonometric Functions",
      "Calculus",
      "Exponential & Logarithmic Functions",
      "Financial Mathematics",
      "Statistical Analysis",
    ],
  },
  {
    id: "math-ext1",
    name: "Mathematics Extension 1",
    short: "Maths Ext 1",
    area: "Mathematics",
    gradient: ["#8b83f8", "#6d47e5"],
    icon: "∫",
    blurb: "Proof, vectors, calculus and the binomial distribution.",
    bands: 4, // Extension courses report E1–E4
    years: ["year11", "year12"], // Stage 6 only
    topicsByYear: {
      year10: [],
      year11: [
        "Further Work with Functions",
        "Trigonometric Functions & Identities",
        "Further Calculus Skills",
        "Combinatorics",
      ],
      year12: [
        "Proof",
        "Vectors",
        "Trigonometric Equations",
        "Applications of Calculus",
        "The Binomial Distribution",
      ],
    },
    topics: [
      "Proof",
      "Vectors",
      "Trigonometric Equations",
      "Applications of Calculus",
      "The Binomial Distribution",
    ],
  },
  {
    id: "english-adv",
    name: "English Advanced",
    short: "English Adv",
    area: "English",
    gradient: ["#a5a8fc", "#7c65f1"],
    icon: "✎",
    blurb: "Textual Conversations, Critical Study and the Craft of Writing.",
    bands: 6,
    years: ["year10", "year11", "year12"],
    topicsByYear: {
      year10: [
        "Reading & Responding to Texts",
        "Composing Texts",
        "Shakespeare & Drama",
        "Poetry, Film & Media",
      ],
      year11: [
        "Reading to Write (Common Module)",
        "Narratives that Shape Our World (Module A)",
        "Critical Study of Literature (Module B)",
      ],
      year12: [
        "Common Module: Texts and Human Experiences",
        "Module A: Textual Conversations",
        "Module B: Critical Study of Literature",
        "Module C: The Craft of Writing",
      ],
    },
    topics: [
      "Common Module: Texts and Human Experiences",
      "Module A: Textual Conversations",
      "Module B: Critical Study of Literature",
      "Module C: The Craft of Writing",
    ],
  },
  {
    id: "english-std",
    name: "English Standard",
    short: "English Std",
    area: "English",
    gradient: ["#c7ccfe", "#8b83f8"],
    icon: "✐",
    blurb: "Language, identity and culture through prescribed texts.",
    bands: 6,
    years: ["year10", "year11", "year12"],
    topicsByYear: {
      year10: [
        "Reading & Responding to Texts",
        "Composing Texts",
        "Drama & Shakespeare",
        "Poetry, Film & Media",
      ],
      year11: [
        "Reading to Write (Common Module)",
        "Contemporary Possibilities (Module A)",
        "Close Study of Literature (Module B)",
      ],
      year12: [
        "Common Module: Texts and Human Experiences",
        "Module A: Language, Identity and Culture",
        "Module B: Close Study of Literature",
        "Module C: The Craft of Writing",
      ],
    },
    topics: [
      "Common Module: Texts and Human Experiences",
      "Module A: Language, Identity and Culture",
      "Module B: Close Study of Literature",
      "Module C: The Craft of Writing",
    ],
  },
  {
    id: "biology",
    name: "Biology",
    short: "Biology",
    area: "Science",
    gradient: ["#34d399", "#059669"],
    icon: "🧬",
    blurb: "Cells, biodiversity, heredity, genetics and disease.",
    bands: 6,
    years: ["year10", "year11", "year12"],
    topicsByYear: {
      year10: [
        "Genetics & DNA",
        "Evolution & Natural Selection",
        "Ecosystems & Conservation",
        "Body Systems & Disease",
      ],
      year11: [
        "Module 1: Cells as the Basis of Life",
        "Module 2: Organisation of Living Things",
        "Module 3: Biological Diversity",
        "Module 4: Ecosystem Dynamics",
      ],
      year12: [
        "Module 5: Heredity",
        "Module 6: Genetic Change",
        "Module 7: Infectious Disease",
        "Module 8: Non-infectious Disease and Disorders",
      ],
    },
    topics: [
      "Module 5: Heredity",
      "Module 6: Genetic Change",
      "Module 7: Infectious Disease",
      "Module 8: Non-infectious Disease and Disorders",
    ],
  },
  {
    id: "chemistry",
    name: "Chemistry",
    short: "Chemistry",
    area: "Science",
    gradient: ["#60a5fa", "#4c2fa2"],
    icon: "⚗",
    blurb: "Matter, quantitative chemistry, equilibrium and organic chemistry.",
    bands: 6,
    years: ["year10", "year11", "year12"],
    topicsByYear: {
      year10: [
        "Atoms & the Periodic Table",
        "Chemical Reactions",
        "Acids & Bases",
        "Rates of Reaction",
      ],
      year11: [
        "Module 1: Properties and Structure of Matter",
        "Module 2: Introduction to Quantitative Chemistry",
        "Module 3: Reactive Chemistry",
        "Module 4: Drivers of Reactions",
      ],
      year12: [
        "Module 5: Equilibrium and Acid Reactions",
        "Module 6: Acid/Base Reactions",
        "Module 7: Organic Chemistry",
        "Module 8: Applying Chemical Ideas",
      ],
    },
    topics: [
      "Module 5: Equilibrium and Acid Reactions",
      "Module 6: Acid/Base Reactions",
      "Module 7: Organic Chemistry",
      "Module 8: Applying Chemical Ideas",
    ],
  },
  {
    id: "physics",
    name: "Physics",
    short: "Physics",
    area: "Science",
    gradient: ["#f472b6", "#6d47e5"],
    icon: "🛰",
    blurb: "Motion, forces, waves, electromagnetism and the atom.",
    bands: 6,
    years: ["year10", "year11", "year12"],
    topicsByYear: {
      year10: [
        "Motion & Forces",
        "Energy Transfer & Conservation",
        "Waves, Light & Sound",
        "Electricity & Magnetism",
      ],
      year11: [
        "Module 1: Kinematics",
        "Module 2: Dynamics",
        "Module 3: Waves and Thermodynamics",
        "Module 4: Electricity and Magnetism",
      ],
      year12: [
        "Module 5: Advanced Mechanics",
        "Module 6: Electromagnetism",
        "Module 7: The Nature of Light",
        "Module 8: From the Universe to the Atom",
      ],
    },
    topics: [
      "Module 5: Advanced Mechanics",
      "Module 6: Electromagnetism",
      "Module 7: The Nature of Light",
      "Module 8: From the Universe to the Atom",
    ],
  },
  {
    id: "modern-history",
    name: "Modern History",
    short: "Modern Hist",
    area: "HSIE",
    gradient: ["#fbbf24", "#b45309"],
    icon: "🏛",
    blurb: "Power, authority and conflict in the modern world.",
    bands: 6,
    years: ["year10", "year11", "year12"],
    topicsByYear: {
      year10: [
        "World War I & World War II",
        "Rights & Freedoms",
        "The Globalising World",
        "Australia in the 20th Century",
      ],
      year11: [
        "Investigating Modern History",
        "Historical Investigation",
        "The Shaping of the Modern World",
      ],
      year12: [
        "Power and Authority in the Modern World 1919–1946",
        "National Study: Germany 1918–1939",
        "Peace and Conflict",
        "Change in the Modern World",
      ],
    },
    topics: [
      "Power and Authority in the Modern World 1919–1946",
      "National Study: Germany 1918–1939",
      "Peace and Conflict",
      "Change in the Modern World",
    ],
  },
  {
    id: "economics",
    name: "Economics",
    short: "Economics",
    area: "HSIE",
    gradient: ["#2dd4bf", "#0f766e"],
    icon: "📈",
    blurb: "Markets, the global economy and economic policy.",
    bands: 6,
    years: ["year10", "year11", "year12"],
    topicsByYear: {
      year10: [
        "Consumer & Financial Decisions",
        "The Economic & Business Environment",
        "Employment & Work Futures",
      ],
      year11: [
        "Introduction to Economics",
        "Consumers and Business",
        "Markets",
        "Labour Markets",
        "Financial Markets",
        "Government and the Economy",
      ],
      year12: [
        "The Global Economy",
        "Australia's Place in the Global Economy",
        "Economic Issues",
        "Economic Policies and Management",
      ],
    },
    topics: [
      "The Global Economy",
      "Australia's Place in the Global Economy",
      "Economic Issues",
      "Economic Policies and Management",
    ],
  },
  {
    id: "business-studies",
    name: "Business Studies",
    short: "Business",
    area: "HSIE",
    gradient: ["#fb923c", "#c2410c"],
    icon: "💼",
    blurb: "Operations, marketing, finance and human resources.",
    bands: 6,
    years: ["year10", "year11", "year12"],
    topicsByYear: {
      year10: [
        "Running a Business",
        "Promoting & Selling",
        "Employment & Enterprise",
      ],
      year11: ["Nature of Business", "Business Management", "Business Planning"],
      year12: ["Operations", "Marketing", "Finance", "Human Resources"],
    },
    topics: ["Operations", "Marketing", "Finance", "Human Resources"],
  },
];

export const SUBJECTS_BY_ID: Record<SubjectId, Subject> = Object.fromEntries(
  SUBJECTS.map((s) => [s.id, s]),
) as Record<SubjectId, Subject>;

export function getSubject(id: SubjectId): Subject {
  return SUBJECTS_BY_ID[id];
}

/** Subjects offered at a given year level (e.g. Extension is Stage 6 only). */
export function subjectsForYear(year: YearLevel): Subject[] {
  return SUBJECTS.filter((s) => s.years.includes(year));
}

/**
 * Topics for a subject at a given year level. Falls back to the subject's broad
 * topic list if that year has no dedicated list.
 */
export function topicsForYear(id: SubjectId, year: YearLevel): string[] {
  const s = getSubject(id);
  const list = s.topicsByYear[year];
  return list && list.length > 0 ? list : s.topics;
}
