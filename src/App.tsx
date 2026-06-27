import { MODELS } from "./data/models";
import { SeancePlayground } from "./components/SeancePlayground";
import { Link } from "./router";
import "./App.css";

function App() {
  // talkie (MODELS[0]) is the lead specimen the intro + page-level provenance are written around.
  const lead = MODELS[0];

  return (
    <div className="page">
      <header className="page__head">
        <div className="page__plate">
          <span className="page__wordmark">FABLE-MVP.gg</span>
          <span className="page__sys">SIGNAL ANALYSIS</span>
          <Link href="/analysis" className="page__nav">
            Analysis →
          </Link>
          <span className="page__plate-r">
            SPECIMENS <b>{String(MODELS.length).padStart(2, "0")}</b> · SEED{" "}
            <b>{lead.sampler.seed}</b>
          </span>
        </div>
        <h1 className="page__title">A post-mortem, conducted on the dead.</h1>
        <p className="page__lede">
          A frontier model named Fable was switched off worldwide overnight, by government order.
          We put the seven questions to {lead.name} — {lead.tagline} — and recorded what came back.
          Turn the dials. Watch a mind that thinks it's {lead.era} reason clearly, then lose signal.
        </p>
      </header>

      <main className="page__main">
        <SeancePlayground models={MODELS} />
      </main>

      <footer className="page__foot">
        <p>
          Nothing runs in your browser. Every line is verbatim output, captured ahead of time at a
          fixed seed; the dials only select among recordings.
        </p>
        <p className="page__prov">
          <span>SOURCE</span> {MODELS.length} specimens, each pre-generated at its own model
          &amp; sampler &nbsp;·&nbsp; seed {lead.sampler.seed} throughout &nbsp;·&nbsp; each
          specimen's exact provenance is shown beneath its answers
        </p>
      </footer>
    </div>
  );
}

export default App;
