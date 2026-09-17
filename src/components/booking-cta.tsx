import Link from "next/link";

export function BookingCTA({
  eyebrow = "Whenever you feel ready",
  heading = "Let the first conversation be enough.",
  body = "Choose an in-person or online appointment. You do not need to explain everything before you arrive.",
  ctaLabel = "View available appointments",
}: {
  eyebrow?: string;
  heading?: string;
  body?: string;
  ctaLabel?: string;
}) {
  return (
    <section className="final">
      <div className="eyebrow">{eyebrow}</div>
      <h2 className="serif">{heading}</h2>
      <p>{body}</p>
      <Link className="button button-rust" href="/book">
        {ctaLabel}
      </Link>
    </section>
  );
}
