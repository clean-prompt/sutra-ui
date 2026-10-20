/**
 * A text arrow that means "from, to" (`a → b`): it mirrors in right-to-left text, where the reading direction runs the
 * other way. Decorative (`aria-hidden`); the surrounding text carries the meaning.
 */
export function FlowArrow() {
  return (
    <span aria-hidden className="inline-block rtl:-scale-x-100">
      →
    </span>
  );
}
