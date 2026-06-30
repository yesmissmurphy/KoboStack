"use client";

import { useFormState, useFormStatus } from "react-dom";
import { addSubstack } from "./actions";

const initialState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? "Adding…" : "Add to shelf"}
    </button>
  );
}

export default function AddForm() {
  const [state, formAction] = useFormState(addSubstack, initialState);

  return (
    <form action={formAction}>
      <div className="form-row">
        <div>
          <label className="field-label" htmlFor="url">
            Substack URL
          </label>
          <input
            id="url"
            name="url"
            type="text"
            placeholder="yourwriter.substack.com"
            required
          />
        </div>
        <SubmitButton />
      </div>
      {state?.error && <p className="message error">{state.error}</p>}
    </form>
  );
}
