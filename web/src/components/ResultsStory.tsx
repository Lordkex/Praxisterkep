// The animated tour of the results, right under the search: open, not folded
// away, because a folded story is a story nobody plays. Its lines stay in the
// page for screen readers, not as a disclosure under the picture.
import { useHighlights } from '../lib/highlights';
import { HighlightsStory } from './story/PageStories';
import { StoryPending } from './story/Story';

export function ResultsStory() {
  const data = useHighlights();
  return (
    <div className="results-story">
      {data ? <HighlightsStory data={data} script={false} /> : <StoryPending script={false} />}
    </div>
  );
}
