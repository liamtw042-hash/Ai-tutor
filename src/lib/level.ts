import { defaultLevelFor, getSubject } from "@/data/subjects";
import {
  stageLabel,
  type SubjectId,
  type UserProfile,
  type YearLevel,
} from "@/types";

// ---------------------------------------------------------------------------
// Per-subject level resolution for accelerated study. A student's base year is
// profile.yearLevel, but any subject can be pinned one stage above via
// profile.subjectLevels. Downstream features (practice, tutor, flashcards,
// essay marking, generation) resolve the level per subject through here so an
// accelerated subject uses the higher stage's topics and AI context.
// ---------------------------------------------------------------------------

type ProfileLike =
  | Pick<UserProfile, "yearLevel" | "subjectLevels">
  | null
  | undefined;

/** The year level a student actually studies a given subject at. */
export function levelForSubject(profile: ProfileLike, id: SubjectId): YearLevel {
  const base = profile?.yearLevel ?? "year12";
  const explicit = profile?.subjectLevels?.[id];
  if (explicit) return explicit;
  return defaultLevelFor(getSubject(id), base);
}

/** Human stage string for the AI, respecting per-subject acceleration. */
export function stageForSubject(profile: ProfileLike, id: SubjectId): string {
  return stageLabel(levelForSubject(profile, id));
}

/** True when the subject is studied above the student's base year. */
export function isAcceleratedSubject(
  profile: ProfileLike,
  id: SubjectId,
): boolean {
  const base = profile?.yearLevel ?? "year12";
  return levelForSubject(profile, id) !== base;
}
