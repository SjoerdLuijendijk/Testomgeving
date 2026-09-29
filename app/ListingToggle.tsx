"use client";

import { useOptimistic, useTransition } from "react";
import { LISTING_CHANNELS, type ListingChannel } from "../lib/stoves";
import { setStoveListed } from "./actions";
import { useDialog } from "./DialogProvider";

type ListingToggleProps = {
  stoveNumber: number;
  channel: ListingChannel;
  listed: boolean;
  /** Sold-out stoves cannot be listed anywhere. */
  soldOut: boolean;
};

export default function ListingToggle({ stoveNumber, channel, listed, soldOut }: ListingToggleProps) {
  const [optimisticListed, setOptimisticListed] = useOptimistic(listed);
  const [pending, startTransition] = useTransition();
  const { notify } = useDialog();

  function toggle() {
    startTransition(async () => {
      setOptimisticListed(!optimisticListed);
      const result = await setStoveListed(stoveNumber, channel, !optimisticListed);
      if (!result.ok) await notify(result.error);
    });
  }

  return (
    <input
      type="checkbox"
      className="listing-toggle"
      checked={optimisticListed}
      onChange={toggle}
      disabled={pending || soldOut}
      title={soldOut ? "Verkocht: wordt nergens aangeboden" : undefined}
      aria-label={`Kachel ${stoveNumber} ${LISTING_CHANNELS[channel].target}`}
    />
  );
}
