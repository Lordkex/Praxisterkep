// MapLibre's constructor throws where the browser cannot give it WebGL.
// Thrown inside an effect, that unmounts the whole React page, so every map
// in the app is created here and answers null instead.
import { Map as MLMap, type MapOptions } from 'maplibre-gl';

export function createMap(options: MapOptions & { container: HTMLElement }): MLMap | null {
  try {
    return new MLMap(options);
  } catch (err) {
    if (!(err instanceof Error && err.message.includes('Failed to initialize WebGL'))) throw err;
    // the constructor has already put its canvas and controls in the box
    options.container.replaceChildren();
    return null;
  }
}
