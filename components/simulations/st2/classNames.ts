import moduleStyles from "./st2sim.module.css";

void moduleStyles;

const styles = new Proxy<Record<string, string>>({}, {
  get: (_target, name) => (typeof name === "string" ? `st2-${name}` : undefined),
});

export default styles;

