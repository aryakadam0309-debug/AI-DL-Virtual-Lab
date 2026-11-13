import moduleStyles from "./ma1sim.module.css";

void moduleStyles;

const styles = new Proxy<Record<string, string>>({}, {
  get: (_target, name) => (typeof name === "string" ? `ma1-${name}` : undefined),
});

export default styles;

