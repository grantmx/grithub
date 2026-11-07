import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./columns";
import { attendanceStatus } from "./enums";
import { qualifications } from "./curriculum";
import { enrolments, users } from "./people";

export const cohorts = pgTable(
  "cohorts",
  {
    id: id(),
    qualificationId: uuid()
      .notNull()
      .references(() => qualifications.id),
    name: text().notNull(),
    startsOn: date().notNull(),
    endsOn: date().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("cohorts_qualification_name_uq").on(t.qualificationId, t.name),
    check("cohorts_dates_ordered", sql`${t.endsOn} >= ${t.startsOn}`),
  ],
);

export const assessmentDays = pgTable(
  "assessment_days",
  {
    id: id(),
    cohortId: uuid()
      .notNull()
      .references(() => cohorts.id),
    heldOn: date().notNull(),
    venue: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [unique("assessment_days_cohort_date_uq").on(t.cohortId, t.heldOn)],
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: id(),
    enrolmentId: uuid()
      .notNull()
      .references(() => enrolments.id),
    assessmentDayId: uuid()
      .notNull()
      .references(() => assessmentDays.id),
    status: attendanceStatus().notNull(),
    recordedBy: uuid()
      .notNull()
      .references(() => users.id),
    recordedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("attendance_records_enrolment_day_uq").on(
      t.enrolmentId,
      t.assessmentDayId,
    ),
    index("attendance_records_day_idx").on(t.assessmentDayId),
  ],
);
