// Entry of the static settlement pages: the light/dark and colour-scheme
// buttons of their top bar (navtools.ts), and the links that carry the
// settlement on to the app pages (lib/linkContext.ts: the address is in
// data-ctx until the reader acts on the link). Built on its own by
// vite.config.ts.
import { mountStatic } from './navtools';
import { installLinkContext, staticTarget } from './lib/linkContext';

mountStatic();
installLinkContext(staticTarget);
