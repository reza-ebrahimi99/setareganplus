"use client";

import { useState } from "react";
import Link from "next/link";
import { PortalLoginForm } from "@/app/portal/login/PortalLoginForm";
import { StaffOtpLoginForm } from "@/components/admin/StaffOtpLoginForm";
import { guidanceEntryContent } from "@/content/guidance";

type Role = "student" | "counselor";

export function GuidanceEntryAuth({
  studentSignedIn,
  counselorSignedIn,
}: {
  studentSignedIn: boolean;
  counselorSignedIn: boolean;
}) {
  const [role, setRole] = useState<Role | null>(null);
  const copy = guidanceEntryContent;

  return (
    <div className="guidance-entry__auth">
      <AuthCard
        id="student"
        title={copy.student.title}
        hint={copy.student.hint}
        selected={role === "student"}
        onSelect={() => setRole("student")}
      >
        {studentSignedIn ? (
          <Link href={copy.student.href} className="guidance-entry__continue">
            {copy.student.continue}
          </Link>
        ) : role === "student" ? (
          <PortalLoginForm />
        ) : (
          <p className="guidance-entry__card-cta">ورود با موبایل و کد یک‌بارمصرف</p>
        )}
      </AuthCard>

      <AuthCard
        id="counselor"
        title={copy.counselor.title}
        hint={copy.counselor.hint}
        selected={role === "counselor"}
        onSelect={() => setRole("counselor")}
      >
        {counselorSignedIn ? (
          <Link href={copy.counselor.href} className="guidance-entry__continue">
            {copy.counselor.continue}
          </Link>
        ) : role === "counselor" ? (
          <StaffOtpLoginForm />
        ) : (
          <p className="guidance-entry__card-cta">احراز هویت همکاران</p>
        )}
      </AuthCard>
    </div>
  );
}

function AuthCard({
  id,
  title,
  hint,
  selected,
  onSelect,
  children,
}: {
  id: Role;
  title: string;
  hint: string;
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`guidance-entry__login-card${selected ? " is-open" : ""}`}
      data-role={id}
    >
      <button
        type="button"
        className="guidance-entry__login-toggle"
        onClick={onSelect}
        aria-expanded={selected}
      >
        <span className="guidance-entry__login-mark" aria-hidden="true" />
        <span>
          <strong>{title}</strong>
          <em>{hint}</em>
        </span>
      </button>
      <div className="guidance-entry__login-body">{children}</div>
    </section>
  );
}
