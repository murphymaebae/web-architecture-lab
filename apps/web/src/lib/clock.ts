// React wants components to be "pure": same inputs, same output. Reading the
// clock breaks that rule on purpose here, because the whole point of the
// rendering demos is to show WHEN a piece of HTML was made. Keeping the call
// in one named helper makes that intent obvious (and keeps the linter happy).

/** The current time in milliseconds. Only use it to label render times. */
export function renderTimestamp(): number {
  return Date.now();
}
