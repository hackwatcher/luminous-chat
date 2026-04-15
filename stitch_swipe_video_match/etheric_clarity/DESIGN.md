# Design System Specification: The Ethereal Connection

## 1. Overview & Creative North Star: "Luminous Clarity"
This design system rejects the "boxed-in" utility of traditional video communication. Our Creative North Star is **Luminous Clarity**—an editorial approach to digital space where the interface recedes to prioritize human connection. 

We move beyond "standard minimalist" by employing intentional asymmetry and a "physics of light" approach to depth. Instead of rigid grids, we use breathing room as a structural element. The goal is to make the user feel like they are interacting within a premium, airy gallery rather than a utility software. By utilizing high-contrast typography scales (the sharp Manrope against the functional Inter), we create an authoritative yet welcoming presence.

---

### 2. Colors: Tonal Architecture
We define space through light, not lines. Every interaction must feel like a shift in illumination.

#### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or containment. Boundaries must be defined solely through background color shifts. For instance, a side-bar should be `surface-container-low` sitting against a `background` canvas.

#### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, fine-paper layers.
- **Canvas:** `background` (#f7f9fb)
- **Primary Layout Blocks:** `surface-container-low` (#f0f4f7)
- **Interactive Floating Elements:** `surface-container-lowest` (#ffffff)
- **Nested Content (Inner feeds):** `surface-container-high` (#e1e9ee)

#### The Glass & Gradient Rule
To ensure the "Airy" feel, floating elements (like video controls or participant labels) should utilize Glassmorphism.
- **Glass Token:** `surface` at 70% opacity with a `24px` backdrop blur.
- **Signature Soul:** Main CTAs (Start Call, Join) must use a subtle linear gradient: `primary` (#494bd6) to `primary_dim` (#3c3dca) at a 135-degree angle. This adds a "jewel" quality to the interface.

---

### 3. Typography: The Editorial Voice
We use a dual-typeface system to balance personality with extreme legibility.

*   **Display & Headlines (Manrope):** Our "Voice." Used for welcoming the user, room headers, and large status indicators. The wide tracking and geometric forms of Manrope provide a modern, premium feel.
*   **Body & Labels (Inter):** Our "Utility." Inter is used for chat messages, settings, and metadata. It is chosen for its neutral, high-readability characteristics.

**Hierarchy Highlights:**
- **Display-LG (3.5rem):** Reserved for empty states or "Call Ended" screens.
- **Headline-SM (1.5rem):** Used for Room Titles.
- **Label-MD (0.75rem):** Used for "Live" indicators and participant counts, always in All-Caps with +5% letter spacing.

---

### 4. Elevation & Depth: Tonal Layering
We do not "drop shadows" onto a flat surface; we create "ambient lift."

*   **The Layering Principle:** To highlight a card, do not add a border. Place a `surface-container-lowest` (#ffffff) object onto a `surface-container-low` (#f0f4f7) background. The `0.5rem` contrast provides enough distinction for the eye without adding visual noise.
*   **Ambient Shadows:** Use only for high-level modals or floating toolbars. 
    *   *Value:* `0px 12px 32px`
    *   *Color:* `on-surface` (#2a3439) at **6% opacity**. This creates a soft, natural glow rather than a muddy grey smudge.
*   **The "Ghost Border" Fallback:** If a layout requires a border (e.g., a search input), use `outline-variant` (#a9b4b9) at **20% opacity**.

---

### 5. Components: Fluid Primitives

#### Buttons
- **Primary:** Gradient fill (`primary` to `primary_dim`), `full` roundedness, White text.
- **Secondary:** `surface-container-highest` background with `on-surface` text. No border.
- **Tertiary:** Transparent background, `primary` text, with a subtle `primary-container` hover state.

#### Video Tiles (The Signature Component)
- **Radius:** `xl` (1.5rem) for the main stage; `lg` (1rem) for side-rail participants.
- **Controls:** Floating bar using the **Glass Token** (70% white, backdrop blur). 
- **Active Speaker:** Instead of a border, use a soft `primary` outer glow shadow (12px blur, 15% opacity).

#### Input Fields
- **Styling:** `surface-container-low` background. No border. 
- **Focus State:** Background shifts to `surface-container-lowest` with a "Ghost Border" of `primary` at 30% opacity.

#### Cards & Lists
- **The No-Divider Rule:** Explicitly forbid horizontal `<hr>` lines. Use `1.5rem` of vertical whitespace or a subtle shift from `surface` to `surface-container-low` to distinguish items.

#### Chips (Status Indicators)
- **Active:** `primary-container` background with `on-primary-container` text.
- **Inactive:** `surface-container-highest` background with `on-surface-variant` text.

---

### 6. Do’s and Don’ts

#### Do
- **Do** prioritize "White Space" as a functional element. If a screen feels crowded, increase the padding, don't shrink the text.
- **Do** use `xl` (1.5rem) rounded corners for main content containers to maintain the "Soft" brand personality.
- **Do** use `on-surface-variant` for secondary information to maintain a low-contrast, calming aesthetic.

#### Don’t
- **Don't** use pure black (#000000) for text. Use `on-surface` (#2a3439) to keep the look editorial and soft.
- **Don't** use 1px dividers to separate chat messages; use time-stamps and varying indentation/surface-tints.
- **Don't** use hard-edged rectangles. Everything in the "Luminous Clarity" system must feel organic and touchable.