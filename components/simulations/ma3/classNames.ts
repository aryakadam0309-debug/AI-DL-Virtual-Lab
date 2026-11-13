import moduleStyles from "./ma3sim.module.css";

void moduleStyles;

const styles = new Proxy<Record<string, string>>({}, {
  get: (_target, name) => (typeof name === "string" ? `ma3-${name}` : undefined),
});

export default styles;

