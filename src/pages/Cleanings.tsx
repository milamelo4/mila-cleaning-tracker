import { useContext } from "react";
import { CleaningContext } from "../context/CleaningContext";

function Cleanings() {
  const cleaningContext = useContext(CleaningContext);

  if (!cleaningContext) {
    throw new Error("CleaningContext not found");
  }

  const { cleanings } = cleaningContext;

  return <h1>Cleanings ({cleanings.length})</h1>;
}

export default Cleanings;