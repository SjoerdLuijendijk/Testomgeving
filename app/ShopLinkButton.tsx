"use client";

import { useTransition } from "react";
import { linkStoveToShop } from "./actions";
import { useDialog } from "./DialogProvider";

// For a stove imported from the web shop: the app leaves its shop product alone until linked here.
export default function ShopLinkButton({ stoveNumber }: { stoveNumber: number }) {
  const [pending, startTransition] = useTransition();
  const { confirm, notify } = useDialog();

  async function link() {
    const confirmed = await confirm({
      title: `Kachel ${stoveNumber} koppelen aan de webshop?`,
      message:
        "Het webshopproduct wordt nu meteen bijgewerkt met de gegevens uit de app: naam, prijs, beschrijving, categorie, kenmerken, foto's en voorraad. De foto's worden opnieuw geüpload. Daarna past de app het product bij elke wijziging automatisch aan.",
      confirmLabel: "Koppelen en bijwerken",
    });
    if (!confirmed) return;
    startTransition(async () => {
      const result = await linkStoveToShop(stoveNumber);
      if (!result.ok) await notify(result.error, "Koppelen");
    });
  }

  return (
    <button
      type="button"
      className="link-shop-button"
      onClick={link}
      disabled={pending}
      title="Geïmporteerd uit de webshop. De app verandert het webshopproduct pas na koppelen."
      aria-label={`Kachel ${stoveNumber} koppelen aan de webshop`}
    >
      {pending ? "Bezig…" : "Koppelen"}
    </button>
  );
}
