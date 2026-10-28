import { initialsOf } from "@/lib/people";

export function Avatar({
  name,
  size = 24,
  label,
  outline = false,
}: {
  name: string;
  /** Accepted so existing call sites keep working; every avatar is the same black now. */
  names?: string[];
  size?: number;
  /** Text inside the circle instead of the initials (e.g. "AD" for the admin role). */
  label?: string;
  /** White circle with a black edge: a role, not a person. */
  outline?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center rounded-full font-medium ${
        outline ? "bg-surface text-ink border border-ink" : "bg-ink text-white"
      }`}
      style={{ width: size, height: size, fontSize: size <= 24 ? (label ? 9 : 11) : 13 }}
    >
      {label ?? initialsOf(name)}
    </span>
  );
}
