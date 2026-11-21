// Owner: M4
// PHP1 per 5 answers. Replace the button with the real questions.
// Fake Premium reads state.credit and barely helps.

import { send, onState } from "../shared/api.js";

onState((state) => {
  document.getElementById("credit").textContent = `Credit: ${state.credit}`;
});

document.getElementById("answer").addEventListener("click", () => {
  send({ type: "addStat", key: "surveyAnswers", amount: 5 });
  send({ type: "addCredit", amount: 1 });
});
