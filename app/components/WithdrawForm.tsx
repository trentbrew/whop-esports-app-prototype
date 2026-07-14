"use client";

import { useState, useTransition } from "react";
import { requestWithdrawal } from "@/app/actions";
import { formatCents } from "@/lib/money";

export function WithdrawForm({ maxCents }: { maxCents: number }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    start(async () => {
      const res = await requestWithdrawal(formData);
      if ("error" in res) setError(res.error);
      else setDone(true);
    });
  }

  if (done) {
    return (
      <div className="ready">
        <div className="check done">
          <span className="box">✓</span>
          Withdrawal requested — pending organizer approval.
        </div>
      </div>
    );
  }

  return (
    <form action={submit}>
      <label className="field">
        <span>Amount (max {formatCents(maxCents)})</span>
        <input
          className="inp money"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          max={(maxCents / 100).toFixed(2)}
          defaultValue={(maxCents / 100).toFixed(2)}
          required
        />
      </label>
      <label className="field">
        <span>Description</span>
        <textarea
          className="inp"
          name="reason"
          placeholder="Prize winnings from Weekly Wavedash — 1st place"
          required
        />
      </label>
      {error && <p className="err" style={{ marginBottom: 12 }}>{error}</p>}
      <button className="btn btn-gold btn-block" disabled={pending}>
        {pending ? "Submitting…" : "Request withdrawal"}
      </button>
    </form>
  );
}
