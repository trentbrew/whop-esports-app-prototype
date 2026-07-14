"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { enterTournament } from "@/app/actions";
import { formatCents } from "@/lib/money";

export function EnterButton({
  tournamentId,
  name,
  feeCents,
}: {
  tournamentId: string;
  name: string;
  feeCents: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => setMounted(true), []);

  function pay() {
    setError(null);
    start(async () => {
      const res = await enterTournament(tournamentId);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      if (res.mode === "whop") {
        router.push(`/checkout?session=${encodeURIComponent(res.sessionId)}`);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button className="btn btn-gold btn-block" onClick={() => setOpen(true)}>
        Enter tournament · <span className="amt">{formatCents(feeCents)}</span>
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            className="overlay"
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          >
          <div className="panel modal" role="dialog" aria-modal="true">
            <div className="modal-head">
              <div>
                <h3>{name}</h3>
                <div className="sub">
                  Tournament entry · {formatCents(feeCents)}
                </div>
              </div>
              <button className="x" onClick={() => setOpen(false)} aria-label="Close">
                ×
              </button>
            </div>

            <label className="field">
              <span>Email</span>
              <input className="inp" value="nova@circuit.gg" readOnly />
            </label>

            <label className="field">
              <span>Payment method</span>
              <input className="inp" value="Card · Whop checkout" readOnly />
            </label>

            {error && <p className="err" style={{ marginBottom: 12 }}>{error}</p>}

            <button
              className="btn btn-gold btn-block"
              onClick={pay}
              disabled={pending}
            >
              {pending ? "Processing…" : `Join · `}
              {!pending && <span className="amt">{formatCents(feeCents)}</span>}
            </button>
            <p
              className="muted"
              style={{ fontSize: 12, textAlign: "center", marginTop: 12 }}
            >
              Payments run on Whop — 100+ methods, 195 countries.
            </p>
          </div>
          </div>,
          document.body,
        )}
    </>
  );
}
