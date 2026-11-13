
import type { ComponentType } from "react";
import { Ma1Sim } from "./simulations/ma1";
import Ma2Sim from "./simulations/ma2/ma2sim";
import Ma3Sim from "./simulations/ma3/ma3sim";
import Ma4Sim from "./simulations/ma4/ma4sim";
import Ma5Sim from "./simulations/ma5/ma5sim";

export const simulationRegistry: Record<string, ComponentType> = {
  ma1: Ma1Sim,
  ma2: Ma2Sim,
  ma3: Ma3Sim,
  ma4: Ma4Sim,
  ma5: Ma5Sim,
};
