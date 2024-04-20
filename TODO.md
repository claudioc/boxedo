Doing
- show single history item

Todo
- do we need a "Rever to this version" for the history?
- Rolling window for history?
- duplicate page
- add a icon library (the chevron in pageMenu for example)
- uses CSRF
- user user input sanitizer
- make the name of the database configurable
- make the port for livereload a constant (for the CSP)
- consider access implications to the history of docs
- collection of actions for audit purposes (log)
- when we catch an error, we should log what it is
- consider creating an esbuild.js and simplify packages.json
- mongodb must be configured to run in production
- we are always using 303 to redirect - check it
- TODO: needs also to check for uniqueness in the pageSlugs array
- bug: feedback shows differently from alpine and normal render


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
