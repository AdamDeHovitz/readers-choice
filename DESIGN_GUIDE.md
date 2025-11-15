# Readers' Choice Design Guide

This guide defines the visual design system for the Readers' Choice book club application, ensuring consistency across all components and pages.

## Design Philosophy

The design evokes a warm, literary aesthetic with earthy tones reminiscent of vintage books and cozy reading spaces. The color palette and typography choices create an inviting, sophisticated atmosphere that encourages community engagement.

---

## Color Palette

### Primary Colors

#### Rust (Terracotta)
- **Hex**: `#994636`
- **Tailwind**: `rust`
- **Usage**: Primary buttons, important headings, emphasis text, active states
- **Variants**:
  - `rust-50`: Lightest tint for backgrounds
  - `rust-100`: Light tint for hover states
  - `rust-600`: Base color `#994636`
  - `rust-700`: Darker for hover/active states
  - `rust-800`: Darkest for pressed states

#### Gold
- **Hex**: `#917730`
- **Tailwind**: `gold`
- **Usage**: Accent elements, navigation bars, status badges, highlights
- **Variants**:
  - `gold-50`: Lightest tint for backgrounds
  - `gold-100`: Light tint for subtle accents
  - `gold-600`: Base color `#917730`
  - `gold-700`: Darker for hover states
  - `gold-800`: Darkest for active states

#### Cream
- **Hex**: `#efecde`
- **Tailwind**: `cream`
- **Usage**: Page backgrounds, card backgrounds, light surfaces
- **Variants**:
  - `cream-50`: Lightest variant
  - `cream-100`: Base color `#efecde`
  - `cream-200`: Slightly darker for borders/contrast

#### Dark
- **Hex**: `#1d1a05`
- **Tailwind**: `dark`
- **Usage**: Primary text, navigation text, bold headings
- **Variants**:
  - `dark-500`: Medium opacity for secondary text
  - `dark-600`: Higher opacity for body text
  - `dark-900`: Full color `#1d1a05` for headings

### Functional Colors

