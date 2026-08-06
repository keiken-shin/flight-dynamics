/* Runner for the flight model's self-check. Separate from the model so no Node
   builtin is reachable from the browser bundle. Run: npm run check */
import { demo } from "../src/sim/flight-model.js";
demo();
