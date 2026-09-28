"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "../auth/actions";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, {} satisfies LoginState);

  return (
    <form action={formAction} className="form-stack">
      <label htmlFor="email">E-mailadres</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="username"
        inputMode="email"
        required
        defaultValue={state.email}
        placeholder="naam@woonwarmer.nl"
      />
      <label htmlFor="password">Wachtwoord</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={72} />
      {state.error && <p className="field-error" role="alert">{state.error}</p>}
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Inloggen…" : "Inloggen"}
      </button>
    </form>
  );
}
