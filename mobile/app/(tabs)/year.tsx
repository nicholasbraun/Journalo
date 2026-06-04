import { useJournal } from '../../src/journal/JournalProvider';
import { YearScreen } from '../../src/year/YearScreen';

// The Year tab: the year-grid heatmap (the payoff view, ARCHITECTURE.md §3). Like the Today
// tab, it reads the folded state from the journal context and renders it; all selection and
// year state is the screen's own UI concern.
export default function YearTab() {
  const { state } = useJournal();
  return <YearScreen state={state} />;
}
