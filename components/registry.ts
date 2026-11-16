
import type { ComponentType } from "react";
import { Ma1Sim } from "./simulations/ma1";
import Ma2Sim from "./simulations/ma2/ma2sim";
import Ma3Sim from "./simulations/ma3/ma3sim";
import Ma4Sim from "./simulations/ma4/ma4sim";
import Ma5Sim from "./simulations/ma5/ma5sim";
import { St1Sim } from "./simulations/st1";
import St2Sim from "./simulations/st2";
import St3Sim from "./simulations/st3";
import St4Sim from "./simulations/st4";
import { St5Sim } from "./simulations/st5";
import St6Sim from "./simulations/st6";
import St7Sim from "./simulations/st7/st7sim";
import St8Sim from "./simulations/st8/st8sim";

export const simulationRegistry: Record<string, ComponentType> = {
  ma1: Ma1Sim,
  ma2: Ma2Sim,
  ma3: Ma3Sim,
  ma4: Ma4Sim,
  ma5: Ma5Sim,
  st1: St1Sim,
  st2: St2Sim,
  st3: St3Sim,
  st4: St4Sim,
  st5: St5Sim,
  st6: St6Sim,
  st7: St7Sim,
  st8: St8Sim,
};
