import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit as qLimit,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { requireDb, requireStorage } from "@/lib/firebase";
import type { SubjectId, Upload } from "@/types";

// ---------------------------------------------------------------------------
// Student work uploads (photos of handwritten work, worksheets, PDFs).
//
// Files live in Firebase Storage under users/{uid}/uploads/… and metadata in
// Firestore under users/{uid}/uploads/{docId}. Both are owner-scoped — see
// storage.rules and firestore.rules. Claude's vision / document analysis reads
// the file client-side (base64) and sends it to the /api/analyze endpoint; the
// stored copy lets the student revisit past uploads.
// ---------------------------------------------------------------------------

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

// Only formats the Anthropic vision API accepts natively (jpeg/png/webp/gif)
// plus PDF. HEIC is deliberately excluded — Claude can't read it and we don't
// convert client-side, so it's rejected with a clear message rather than sent
// as a mislabelled JPEG. Most mobile browsers hand back JPEG from the camera.
export const ACCEPTED_TYPES: Record<string, "image" | "pdf"> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "application/pdf": "pdf",
};

export const ACCEPT_ATTR =
  "image/jpeg,image/png,image/webp,image/gif,application/pdf";

export interface UploadValidation {
  ok: boolean;
  error?: string;
  kind?: "image" | "pdf";
}

export function validateFile(file: File): UploadValidation {
  const kind = ACCEPTED_TYPES[file.type];
  if (!kind) {
    return {
      ok: false,
      error: "Unsupported file. Upload a JPG, PNG or PDF.",
    };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 10 MB. Try a smaller photo.`,
    };
  }
  return { ok: true, kind };
}

/** Read a File into a base64 string (no data: prefix). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function uploadsCol(uid: string) {
  return collection(requireDb(), "users", uid, "uploads");
}

/**
 * Store a file in the student's own Storage area and record its metadata.
 * Returns the Upload record (including a download URL).
 */
export async function uploadWork(
  uid: string,
  file: File,
  subjectId?: SubjectId,
): Promise<Upload> {
  const { ok, error, kind } = validateFile(file);
  if (!ok || !kind) throw new Error(error ?? "Invalid file.");

  const safeName = file.name.replace(/[^\w.\-]/g, "_").slice(-80) || "upload";
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storagePath = `users/${uid}/uploads/${id}-${safeName}`;
  const storageRef = ref(requireStorage(), storagePath);

  await uploadBytes(storageRef, file, { contentType: file.type });
  const url = await getDownloadURL(storageRef);

  const record = {
    name: file.name,
    kind,
    mediaType: file.type,
    size: file.size,
    storagePath,
    url,
    ...(subjectId ? { subjectId } : {}),
    createdAt: Timestamp.now(),
  };
  const docRef = await addDoc(uploadsCol(uid), record);
  return {
    id: docRef.id,
    name: file.name,
    kind,
    mediaType: file.type,
    size: file.size,
    storagePath,
    url,
    subjectId,
    createdAt: Date.now(),
  };
}

export async function fetchUploads(uid: string, max = 30): Promise<Upload[]> {
  const snap = await getDocs(
    query(uploadsCol(uid), orderBy("createdAt", "desc"), qLimit(max)),
  );
  return snap.docs.map((d) => {
    const data = d.data() as Omit<Upload, "id" | "createdAt"> & {
      createdAt: Timestamp;
    };
    return {
      ...data,
      id: d.id,
      createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
    };
  });
}

export async function deleteUpload(uid: string, upload: Upload): Promise<void> {
  await deleteObject(ref(requireStorage(), upload.storagePath)).catch(
    () => undefined,
  );
  await deleteDoc(doc(requireDb(), "users", uid, "uploads", upload.id));
}
