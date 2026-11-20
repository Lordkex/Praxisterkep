// A translated line with its key phrase marked in the copy as **…**: the
// marked part is set in <strong>, so a reader skimming the landing catches it
// without reading the whole sentence. Unmarked text renders as it is.
import { Fragment } from 'react';

export function Emph({ text }: { text: string }) {
  return (
    <>
      {text.split('**').map((part, i) =>
        i % 2 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>)}
    </>
  );
}
