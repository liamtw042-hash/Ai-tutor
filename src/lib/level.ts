import { defaultLevelFor, getSubject } from "@/data/subjects";
import {
  stageLabel,
  type SRSItem,
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
  | {
      yearLevel?: UserProfile["yearLevel"];
      subjectLevels?: UserProfile["subjectLevels"];
      subjects?: UserProfile["subjects"];
    }
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

/** True when a subject is in the student's current selection. */
export function isSubjectSelected(
  profile: ProfileLike,
  id: SubjectId,
): boolean {
  return (profile?.subjects ?? []).includes(id);
}

/**
 * Whether a spaced-repetition item should still surface for this student.
 * Only items from a currently-selected subject appear; if the item records the
 * level it was studied at, it must also match the level the student now studies
 * that subject at. Legacy items without a level are never hidden (so changing
 * subjects never silently deletes review progress).
 */
export function srsItemVisible(
  profile: ProfileLike,
  item: Pick<SRSItem, "subjectId" | "yearLevel">,
): boolean {
  if (!isSubjectSelected(profile, item.subjectId)) return false;
  if (!item.yearLevel) return true;
  return item.yearLevel === levelForSubject(profile, item.subjectId);
}
