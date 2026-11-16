const CLASS_NAMES = [
  "root",
  "shell",
  "topbar",
  "backLink",
  "titleBlock",
  "title",
  "subtitle",
  "columns",
  "leftColumn",
  "panel",
  "panelHeading",
  "sliderList",
  "slider",
  "sliderTop",
  "sliderLabel",
  "valuePill",
  "range",
  "hint",
  "presetBlock",
  "presetLabel",
  "presetRow",
  "presetButton",
  "presetSelected",
  "actionRow",
  "actionButton",
  "resetButton",
  "table",
  "tableRow",
  "tableLabel",
  "tableValue",
  "highlighted",
  "plotPanel",
  "legend",
  "legendItem",
  "legendSample",
  "legendPrior",
  "legendLikelihood",
  "legendPosterior",
  "plotCanvas",
  "message",
] as const;

export type St5ClassName = (typeof CLASS_NAMES)[number];

// Must match the prefix applied in st5sim.css.ts
export const styles = Object.fromEntries(
  CLASS_NAMES.map((name) => [name, `st5-${name}`]),
) as Record<St5ClassName, string>;

export default styles;