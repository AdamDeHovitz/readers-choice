# Overview
You are making a beautiful mobile-first website that sparks joy. The website is used for organizing a community around a book club. 

The website will have the following features:

# Features

## Book Club Record
For each book club group, there will be a list of members and meeting dates. Each date will have an assigned theme and will reference a book. Books should be stored in a seperate table, and be associated with an external website/api such that we can load metadata associated with the book.

## Year Ranking: Personal
For each year that a book club has operated, as determined by the meeting dates, users should be able to rank their favorite books read in that year. This is done by dragging books into a desired order. Books can also be marked as not read, since not all users attend every book club. Books that were not read are moved out of the ranked list, but can be unmarked as needed.

## Year Ranking: Global
Users can also see the overall book club ranking of books read. This is constructed based on individual user rankings. We should think hard through various options on how to create this ranking such that books 
that happened to have been read more or less or not penalized.

## Admin contros

The user who creates a new book club will be an admin. They can also add additional admins from the list of users who have joined.

## Users

Users login via google single sign on

## Adding meetings

Admins have an interface where they can add meeting dates. Meeting dates will start out with a theme and several book options. Members of a book club can vote on books. An admin will also add a date by which votes should be in by, though the poll will only close once an admin choose to close it and picks one of the books.

## Theme list

There will be a section where users can suggest book themes. Themes for meeting dates must come from this list. On the theme section users can also see which themes have been used. Themes can receive upvotes from users to increase their rank. Themes are also associated with the user that submitted them.

## Bonus feature

Ideally there would be a way to link a user account with their goodreads or story graph account. This would allow us to create a default ranking for the Year Ranking feature as well as other integrations.

# Technology

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Authentication**: NextAuth.js v5
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel

While developing this site it is important to write clean, reusable code and to make sure we pass linter
rules. Also please conform with the style guide in STYLE.md and that tests still pass
