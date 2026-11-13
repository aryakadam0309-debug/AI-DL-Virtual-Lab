import moduleStyles from "./ma2sim.module.css";

void moduleStyles;

const styles = new Proxy<Record<string, string>>({}, {
  get: (_target, name) => (typeof name === "string" ? `ma2-${name}` : undefined),
});

export default styles;