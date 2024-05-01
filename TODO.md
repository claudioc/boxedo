Doing
- unit tests for the dbService would be good.

Todo

  HIGH
  - A long PRE breaks the layout
  - when we catch an error, we should log what it is. The ErrorWithFeedback should augment the original error object

  MEDIUM
  - back and forth navigation works in a weird way with XHR
  - duplicate page (needs to specify parent?)
  - add a icon library (the chevron in pageMenu for example or in the message notifications)
  - make the name of the database configurable

  LOW (before live)
  - Rolling window for history?
  - make the port for livereload a constant (for the CSP)
  - consider access implications to the history of docs
  - collection of actions for audit purposes (log)
  - mongodb must be configured to run in production
  - we are always using 303 to redirect - check it
  - do we need a "Revert to this version" for the history? (probably not)
  - uses CSRF for delete and move page? (probably not)
  - hey, what about sqlite?

Done
- Save the history of a page
- Move a page to another parent
- Add the date of creation and update
- consider starting mongodb with a replicaset to enable transactions
- refactor the router creating services
- delete should also remove the history
- uses mongodb sanitizer
- move the page buttons to a dropdown
- Show history of pages
- show single history item
- user user input sanitizer
- uses CSRF for create and edit page
- bug: feedback shows differently from alpine and normal render
- needs also to check for uniqueness in the pageSlugs array
- find a way to not move the menu when we change page (load page with HTMX?)
- Consider Alpine global store for the state of the notifications
- consider creating an esbuild.js and simplify packages.json
