// Counselor applications: shared by the apply form (/for-counselors) and FaithWellness review (/admin).

export type ApplicationStatus = "submitted" | "needs_info" | "approved" | "declined";
export type RoleKind = "pastor" | "lay" | "clinician";

/** A row of public.counselor_applications. */
export type Application = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role_kind: RoleKind;
  accrediting_body: string;
  church_name: string;
  license: string;
  note: string;
  status: ApplicationStatus;
  accreditation_confirmed: boolean;
  confirmation_note: string;
  admin_note: string;
  submitted_at: string;
  reviewed_at: string | null;
};

export const roleKinds: { value: RoleKind; label: string }[] = [
  { value: "pastor", label: "Pastor or minister" },
  { value: "lay", label: "Lay counselor" },
  { value: "clinician", label: "Licensed clinician" },
];

export const roleLabel = (r: RoleKind) => roleKinds.find((k) => k.value === r)?.label ?? r;

export const NOT_LISTED = "not-listed";

export const statusLabel: Record<ApplicationStatus, string> = {
  submitted: "To review",
  needs_info: "Waiting on applicant",
  approved: "Approved",
  declined: "Declined",
};

/** "Oct 29, 2026" */
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
