# Security

Please report security problems privately, not in a public issue: use GitHub's "Report a vulnerability" (Security tab of the repository). Include the version of `@sutra/ui`, what you found and how to reproduce it. You can expect an acknowledgement within a few days.

`@sutra/ui` is a front-end component library: it renders what the application gives it. Components that render markup or URLs (for example Markdown, the rich-text editor, link and image components) are the most relevant: a way to make them run script or load content that their documentation says they block is in scope.
