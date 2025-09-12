(function () {
  class Parallax {
    constructor() {
      this.blocks = [];
      this.observer = null;
      this.activeBlocks = new Set();

      this.init();
    }

    init() {
      const blocks = document.querySelectorAll('[data-parallax]');

      blocks.forEach((block) => {
        const layers = block.querySelectorAll('[data-parallax-layer]');

        const layersData = Array.from(layers).map((layer) => {
          layer.style.willChange = 'transform';

          return {
            el: layer,
            speed: parseInt(layer.dataset.parallaxSpeed || 1, 10) / 10,
          };
        });

        this.blocks.push({ el: block, layers: layersData });
      });

      this.createObserver();
      this.animate();
    }

    createObserver() {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              this.activeBlocks.add(entry.target);
            } else {
              this.activeBlocks.delete(entry.target);
            }
          });
        },
        { threshold: 0 }
      );

      this.blocks.forEach((block) => this.observer.observe(block.el));
    }

    animate() {
      const scrollY = window.scrollY;

      this.activeBlocks.forEach((el) => {
        const block = this.blocks.find((b) => b.el === el);
        if (!block) return;

        const rect = block.el.getBoundingClientRect();
        const top = rect.top + scrollY;
        const offset = scrollY - top;

        block.layers.forEach((layer) => {
          layer.el.style.transform = `translateY(${offset * layer.speed}px)`;
        });
      });

      requestAnimationFrame(this.animate.bind(this));
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    new Parallax();
  });
})();

(function () {
  class SmoothScroll {
    constructor(options = {}) {
      this.settings = {
        speed: 0.02,
        friction: 0.9,
        wheelFactor: 0.2,
        keyFactor: 0.2,
        pageFactor: 0.9,
        ...options,
      };

      this.current = window.scrollY;
      this.target = window.scrollY;
      this.velocity = 0;
      this.ticking = false;

      this.update = this.update.bind(this);
      this.onWheel = this.onWheel.bind(this);
      this.onScroll = this.onScroll.bind(this);
      this.onKeyDown = this.onKeyDown.bind(this);
    }

    update() {
      this.velocity *= this.settings.friction;
      this.target += this.velocity;
      this.current += (this.target - this.current) * this.settings.speed;

      const maxScroll = document.body.scrollHeight - window.innerHeight;

      if (this.current < 0) {
        this.current = 0;
        this.target = 0;
        this.velocity = 0;
      }

      if (this.current > maxScroll) {
        this.current = maxScroll;
        this.target = maxScroll;
        this.velocity = 0;
      }

      window.scrollTo(0, this.current);

      if (
        Math.abs(this.target - this.current) > 0.5 ||
        Math.abs(this.velocity) > 0.5
      ) {
        requestAnimationFrame(this.update);
      } else {
        this.ticking = false;
      }
    }

    startRAF() {
      if (!this.ticking) {
        this.ticking = true;
        requestAnimationFrame(this.update);
      }
    }

    onWheel(e) {
      e.preventDefault();
      this.velocity += e.deltaY * this.settings.wheelFactor;
      this.startRAF();
    }

    onScroll() {
      if (Math.abs(window.scrollY - this.current) > 5) {
        this.current = window.scrollY;
        this.target = window.scrollY;
        this.velocity = 0;
      }
    }

    onKeyDown(e) {
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      let handled = false;

      switch (e.key) {
        case 'ArrowDown':
          this.velocity += 100 * this.settings.keyFactor;
          handled = true;
          break;
        case 'ArrowUp':
          this.velocity -= 100 * this.settings.keyFactor;
          handled = true;
          break;
        case 'PageDown':
          this.target = Math.min(
            this.current + window.innerHeight * this.settings.pageFactor,
            maxScroll
          );
          handled = true;
          break;
        case 'PageUp':
          this.target = Math.max(
            this.current - window.innerHeight * this.settings.pageFactor,
            0
          );
          handled = true;
          break;
        case 'Home':
          this.target = 0;
          handled = true;
          break;
        case 'End':
          this.target = maxScroll;
          handled = true;
          break;
      }

      if (handled) {
        e.preventDefault();
        this.startRAF();
      }
    }

    enable() {
      window.addEventListener('wheel', this.onWheel, { passive: false });
      window.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('keydown', this.onKeyDown);
    }

    disable() {
      window.removeEventListener('wheel', this.onWheel);
      window.removeEventListener('scroll', this.onScroll);
      window.removeEventListener('keydown', this.onKeyDown);
      this.ticking = false;
      this.velocity = 0;
    }
  }

  new SmoothScroll().enable();
})();