#### Success/Complete
- Use **Rust** (#994636) for completed states, finalized meetings, selected items
- Replaces previous green usage

#### Active/Voting
- Use **Gold** (#917730) for active states, voting open, upcoming events
- Replaces previous blue usage

#### Error/Destructive
- **Red**: `#dc2626` (Tailwind red-600)
- Only for errors, destructive actions, and critical warnings

---

## Typography

### Font Families

#### Voga (Headlines)
- **Usage**: Main page titles (h1, h2), hero headings, logo text
- **Style**: Always CAPITALIZED
- **Weight**: Regular (400)
- **Tailwind**: `font-voga`
- **Example**: "BOOK CLUB", "GLOBAL RANKINGS"

#### Inria Serif (Subheadings)
- **Usage**: Section headings (h3, h4), card titles, dialog titles
- **Weight**: Bold (700)
- **Tailwind**: `font-inria`
- **Example**: "Statistics", "Submissions", "Schedule"

#### Inria Serif (Body)
- **Usage**: Body text, descriptions, labels, buttons
- **Weight**: Regular (400)
- **Tailwind**: `font-inria`
- **Example**: Paragraph text, form labels, button text

### Typography Scale

#### Headings
- **H1 (Hero)**: `text-5xl font-voga uppercase` - Main page titles
- **H2 (Page Title)**: `text-3xl font-voga uppercase` - Section titles
- **H3 (Card Title)**: `text-xl font-inria font-bold` - Card/section headings
- **H4 (Subsection)**: `text-lg font-inria font-bold` - Smaller headings

#### Body Text
- **Large**: `text-base font-inria` - Important descriptions
- **Regular**: `text-sm font-inria` - Standard body text
- **Small**: `text-xs font-inria` - Meta information, timestamps

#### Special Cases
- **Button Text**: `text-sm font-inria font-medium`
- **Badge Text**: `text-xs font-inria font-medium uppercase`
- **Navigation**: `text-base font-inria font-bold`

---

## Component Styles

### Buttons

#### Primary Button (Call-to-Action)
- **Background**: `bg-rust-600`
- **Text**: `text-cream-100`
- **Hover**: `hover:bg-rust-700`
- **Border**: `border-2 border-dark-900` with rounded corners
- **Typography**: `font-inria font-medium`
- **Example**: "Nominate a Book", "Vote for a Book", "Join Book Club"

#### Secondary Button (Accent)
- **Background**: `bg-gold-600`
- **Text**: `text-dark-900`
- **Hover**: `hover:bg-gold-700`
- **Border**: `border-2 border-dark-900`
- **Typography**: `font-inria font-medium`

#### Outline Button
- **Background**: `bg-transparent`
- **Border**: `border-2 border-rust-600`
- **Text**: `text-rust-600`
- **Hover**: `bg-rust-50`

#### Ghost Button (Minimal)
- **Background**: `bg-transparent`
- **Text**: `text-dark-600`
- **Hover**: `bg-cream-200`

### Cards

#### Default Card
- **Background**: `bg-white`
- **Border**: `border border-gold-600/20`
- **Rounded**: `rounded-lg`
- **Shadow**: `shadow-sm`
- **Padding**: `p-6`

#### Highlighted Card (Active/Selected)
- **Background**: `bg-cream-100`
- **Border**: `border-2 border-gold-600`

### Navigation

#### Top Navigation Bar
- **Background**: `bg-gold-600`
- **Text**: `text-dark-900 font-inria font-bold`
- **Border**: None or subtle `border-b border-gold-700`
- **Height**: `h-16`

#### Navigation Links
- **Color**: `text-dark-900`
- **Hover**: `text-dark-600`
- **Active**: `text-rust-600 font-bold`

### Badges

#### Status Badge (Active/Voting Open)
- **Background**: `bg-gold-600`
- **Text**: `text-dark-900 text-xs font-medium uppercase`
- **Padding**: `px-2 py-1`
- **Rounded**: `rounded-full`

#### Status Badge (Complete/Finalized)
- **Background**: `bg-rust-600`
- **Text**: `text-cream-100 text-xs font-medium uppercase`
- **Padding**: `px-2 py-1`
- **Rounded**: `rounded-full`

#### Admin Badge
- **Background**: `bg-gold-100`
- **Text**: `text-gold-700 text-xs font-medium uppercase`
- **Padding**: `px-2 py-1`
- **Rounded**: `rounded-full`

### Form Elements

#### Input Fields
- **Background**: `bg-white`
- **Border**: `border border-dark-900/20`
- **Focus**: `focus:border-rust-600 focus:ring-rust-600`
- **Text**: `text-dark-900 font-inria`
- **Placeholder**: `placeholder:text-dark-500`

#### Labels
- **Text**: `text-dark-900 font-inria font-medium text-sm`
- **Margin**: `mb-2`

### Dialogs & Modals

#### Overlay
- **Background**: `bg-dark-900/50`

#### Dialog Container
- **Background**: `bg-cream-100`
- **Border**: `border-2 border-gold-600`
- **Rounded**: `rounded-lg`
- **Shadow**: `shadow-xl`

#### Dialog Title
- **Typography**: `text-2xl font-inria font-bold text-dark-900`

#### Dialog Description
- **Typography**: `text-sm font-inria text-dark-600`

---

## Layout Guidelines

### Page Background
- **Main Background**: `bg-cream-100`
- **Alternative**: `bg-cream-50` for subtle variation

### Spacing Scale
- **Section Spacing**: `space-y-8` between major sections
- **Card Spacing**: `space-y-4` between cards
- **Element Spacing**: `gap-4` for flex/grid layouts
- **Content Padding**: `p-6` for cards, `p-4` for smaller containers

### Borders
- **Default**: `border border-gold-600/20`
- **Emphasized**: `border-2 border-gold-600`
- **Subtle**: `border border-dark-900/10`

### Shadows
- **Subtle**: `shadow-sm`
- **Card Hover**: `shadow-md`
- **Dialog**: `shadow-xl`

---

## Iconography

### Icon Colors
- **Default**: `text-dark-600`
- **Active/Emphasis**: `text-rust-600`
- **Accent**: `text-gold-600`

### Icon Sizes
- **Small**: `h-4 w-4`
- **Medium**: `h-5 w-5`
- **Large**: `h-6 w-6`

---

## Usage Examples

### Page Title
```tsx
<h1 className="text-5xl font-voga uppercase text-dark-900">
  BOOK CLUB
</h1>
```

### Section Heading
```tsx
<h3 className="text-xl font-inria font-bold text-dark-900">
  Statistics
</h3>
```

### Primary Button
```tsx
<button className="bg-rust-600 text-cream-100 px-6 py-3 rounded-lg border-2 border-dark-900 font-inria font-medium hover:bg-rust-700">
  Nominate a Book
</button>
```

### Status Badge
```tsx
<span className="bg-gold-600 text-dark-900 px-2 py-1 rounded-full text-xs font-medium uppercase">
  Voting Open
</span>
```

### Card
```tsx
<div className="bg-white border border-gold-600/20 rounded-lg shadow-sm p-6">
  <h3 className="text-xl font-inria font-bold text-dark-900 mb-2">
    Book Title
  </h3>
  <p className="text-sm font-inria text-dark-600">
    Description text goes here...
  </p>
</div>
```

---

## Accessibility

### Color Contrast
- Ensure text on cream backgrounds meets WCAG AA standards
- Primary text (#1d1a05) on cream (#efecde) provides excellent contrast
- Button text (cream) on rust/gold backgrounds must be tested

### Focus States
- All interactive elements must have visible focus indicators
- Use `focus:ring-2 focus:ring-rust-600` for consistent focus styling

### Typography
- Minimum font size: 12px (text-xs)
- Body text: 14px (text-sm) for optimal readability
- Line height: 1.5 for body text, 1.2 for headings

---

## Migration Notes

### From Old Design
- Replace `slate-50` backgrounds → `cream-100`
- Replace `slate-900` text → `dark-900`
- Replace `blue-600` accents → `gold-600`
- Replace `green-600` success → `rust-600`
- Replace sans-serif font → `font-inria`
- Add `font-voga uppercase` to main headings

### Component Priority
1. **High Priority**: Button, Card, Navigation, Dialog
2. **Medium Priority**: Book cards, Meeting timeline, Badges
3. **Low Priority**: Form elements, Icons, Utilities
