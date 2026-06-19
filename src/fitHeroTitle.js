const TITLE_SELECTOR = "#page-title";
const MAX_FONT_SIZE_PX = 48;
const MIN_FONT_SIZE_PX = 12;

function fitHeroTitle(title) {
  let low = MIN_FONT_SIZE_PX;
  let high = MAX_FONT_SIZE_PX;

  title.style.whiteSpace = "nowrap";

  for (let step = 0; step < 12; step += 1) {
    const size = (low + high) / 2;
    title.style.fontSize = `${size}px`;

    if (title.scrollWidth <= title.clientWidth) {
      low = size;
    } else {
      high = size;
    }
  }

  title.style.fontSize = `${Math.floor(low * 10) / 10}px`;
}

function connectHeroTitle() {
  const title = document.querySelector(TITLE_SELECTOR);
  if (!title) {
    window.requestAnimationFrame(connectHeroTitle);
    return;
  }

  let animationFrameId = null;
  const scheduleFit = () => {
    if (animationFrameId !== null) {
      window.cancelAnimationFrame(animationFrameId);
    }
    animationFrameId = window.requestAnimationFrame(() => fitHeroTitle(title));
  };

  const resizeObserver = new ResizeObserver(scheduleFit);
  resizeObserver.observe(title);
  if (title.parentElement) {
    resizeObserver.observe(title.parentElement);
  }

  window.addEventListener("resize", scheduleFit);
  scheduleFit();
}

window.requestAnimationFrame(connectHeroTitle);
