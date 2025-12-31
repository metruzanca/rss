import { redirect, type RouteDefinition } from "@solidjs/router";
import { useSubmission } from "@solidjs/router";
import { Show } from "solid-js";
import { createSuperuser } from "~/api";
import { hasSuperusers } from "~/api/server";
import { PATHS } from "~/lib/constants";

export const route = {
  async preload() {
    // Check if superusers exist, redirect to login if they do
    const superusersExist = await hasSuperusers();
    if (superusersExist) {
      throw redirect(PATHS.auth.login);
    }
  },
} satisfies RouteDefinition;

export default function Setup() {
  const creating = useSubmission(createSuperuser);

  return (
    <main>
      <h1>Create First Superuser</h1>
      <p>No superusers found. Please create the first superuser account.</p>
      <form action={createSuperuser} method="post">
        <div>
          <label for="username-input">Username</label>
          <input
            id="username-input"
            name="username"
            placeholder="admin"
            autocomplete="username"
            required
          />
        </div>
        <div>
          <label for="password-input">Password</label>
          <input
            id="password-input"
            name="password"
            type="password"
            placeholder="Enter a secure password"
            autocomplete="new-password"
            required
          />
        </div>
        <button type="submit">Create Superuser</button>
        <Show when={creating.result}>
          <p
            style={{
              color: creating.result instanceof Error ? "red" : "green",
            }}
            role="alert"
            id="error-message"
          >
            {creating.result instanceof Error
              ? creating.result.message
              : "Superuser created successfully! Redirecting..."}
          </p>
        </Show>
      </form>
    </main>
  );
}
