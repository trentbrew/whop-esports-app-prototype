"use client";

import { useState, useTransition } from "react";
import {
  Button,
  Callout,
  Text,
  TextArea,
  TextField,
} from "@whop/react/components";
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
      <Callout.Root color="teal">
        <Callout.Text>
          Withdrawal requested — pending organizer approval.
        </Callout.Text>
      </Callout.Root>
    );
  }

  return (
    <form action={submit}>
      <div className="stack" style={{ gap: 12 }}>
        <label>
          <Text as="div" size="1" color="gray" style={{ marginBottom: 4 }}>
            Amount (max {formatCents(maxCents)})
          </Text>
          <TextField.Root>
            <TextField.Input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={(maxCents / 100).toFixed(2)}
              defaultValue={(maxCents / 100).toFixed(2)}
              required
            />
          </TextField.Root>
        </label>
        <label>
          <Text as="div" size="1" color="gray" style={{ marginBottom: 4 }}>
            Description
          </Text>
          <TextArea
            name="reason"
            placeholder="Prize winnings from Weekly Wavedash — 1st place"
            required
          />
        </label>
        {error && (
          <Text size="2" color="red">
            {error}
          </Text>
        )}
        <Button
          type="submit"
          size="3"
          color="blue"
          variant="solid"
          loading={pending}
          disabled={pending}
          style={{ width: "100%" }}
        >
          Request withdrawal
        </Button>
      </div>
    </form>
  );
}