(function () {
  class ScrollAnimator {
    constructor(options = {}) {
      this.prefix = options.prefix || 'Animate_';
      this.offset = options.offset || 200;
      this.scrollY = window.scrollY;
      this.scrollDirection = null;
      this.elements = [];
    }

    init() {
      this.elements = document.querySelectorAll('[data-animate]');

      this.elements.forEach((el) => {
        const timingFunction = el.dataset.animateFunction || 'linear';
        const duration = parseInt(el.dataset.animateDuration, 10) || 400;

        el.style.transitionTimingFunction = timingFunction;
        el.style.transitionDuration = `${duration / 1000}s`;

        const offset = this.getOffset(el);

        el._observer = new IntersectionObserver(
          (entries) => this.handleIntersect(entries),
          { root: null, rootMargin: `0px 0px -${offset}px 0px`, threshold: 0 }
        );

        el._observer.observe(el);
      });

      this.injectStyles();

      window.addEventListener('scroll', () => {
        this.scrollDirection = window.scrollY > this.scrollY ? 'down' : 'up';
        this.scrollY = window.scrollY;
      });

      this.checkInitialPositions();
    }

    destroy() {
      this.elements.forEach((el) => {
        if (el._observer) el._observer.disconnect();
        if (el._timeout) clearTimeout(el._timeout);
      });
    }

    getAnimateClass(el) {
      return this.prefix + el.dataset.animate;
    }

    getOffset(el) {
      const offset = parseInt(el.dataset.animateOffset, 10);
      return isNaN(offset) ? this.offset : offset;
    }

    getDelay(el) {
      const delay = parseInt(el.dataset.animateDelay, 10);
      return isNaN(delay) ? 0 : delay;
    }

    addAnimateClass(el) {
      const animateClass = this.getAnimateClass(el);
      const delay = this.getDelay(el);

      if (delay > 0) {
        el._timeout = setTimeout(() => {
          el.classList.add(animateClass);
          el._timeout = null;
        }, delay);
      } else {
        el.classList.add(animateClass);
      }
    }

    checkInitialPositions() {
      const scrollY = window.scrollY;

      this.elements.forEach((el) => {
        const elTop = el.getBoundingClientRect().top + scrollY;
        const offset = this.getOffset(el);

        if (elTop < scrollY + offset + 1) {
          el.classList.add(this.getAnimateClass(el));
        }
      });
    }

    handleIntersect(entries) {
      entries.forEach((entry) => {
        const el = entry.target;
        const animateClass = this.getAnimateClass(el);

        if (entry.isIntersecting) {
          this.addAnimateClass(el);
        } else if (this.scrollDirection === 'up') {
          el.classList.remove(animateClass);
          if (el._timeout) {
            clearTimeout(el._timeout);
            el._timeout = null;
          }
        }
      });
    }

    injectStyles() {
      const style = document.createElement('style');
      style.textContent = `
      [data-animate="fadeIn"] {
        opacity: 0;
        transition: opacity;
        will-change: opacity;
      }
      .${this.prefix}fadeIn {
        opacity: 1;
      }
      [data-animate="fadeLeft"] {
        opacity: 0;
        transform: translateX(-20%);
        transition: opacity, transform;
        will-change: opacity, transform;
      }
      .${this.prefix}fadeLeft {
        opacity: 1;
        transform: translateX(0);
      }
      [data-animate="fadeRight"] {
        opacity: 0;
        transform: translateX(20%);
        transition: opacity, transform;
        will-change: opacity, transform;
      }
      .${this.prefix}fadeRight {
        opacity: 1;
        transform: translateX(0);
      }
    `;
      document.head.appendChild(style);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    new ScrollAnimator().init();
  });
})();
