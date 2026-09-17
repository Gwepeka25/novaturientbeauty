import Link from "next/link";

export function BookingCTA({
  eyebrow = "Whenever you feel ready",
  heading = "There is a place for you here.",
  body = "Choose an in-person or online appointment and begin with one honest conversation.",
  ctaLabel = "View available appointments",
}: {
  eyebrow?: string;
  heading?: string;
  body?: string;
  ctaLabel?: string;
}) {
  return (
    <section className="wrap final">
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="serif">{heading}</h2>
      <p>{body}</p>
      <Link className="button" href="/book">
        {ctaLabel}
      </Link>
    </section>
  );
}
