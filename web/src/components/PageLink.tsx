import type { ReactNode } from 'react';

/** A link to another page (or another part of the site), drawn as a small
 *  button with a trailing arrow, in the spirit of the landing page's card
 *  pointing to the non-territorial practices. Inline links inside a
 *  sentence stay plain; this is for the "read more over there" ones. */
export function PageLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a className={`pagelink${className ? ` ${className}` : ''}`} href={href}>
      <span className="pagelink__text">{children}</span>
      <span className="pagelink__arrow" aria-hidden="true">→</span>
    </a>
  );
}
