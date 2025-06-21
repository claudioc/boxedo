# Security and other stuff

- uses Hamlet
- uses schema validation
- uses CSRF
- uses query sanitizer
- user user input sanitizer
- A cookie is used for csrf protection
- Access control is not enabled for the database. Read and write access to data and configuration is unrestricted
- Alpine "dot" discussion https://github.com/alpinejs/alpine/discussions/4164
- Conflicts are managed by checking the revision while saving; only the same revision gets saved
