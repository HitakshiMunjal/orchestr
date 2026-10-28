export const ROLE_LABELS = {
  student: "Student",
  organizer: "Club Organizer",
  incharge: "Venue In-Charge",
  osa_dean: "Dean",
  admin: "Administrator",
};

export const ACTIVE_HOLD_STATUSES = ["PENDING_INCHARGE", "PENDING_OSA_DEAN", "APPROVED_OPEN"];

export function fmtDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function fmtTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function fmtRange(start, end) {
  return `${fmtDateTime(start)} – ${fmtTime(end)}`;
}

export function fmtRelative(value) {
  const diff = (Date.now() - new Date(value).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/** Date -> value usable by <input type="datetime-local"> in the user's timezone */
export function toLocalInput(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function firstName(name = "") {
  return name.replace(/^(Dr\.|Prof\.)\s+/i, "").split(" ")[0];
}

export function idOf(ref) {
  return ref && typeof ref === "object" ? ref._id : ref;
}
