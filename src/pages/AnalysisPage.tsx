import { Link } from "../router";
import { Markdown } from "../components/Markdown";
import { Legal } from "../components/Legal";
import { getAnalysis } from "../analysis";
import "./analysis.css";

export function AnalysisPage({ slug }: { slug: string }) {
  const a = getAnalysis(slug);

  if (!a) {
    return (
      <div className="apage">
        <nav className="apage__nav">
          <Link href="/analysis" className="apage__back">
            ANALYSIS
          </Link>
        </nav>
        <p className="apage__missing">[ no such reading on file: {slug} ]</p>
      </div>
    );
  }

  return (
    <div className="apage">
      <nav className="apage__nav">
        <Link href="/" className="apage__back">
          FABLE-MVP.tech
        </Link>
        <Link href="/analysis" className="apage__sec apage__sec--link">
          ANALYSIS
        </Link>
      </nav>

      <article className="apage__article">
        <header className="apage__head">
          <span className="apage__date">{a.date}</span>
          <h1 className="apage__title">{a.title}</h1>
        </header>

        <Markdown source={a.body} />

        <footer className="apage__foot">
          <Link href="/analysis">← all readings</Link>
          <Link href="/">the rig →</Link>
        </footer>
        <Legal />
      </article>
    </div>
  );
}
