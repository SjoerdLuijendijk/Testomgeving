"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "../auth/actions";

const INITIAL_STATE: LoginState = { status: "idle" };

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(sendMagicLink, INITIAL_STATE);

  if (state.status === "sent") {
    return (
      <div className="notice notice--success" role="status">
        <strong>Check je mail</strong>
        <p>Heeft {state.message} toegang, dan staat er een inloglink in je inbox. Open de link op dit apparaat.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="form-stack">
      <label htmlFor="email">E-mailadres</label>
      <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="naam@woonwarmer.nl" />
      {state.status === "error" && <p className="field-error" role="alert">{state.message}</p>}
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Versturen…" : "Stuur inloglink"}
      </button>
    </form>
  );
}
