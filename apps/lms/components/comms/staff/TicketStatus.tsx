import { Icon } from "@/components/Icon";
import styles from "@/components/comms/staff.module.css";
import { STATUS_LABEL, type TicketStatus as Status } from "@/lib/server/tickets";

/** Ticket status with icon + word (never colour alone). */
export function TicketStatus({ status }: { status: Status }) {
  const done = status === "resolved" || status === "closed";
  const icon = done ? "done" : status === "in_progress" ? "inProgress" : "notStarted";
  return (
    <span className={`${styles.status} ${done ? styles.ok : ""}`}>
      <Icon name={icon} size={16} /> {STATUS_LABEL[status]}
    </span>
  );
}
