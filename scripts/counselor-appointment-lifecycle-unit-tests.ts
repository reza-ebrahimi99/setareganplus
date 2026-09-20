/** Unit tests — counselor appointment confirmation lifecycle (no DB). */
import assert from "node:assert/strict";
import {
  canStudentChangeAppointment,
  labelCounselorAppointmentStatus,
  needsCounselorConfirmation,
  STUDENT_LOCKED_MESSAGE,
} from "../lib/counselor-os/appointment-lifecycle";

assert.equal(needsCounselorConfirmation("BOOKED"), true);
assert.equal(needsCounselorConfirmation("CONFIRMED"), false);
assert.equal(canStudentChangeAppointment("BOOKED"), true);
assert.equal(canStudentChangeAppointment("CONFIRMED"), false);
assert.equal(labelCounselorAppointmentStatus("BOOKED", "PENDING"), "منتظر تأیید مشاور");
assert.equal(labelCounselorAppointmentStatus("CONFIRMED"), "تأیید شده");
assert.ok(STUDENT_LOCKED_MESSAGE.includes("قابل تغییر نیست"));

console.log("counselor appointment lifecycle unit tests passed");
