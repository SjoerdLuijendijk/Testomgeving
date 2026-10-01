"use client";

import { useTransition } from "react";
import type { NoteStove } from "../lib/stove-note-queries";
import type { StoveNote } from "../lib/stove-notes";
import { adjustStoveStock } from "./actions";
import { useDialog } from "./DialogProvider";
import { closeStoveNote } from "./note-actions";

type RestockMode = "ask" | "always";

// Status changes that need no details: marking a sale as delivered, or cancelling a negotiation or sale.
// A cancelled sale can put the stove back in stock ("ask" asks first, "always" for a used stove set
// back to "Te koop").
export function useNoteClosing() {
  const [pending, startTransition] = useTransition();
  const { confirm, notify } = useDialog();

  async function closeNote(stove: Pick<NoteStove, "number" | "madeToOrder">, note: StoveNote, status: "done" | "cancelled", restockMode: RestockMode = "ask") {
    const cancelsSale = status === "cancelled" && note.status === "sold";
    const confirmed = await confirm(
      status === "done"
        ? { title: `Kachel ${stove.number} afgeleverd?`, message: "Opgehaald of bezorgd. De kachel verdwijnt uit de lijst Af te leveren.", confirmLabel: "Afgeleverd" }
        : cancelsSale
          ? { title: `Verkoop kachel ${stove.number} annuleren?`, confirmLabel: "Verkoop annuleren", danger: true }
          : { title: `Onderhandeling kachel ${stove.number} stoppen?`, message: "De kachel blijft te koop.", confirmLabel: "Stoppen", danger: true },
    );
    if (!confirmed) return;
    const restock =
      cancelsSale &&
      !stove.madeToOrder &&
      (restockMode === "always" ||
        (await confirm({ title: `Kachel ${stove.number} weer op voorraad?`, message: "Zet de kachel terug in de voorraad als hij weer te koop is.", confirmLabel: "Weer op voorraad" })));

    startTransition(async () => {
      const result = await closeStoveNote(note.id, status);
      if (!result.ok) return notify(result.error);
      if (restock) {
        const restocked = await adjustStoveStock(stove.number, 1);
        if (!restocked.ok) await notify(`De verkoop is geannuleerd, maar: ${restocked.error}`);
      }
    });
  }

  async function restockSoldStove(stoveNumber: number) {
    const confirmed = await confirm({ title: `Kachel ${stoveNumber} weer te koop zetten?`, confirmLabel: "Te koop zetten" });
    if (!confirmed) return;
    startTransition(async () => {
      const result = await adjustStoveStock(stoveNumber, 1);
      if (!result.ok) await notify(result.error);
    });
  }

  return { closeNote, restockSoldStove, pending };
}
