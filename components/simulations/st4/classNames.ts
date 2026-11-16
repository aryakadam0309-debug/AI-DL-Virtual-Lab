import moduleStyles from "./st4sim.module.css";

void moduleStyles;

const styles = new Proxy<Record<string, string>>({}, {
  get: (_target, name) => (typeof name === "string" ? `st4-${name}` : undefined),
});

export default styles;

