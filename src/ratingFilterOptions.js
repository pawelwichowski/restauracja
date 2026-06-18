const RATING_OPTIONS = [
  ["0", "Dowolna"],
  ["1", "1,0 i więcej"],
  ["1.5", "1,5 i więcej"],
  ["2", "2,0 i więcej"],
  ["2.5", "2,5 i więcej"],
  ["3", "3,0 i więcej"],
  ["3.5", "3,5 i więcej"],
  ["4", "4,0 i więcej"],
  ["4.5", "4,5 i więcej"],
  ["5", "5,0"],
];

const optionSignature = RATING_OPTIONS.map(([value]) => value).join(",");

function extendRatingFilter() {
  document.querySelectorAll('select[name="minimumRating"]').forEach((select) => {
    const currentValue = select.value;
    const currentSignature = [...select.options].map((option) => option.value).join(",");

    if (currentSignature === optionSignature) return;

    select.replaceChildren(
      ...RATING_OPTIONS.map(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        return option;
      }),
    );
    select.value = RATING_OPTIONS.some(([value]) => value === currentValue)
      ? currentValue
      : "0";
  });
}

function scheduleExtension() {
  window.requestAnimationFrame(extendRatingFilter);
}

function start() {
  scheduleExtension();
  new MutationObserver(scheduleExtension).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
