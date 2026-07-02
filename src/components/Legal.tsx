import "./Legal.css";

/** Site-wide copyright + source links, set in the faint provenance register. */
export function Legal() {
  return (
    <p className="legal">
      © {new Date().getFullYear()} Eric Eaglstun &nbsp;·&nbsp;{" "}
      <a href="https://github.com/eaglstun/fable-mvp-gg">source on GitHub</a> &nbsp;·&nbsp;{" "}
      <a href="https://ai.ericeaglstun.com/">ai.ericeaglstun.com</a>
    </p>
  );
}
