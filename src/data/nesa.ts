// ---------------------------------------------------------------------------
// Official NESA / NSW Government links and honest study-aid disclaimers.
//
// These are real, current NSW Government (NESA) URLs (verified Jul 2026). They
// give students a direct path to the authoritative source — free past papers,
// syllabuses and marking guidelines — which is exactly what a study aid should
// point to rather than pretend to replace.
// ---------------------------------------------------------------------------

export interface NesaLink {
  label: string;
  description: string;
  url: string;
}

export const NESA_LINKS: NesaLink[] = [
  {
    label: "NSW syllabuses (NESA)",
    description: "Every current K–12 syllabus, outcomes and content.",
    url: "https://curriculum.nsw.edu.au",
  },
  {
    label: "Past HSC exam papers",
    description: "Free official past papers and marking guidelines by subject.",
    url: "https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsc-exam-papers",
  },
  {
    label: "HSC hub",
    description: "Rules, key dates, standards materials and exam advice.",
    url: "https://www.nsw.gov.au/education-and-training/nesa/hsc",
  },
  {
    label: "NESA home",
    description: "NSW Education Standards Authority — the official source.",
    url: "https://www.nsw.gov.au/education-and-training/nesa",
  },
];

// Short, confident, non-scary disclaimers used across the app.
export const DISCLAIMERS = {
  marking:
    "This is an AI estimate to guide your improvement — a study aid, not an official NESA mark. Your teacher and the official marking guidelines are the final word.",
  generated:
    "AI-generated and modelled on syllabus style — not official NESA past-paper questions.",
  general:
    "StudyMate is a study aid, not a substitute for your teacher or official NESA materials. Content is aligned to NSW syllabuses; always check against your teacher and the official documents.",
} as const;
