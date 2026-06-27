import { useRoute } from "./navigation";
import App from "./App";
import { AnalysisIndex } from "./pages/AnalysisIndex";
import { AnalysisPage } from "./pages/AnalysisPage";

/** Top-level path router. `/` (and anything unmatched) is the rig. */
export default function Root() {
  const path = useRoute();

  if (path === "/analysis" || path === "/analysis/") return <AnalysisIndex />;

  const m = path.match(/^\/analysis\/([^/]+)\/?$/);
  if (m) return <AnalysisPage slug={decodeURIComponent(m[1])} />;

  return <App />;
}
