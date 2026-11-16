const raw = `
.root {
  --st5-ivory: #faf6ee;
  --st5-panel: #fffdf9;
  --st5-border: #eadfcb;
  --st5-maroon: #5a1626;
  --st5-maroon-dark: #3a0e18;
  --st5-maroon-hover: #7e2a3c;
  --st5-sand: #dccbae;
  --st5-sand-dark: #b9a88f;
  --st5-ink: #2a1a1d;
  --st5-muted: #7a6a66;
  --st5-grid: #efe6d6;
  box-sizing: border-box;
  min-height: 100vh;
  background: var(--st5-ivory);
  color: var(--st5-ink);
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
}

.root *,
.root *::before,
.root *::after {
  box-sizing: border-box;
}

.shell {
  width: min(100%, 1440px);
  margin: 0 auto;
  padding: 0 32px 36px;
}

.topbar {
  min-height: 55px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--st5-border);
}

.backLink {
  color: var(--st5-maroon);
  font-size: 13px;
  text-decoration: none;
  text-underline-offset: 4px;
}

.backLink:hover {
  text-decoration: underline;
}

.backLink:focus-visible,
.root button:focus-visible,
.range:focus-visible {
  outline: 2px solid var(--st5-maroon-hover);
  outline-offset: 3px;
}

.titleBlock {
  padding: 23px 0 21px;
}

.title {
  margin: 0;
  color: var(--st5-maroon-dark);
  font-family: "Iowan Old Style", Palatino, Georgia, serif;
  font-size: 30px;
  font-weight: 500;
  line-height: 1.2;
}

.subtitle {
  margin: 7px 0 0;
  color: var(--st5-muted);
  font-size: 14px;
  line-height: 1.45;
}

.columns {
  display: grid;
  grid-template-columns: minmax(315px, 380px) minmax(0, 1fr);
  align-items: start;
  gap: 25px;
}

.leftColumn {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.panel,
.plotPanel {
  min-width: 0;
  border: 1px solid var(--st5-border);
  border-radius: 4px;
  background: var(--st5-panel);
}

.panel {
  padding: 17px 18px 16px;
}

.panelHeading {
  margin: 0 0 15px;
  padding-bottom: 9px;
  border-bottom: 1px solid var(--st5-border);
  color: var(--st5-maroon);
  font-family: "Iowan Old Style", Palatino, Georgia, serif;
  font-size: 18px;
  font-weight: 500;
  line-height: 1.2;
}

.sliderList {
  display: grid;
  gap: 12px;
}

.slider {
  min-width: 0;
}

.sliderTop {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.sliderLabel {
  color: var(--st5-ink);
  font-size: 13px;
  line-height: 1.3;
}

.valuePill {
  min-width: 52px;
  padding: 3px 8px;
  border: 1px solid var(--st5-sand);
  border-radius: 999px;
  background: var(--st5-ivory);
  color: var(--st5-maroon);
  font-family: "Iowan Old Style", Palatino, Georgia, serif;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  text-align: center;
}

.range {
  display: block;
  width: 100%;
  height: 22px;
  margin: 3px 0 0;
  appearance: none;
  background: transparent;
  cursor: pointer;
  touch-action: pan-y;
}

.range::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(to right, var(--st5-maroon) 0, var(--st5-maroon) var(--st5-fill), var(--st5-sand) var(--st5-fill), var(--st5-sand) 100%);
}

.range::-moz-range-track {
  height: 4px;
  border-radius: 999px;
  background: var(--st5-sand);
}

.range::-moz-range-progress {
  height: 4px;
  border-radius: 999px;
  background: var(--st5-maroon);
}

.range::-webkit-slider-thumb {
  width: 14px;
  height: 14px;
  margin-top: -5px;
  appearance: none;
  border: 2px solid var(--st5-maroon);
  border-radius: 50%;
  background: var(--st5-ivory);
  box-shadow: 0 1px 3px rgb(42 26 29 / 18%);
  transition: transform 120ms ease;
}

.range::-moz-range-thumb {
  width: 11px;
  height: 11px;
  border: 2px solid var(--st5-maroon);
  border-radius: 50%;
  background: var(--st5-ivory);
  box-shadow: 0 1px 3px rgb(42 26 29 / 18%);
  transition: transform 120ms ease;
}

.range:hover::-webkit-slider-thumb,
.range:hover::-moz-range-thumb {
  transform: scale(1.15);
}

.hint {
  margin: 1px 0 0;
  color: var(--st5-muted);
  font-size: 11px;
  line-height: 1.35;
}

.presetBlock {
  margin-top: 17px;
}

.presetLabel {
  margin: 0 0 7px;
  color: var(--st5-muted);
  font-size: 11px;
}

.presetRow {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.presetButton,
.actionButton {
  min-height: 32px;
  padding: 6px 9px;
  border: 1px solid var(--st5-border);
  border-radius: 4px;
  background: var(--st5-panel);
  color: var(--st5-ink);
  font: inherit;
  font-size: 11px;
  line-height: 1.2;
  cursor: pointer;
}

.presetButton:hover,
.actionButton:hover:not(:disabled) {
  border-color: var(--st5-maroon-hover);
  color: var(--st5-maroon);
}

.presetSelected {
  border-color: var(--st5-maroon);
  background: var(--st5-maroon);
  color: var(--st5-ivory);
}

.presetSelected:hover {
  background: var(--st5-maroon-hover);
  color: var(--st5-ivory);
}

.actionRow {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 12px;
}

.actionButton:disabled {
  color: var(--st5-muted);
  cursor: not-allowed;
  opacity: 0.55;
}

.resetButton {
  margin-left: auto;
  color: var(--st5-maroon);
}

.table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.tableRow + .tableRow {
  border-top: 1px solid var(--st5-border);
}

.tableLabel,
.tableValue {
  padding: 10px 7px;
  vertical-align: top;
  text-align: left;
}

.tableLabel {
  width: 39%;
  color: var(--st5-muted);
  font-size: 11px;
  font-weight: 400;
  line-height: 1.45;
}

.tableValue {
  color: var(--st5-ink);
  font-family: "Iowan Old Style", Palatino, Georgia, serif;
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
}

.highlighted {
  border-top: 0 !important;
  background: var(--st5-maroon);
}

.highlighted .tableLabel,
.highlighted .tableValue {
  color: var(--st5-ivory);
}

.highlighted .tableLabel {
  font-weight: 600;
}

.highlighted .tableValue {
  font-size: 14px;
  font-weight: 700;
}

.plotPanel {
  position: sticky;
  top: 16px;
  display: flex;
  height: clamp(340px, 66vh, 600px);
  flex-direction: column;
  padding: 14px 16px 12px;
}

.legend {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px;
  padding: 1px 4px 3px;
  color: var(--st5-muted);
  font-size: 11px;
}

.legendItem {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legendSample {
  display: inline-block;
  width: 23px;
  height: 0;
  border-top: 2px solid currentColor;
}

.legendPrior {
  color: var(--st5-sand-dark);
  border-top-width: 1.5px;
}

.legendLikelihood {
  color: var(--st5-maroon-hover);
  border-top-style: dashed;
}

.legendPosterior {
  color: var(--st5-maroon);
  border-top-width: 2px;
}

.plotCanvas {
  display: block;
  width: 100%;
  min-height: 0;
  flex: 1 1 auto;
}

.message {
  flex: 0 0 auto;
  margin: 5px 2px 0;
  color: var(--st5-maroon-dark);
  font-family: "Iowan Old Style", Palatino, Georgia, serif;
  font-size: 14px;
  line-height: 1.4;
}

@media (max-width: 860px) {
  .shell {
    padding-right: 20px;
    padding-left: 20px;
  }

  .columns {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }

  .plotPanel {
    position: static;
    grid-row: 1;
    height: 330px;
  }

  .leftColumn {
    grid-row: 2;
  }
}

@media (max-width: 480px) {
  .shell {
    padding-right: 14px;
    padding-left: 14px;
  }

  .title {
    font-size: 26px;
  }

  .plotPanel {
    padding-right: 10px;
    padding-left: 10px;
  }

  .legend {
    gap: 10px;
  }

  .panel {
    padding-right: 13px;
    padding-left: 13px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .root *,
  .root *::before,
  .root *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
`;

// Prefix every class selector (.title -> .st5-title) so they can't collide
// with global classes on the host page. Only matches a dot followed by a
// letter, so values like 1.5px or 0.55 are untouched.
const cssText = raw.replace(/\.([a-zA-Z][\w-]*)/g, ".st5-$1");

export default cssText;