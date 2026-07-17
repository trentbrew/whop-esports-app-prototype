"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Dialog,
  Text,
  TextField,
} from "@whop/react/components";
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
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

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
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button size="3" color="blue" variant="solid" style={{ width: "100%" }}>
          Enter tournament · {formatCents(feeCents)}
        </Button>
      </Dialog.Trigger>
      <Dialog.Content style={{ maxWidth: 420 }}>
        <Dialog.Title>{name}</Dialog.Title>
        <Dialog.Description>
          Tournament entry · {formatCents(feeCents)}
        </Dialog.Description>

        <div className="stack" style={{ marginTop: 16, gap: 12 }}>
          <label>
            <Text as="div" size="1" color="gray" style={{ marginBottom: 4 }}>
              Email
            </Text>
            <TextField.Root>
              <TextField.Input value="nova@circuit.gg" readOnly />
            </TextField.Root>
          </label>

          <label>
            <Text as="div" size="1" color="gray" style={{ marginBottom: 4 }}>
              Payment method
            </Text>
            <TextField.Root>
              <TextField.Input value="Card · Whop checkout" readOnly />
            </TextField.Root>
          </label>

          {error && (
            <Text size="2" color="red">
              {error}
            </Text>
          )}

          <Button
            size="3"
            color="blue"
            variant="solid"
            onClick={pay}
            loading={pending}
            disabled={pending}
            style={{ width: "100%" }}
          >
            Join · {formatCents(feeCents)}
          </Button>

          <Text size="1" color="gray" align="center">
            Payments run on Whop — 100+ methods, 195 countries.
          </Text>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
