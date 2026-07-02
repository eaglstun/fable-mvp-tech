import { Link } from "../router";
import { Markdown } from "../components/Markdown";
import { Legal } from "../components/Legal";
import { LANDING, ANALYSES } from "../analysis";
import "./analysis.css";

export function AnalysisIndex() {
  return (
    <div className="apage">
      <nav className="apage__nav">
        <Link href="/" className="apage__back">
          FABLE-MVP.gg
        </Link>
        <span className="apage__sec">ANALYSIS</span>
      </nav>

      <header className="apage__head">
        <h1 className="apage__title">{LANDING?.title ?? "Analysis"}</h1>
        {LANDING && (
          <div className="apage__lede">
            <Markdown source={LANDING.body} />
          </div>
        )}
      </header>

      <ol className="apage__list">
        {ANALYSES.map((a) => (
          <li className="apage__item" key={a.slug}>
            <Link href={`/analysis/${a.slug}`} className="apage__item-link">
              <span className="apage__item-date">{a.date}</span>
              <span className="apage__item-title">{a.title}</span>
              <span className="apage__item-sum">{a.summary}</span>
            </Link>
          </li>
        ))}
      </ol>

      <footer className="apage__end">
        <Legal />
      </footer>
    </div>
  );
}
