import moduleStyles from "./st6sim.module.css";

void moduleStyles;

const styles = new Proxy<Record<string, string>>({}, {
  get: (_target, name) => (typeof name === "string" ? `st6-${name}` : undefined),
});

export default styles;

