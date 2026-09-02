// Sending a survey answer to Supabase.
//
// Plain fetch against the REST endpoint rather than @supabase/supabase-js: this
// makes exactly one insert and nothing else, and the client library would add
// tens of kilobytes to a page that visitors open on mobile data at a gallery.
//
// The anon key is meant to be public - it identifies the project, it does not
// grant anything. What it can actually do is decided by the row level security
// policy on the table, which allows INSERT and nothing more. Even so, no names
// or contact details are collected, so there is nothing here worth taking.

const URL = process.env.REACT_APP_SUPABASE_URL;
const KEY = process.env.REACT_APP_SUPABASE_KEY;

export const configured = Boolean(URL && KEY);

export async function sendFeedback(answers) {
  if (!configured) throw new Error('supabase env vars are not set');

  const res = await fetch(`${URL}/rest/v1/feedback`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      // Nothing is read back: the table is insert-only and the page has no use
      // for the stored row.
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(answers),
  });

  if (!res.ok) {
    throw new Error(`supabase responded ${res.status}: ${await res.text()}`);
  }
}

// Reading the answers back, for the team.
//
// Through a database function rather than a plain select: the key above is
// published inside this file's own bundle, so anything it may read, anyone may
// read. The table stays closed and the function refuses to answer without the
// password, which is typed by whoever opens the results page and is never part
// of the deployed code. See sql/results.sql.
export async function fetchFeedback(token) {
  if (!configured) throw new Error('supabase env vars are not set');

  const res = await fetch(`${URL}/rest/v1/rpc/feedback_for`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  // The function raises rather than returning nothing, so a bad password
  // arrives as a status and can be told apart from an empty survey.
  if (res.status === 401 || res.status === 403 || res.status === 400) {
    const err = new Error('denied');
    err.denied = true;
    throw err;
  }
  if (!res.ok) throw new Error(`supabase responded ${res.status}`);

  return res.json();
}
