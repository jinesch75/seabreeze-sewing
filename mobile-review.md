# Sea Breeze Sewing BDA — Mobile UX Review

*Reviewed March 2026 · All pages: index.html, about.html, contact.html, style.css*

---

## What's Working Well

The site has a solid mobile foundation in several areas:

**Viewport & meta setup** — Every page correctly declares `width=device-width, initial-scale=1.0, viewport-fit=cover`. The `viewport-fit=cover` is a nice touch that lets the background extend under the iPhone notch and Dynamic Island.

**Hamburger menu** — The hamburger button is explicitly sized to 44×44px with a comment in the CSS referencing the Apple/WCAG touch target guideline. It includes `touch-action: manipulation` (prevents the 300ms tap delay on older Android browsers) and `-webkit-tap-highlight-color: transparent` (removes the default blue flash on tap). The full-screen overlay menu uses `env(safe-area-inset-top/bottom)` so it respects the iPhone home indicator and notch — this is excellent attention to detail.

**Responsive breakpoints** — There are two breakpoints: 1024px (tablet) and 768px (phone). At 768px, the site correctly collapses the form's two-column row to a single column, stacks the footer, stacks the contact layout, and hides the decorative scroll indicator.

**Typography** — `clamp()` is used on the hero heading (`clamp(2.4rem, 6vw, 4.2rem)`) and section titles, so text scales fluidly rather than jumping abruptly.

**Clickable contact info** — The phone number uses `tel:` and the email uses `mailto:`, so both are natively tappable on any phone — a customer can call or email directly from the site.

**Modal safety** — The interest modal has `max-height: 90vh; overflow-y: auto`, so it won't overflow on small screens when the form is long.

---

## Issues to Fix

### 1. Design card photos are too short on mobile — *High Priority*

The product image area on each design card is a fixed `height: 130px`. On a phone (~375px wide with 24px padding each side), the card fills the full column width — so the photo ends up as a very wide, squat landscape rectangle at roughly a 3:1 ratio. Clothing photos are almost always portrait-oriented, so this crops out the most important parts of each design.

**Recommendation:** Increase the card image height to around `200–240px` on mobile, or replace the fixed height with `aspect-ratio: 3/4` so the image always maintains a portrait proportion regardless of screen width.

---

### 2. Design carousel on Contact page has a fixed 540px width — *High Priority*

The contact form's design carousel uses `width: 540px; flex-shrink: 0` on the scrollable track, and `max-width: 596px` on the wrapper. On a phone (~327px of usable content width), the 540px carousel overflows its container. While the carousel itself is scrollable, the wrapping element has no `overflow: hidden`, which can cause the whole page to be wider than the screen — a horizontal scrollbar appearing on the contact page.

**Recommendation:** Replace the fixed `width: 540px` with `width: 100%` on `.design-carousel`, and add `overflow: hidden` to `.design-carousel-wrap`. The cards are already `flex-shrink: 0` so they'll scroll naturally within a fluid container.

---

### 4. Gallery photo arrows are hover-only — *Medium Priority*

The previous/next arrows on multi-photo design cards use `opacity: 0` by default and only become visible on `:hover`. On a phone, there is no hover state — a user taps the card once to trigger "hover" and again to follow the link, but the arrows appear and disappear too briefly to be useful. In practice, mobile users can only navigate photos using the tiny dot indicators at the bottom.

**Recommendation:** On touch devices, either always show the arrows (remove the `opacity: 0` at the 768px breakpoint) or add swipe gesture support using `touchstart`/`touchend` events. Swipe would feel the most natural on mobile.

---

### 5. Modal close button is below minimum touch target size — *Medium Priority*

The `.modal-close` button (the ✕ on the "I'm Interested" modal) is styled at `width: 32px; height: 32px` — below the 44×44px minimum recommended for touch targets. On a phone, this can be frustrating to tap, especially with one hand.

**Recommendation:** Increase to `width: 44px; height: 44px` to match the hamburger button's sizing, which already follows this guideline.

---

### 6. Hero section top padding is not reduced for mobile — *Medium Priority*

`.hero-content` has `padding: 120px 0 80px`. On mobile, the nav bar is around 60px tall, meaning the hero headline doesn't appear until about 180px from the top of the screen — nearly half the viewport on a typical phone. This makes the hero feel very empty above the fold.

**Recommendation:** Add a mobile override, e.g. at 768px reduce to `padding: 90px 0 48px` so the headline appears higher up on smaller screens.

---

### 7. No sub-480px breakpoint — *Low Priority*

The smallest phones (iPhone SE, older Androids) have 320px of width. The current breakpoints stop at 768px, so there's no fine-tuning for very small devices. The two-column designs grid at 320px would produce cards only ~133px wide each, which is extremely tight.

**Recommendation:** Add an `@media (max-width: 480px)` block that forces single-column for both `featured-grid` and `designs-grid`, and slightly reduces section padding.

---

### 8. No swipe gesture support on the lightbox — *Low Priority*

The full-screen photo lightbox has prev/next arrow buttons that work fine on desktop, but on mobile, users universally expect to swipe left/right between photos. There are no touch event listeners in the current JavaScript for the lightbox.

**Recommendation:** Add `touchstart` and `touchend` handlers on the lightbox overlay to detect left/right swipes and call `lightboxPrev()` / `lightboxNext()` accordingly. This is roughly 10–15 lines of JavaScript.

---

## Summary

| Issue | Priority | Location |
|-------|----------|----------|
| Design card photos too short (130px fixed) | High | `style.css` `.design-card-img` |
| Contact carousel 540px fixed width overflows | High | `contact.html` inline style |
| Gallery arrows invisible on touch | Medium | `style.css` `.gallery-arrow` |
| Modal close button too small (32px) | Medium | `style.css` `.modal-close` |
| Hero padding not reduced on mobile | Medium | `style.css` `.hero-content` |
| No sub-480px breakpoint | Low | `style.css` |
| No swipe support on lightbox | Low | `index.html` JS |

The site is genuinely well-built for mobile — the foundations are right and there's clear attention to detail (44px hamburger, safe-area insets, `clamp()` typography). The issues above are refinements rather than fundamental problems, and fixing the top three would make a meaningful difference to how designs are browsed and enquiries are made on a phone.
