# Readers' Choice - Coding Style Guide

## Overview
This style guide ensures consistency and maintainability across the Readers' Choice codebase. The goal is to write clean, readable, and joyful code that sparks the same delight as the app itself.

## General Principles

### Code Quality
- Write code that is self-documenting through clear naming
- Prefer readability over cleverness
- Keep functions small and focused on a single responsibility
- Follow DRY (Don't Repeat Yourself) principles
- Write code with accessibility in mind

### Mobile-First Approach
- Always design and develop for mobile screens first
- Use responsive design patterns with Tailwind's breakpoint system
- Test on mobile viewports during development

## TypeScript

### Type Safety
- Always use explicit types for function parameters and return values
- Avoid `any` types - use `unknown` if the type is truly unknown
- Prefer interfaces for object shapes, types for unions/intersections
- Use strict mode (already configured in tsconfig.json)

```typescript
// Good
interface BookClubMember {
  id: string;
  name: string;
  joinedAt: Date;
}

function getMember(id: string): Promise<BookClubMember | null> {
  // ...
}

// Avoid
function getMember(id: any): any {
  // ...
}
```

### Naming Conventions
- **Components**: PascalCase (e.g., `BookCard`, `MeetingList`)
- **Files**: kebab-case for utility files, PascalCase for components
  - Components: `book-card.tsx`
  - Utils: `format-date.ts`
  - Types: `book-types.ts`
- **Variables/Functions**: camelCase (e.g., `getUserRanking`, `bookTitle`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_BOOKS_PER_YEAR`)
- **Types/Interfaces**: PascalCase (e.g., `BookRanking`, `MeetingDate`)

## React & Next.js

### Component Structure
- Use React Server Components by default
- Mark components as `"use client"` only when necessary (interactivity, hooks, browser APIs)
- Prefer function components over class components
- Use named exports for components

```typescript
// book-card.tsx
interface BookCardProps {
  title: string;
  author: string;
  coverUrl: string;
}

export function BookCard({ title, author, coverUrl }: BookCardProps) {
  return (
    <div className="rounded-lg border p-4">
      {/* ... */}
    </div>
  );
}
```

### File Organization
```
app/
├── (auth)/           # Route groups for organization
│   ├── login/
│   └── layout.tsx
├── dashboard/
│   ├── page.tsx
│   └── loading.tsx
├── layout.tsx
└── page.tsx

components/
├── ui/              # shadcn/ui components
│   ├── button.tsx
│   └── card.tsx
└── book-card.tsx    # Custom components

lib/
├── utils.ts         # Utility functions
├── db.ts           # Database utilities
└── api.ts          # API helpers
```

### Props & State
- Destructure props in function signatures
- Use TypeScript interfaces for prop types
- Keep component state minimal and close to where it's used
- Lift state up only when necessary

### Hooks
- Follow the Rules of Hooks
- Custom hooks should start with `use` (e.g., `useBookRankings`)
- Keep hooks focused and composable

## Styling with Tailwind CSS

### Class Organization
- Use the `cn()` utility from `lib/utils.ts` to combine classes
- Order Tailwind classes logically:
  1. Layout (flex, grid, block)
  2. Positioning (absolute, relative, z-index)
  3. Box model (width, height, padding, margin)
  4. Typography (font, text)
  5. Visual (background, border, shadow)
  6. Interactive (cursor, transition, hover)

```typescript
// Good
<div className={cn(
  "flex flex-col",
  "w-full max-w-md",
  "p-4 gap-2",
  "text-lg font-medium",
  "bg-white border rounded-lg shadow-sm",
  "hover:shadow-md transition-shadow",
  className
)}>
```

### Responsive Design
- Use Tailwind's breakpoint prefixes (`sm:`, `md:`, `lg:`, `xl:`)
- Mobile-first: write base classes for mobile, add breakpoint classes for larger screens

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

### Custom Styles
- Prefer Tailwind utilities over custom CSS
- Use CSS variables (in globals.css) for theme values
- Avoid inline styles unless dynamically computed

## Database & API

### Supabase
- Use TypeScript types generated from database schema
- Always handle errors from database queries
- Use Row Level Security (RLS) for data protection
- Prefer server-side database queries (Server Components, Server Actions)

```typescript
// Good
const { data: books, error } = await supabase
  .from('books')
  .select('*')
  .eq('book_club_id', clubId);

if (error) {
  console.error('Failed to fetch books:', error);
  return [];
}

return books;
```

### Server Actions
- Use Server Actions for mutations
- Name actions with descriptive verbs (e.g., `createMeeting`, `updateRanking`)
- Always validate and sanitize user input
- Return consistent result types

```typescript
'use server';

export async function createMeeting(formData: FormData) {
  const session = await auth();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  // Validate and process
  // ...

  return { success: true, meetingId };
}
```

## Error Handling

### Client-Side
- Use error boundaries for component errors
- Show user-friendly error messages
- Log errors for debugging

### Server-Side
- Always handle database errors
- Return error states to the client
- Use try-catch blocks for async operations

```typescript
try {
  const result = await performOperation();
  return { success: true, data: result };
} catch (error) {
  console.error('Operation failed:', error);
  return { success: false, error: 'Operation failed. Please try again.' };
}
```

## Comments & Documentation

### When to Comment
- Complex algorithms or business logic
- Non-obvious workarounds
- TODO items for future improvements

### When NOT to Comment
- Don't comment what the code obviously does
- Don't leave commented-out code (use git history)

```typescript
// Good: Explains WHY
// Using Borda count to ensure fair ranking regardless of attendance
const score = calculateBordaScore(rankings);

// Avoid: Explains WHAT (code already shows this)
// Loop through books
books.forEach(book => {
```

## Testing

### Unit Tests
- Test utility functions and complex logic
- Use descriptive test names: `it('should calculate correct ranking when some books are unread')`

### Integration Tests
- Test critical user flows
- Test authentication and authorization

## Git Practices

### Commits
- Write clear, concise commit messages
- Use conventional commits format: `feat:`, `fix:`, `docs:`, `refactor:`, etc.
- Keep commits focused on a single change

```
feat: add book ranking drag-and-drop interface
fix: correct year calculation for meeting dates
docs: update README with deployment instructions
```

### Branches
- Use descriptive branch names: `feature/book-voting`, `fix/ranking-calculation`
- Keep branches short-lived
- Merge frequently to avoid conflicts

## Performance

### Next.js Optimization
- Use dynamic imports for large components
- Implement loading states with `loading.tsx`
- Use Next.js Image component for images
- Cache expensive computations

### Database
- Use appropriate indexes
- Limit query results when possible
- Avoid N+1 queries

## Accessibility

### Semantic HTML
- Use semantic elements (`<nav>`, `<article>`, `<button>`)
- Proper heading hierarchy (`h1` → `h2` → `h3`)

### ARIA & Keyboard
- Add ARIA labels where needed
- Ensure keyboard navigation works
- Test with screen readers when possible

### Color & Contrast
- Ensure sufficient color contrast
- Don't rely solely on color for information

## Security

### Authentication
- Never expose sensitive credentials
- Use environment variables for API keys
- Implement proper session management

### Input Validation
- Validate all user input on the server
- Sanitize data before database insertion
- Protect against SQL injection (use Supabase parameterized queries)
- Prevent XSS attacks (React handles this by default, but be careful with dangerouslySetInnerHTML)

## Code Review

### Before Submitting
- [ ] Code follows this style guide
- [ ] Tests pass (`npm run build` and `npm run lint`)
- [ ] No console.logs left in production code
- [ ] No commented-out code
- [ ] Responsive design tested on mobile

### Reviewing Code
- Be respectful and constructive
- Ask questions rather than make demands
- Acknowledge good patterns and solutions
- Focus on the code, not the person

---

Remember: The goal is to create a joyful, maintainable codebase that serves our book club community well. When in doubt, prioritize clarity and user experience over brevity or cleverness.
