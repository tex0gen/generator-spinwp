# SpinWP Generator
A Yeoman generator for quickly spinning up .

## Requirements
- NodeJS (v16+)
- PHP
- MySQL
- WP CLI
- Github CLI

## GitHub CLI Setup
When installed, run: `gh auth refresh` in your terminal and then `gh auth refresh -h github.com -s admin:repo_hook` to generate authorisation.

## Installation
In your Terminal:
- Run `npm install -g yo`
- Copy this repo to your htdocs directory
- Navigate your terminal to your htdocs directory and into the root of the `generator-spinwp` and run `npm link`.
- CD up a directory and run `yo spinwp` to start the generator.
- Any issues should flag with missing dependencies. Install these dependencies and try again if the generator fails.

## Adding plugins
You can either dump the plugins into the `generators/plugins` directory or add the wordpress directory slug for the plugin to `generators/index.js` and add to the plugins array.

## Changing the base theme
By default, it'll select `https://github.com/tex0gen/bootstrap5-wordpress-theme` as the theme to use. You can change this in `generators/index.js` by replacing the URL to another git repo.

## Using
Run `yo spinwp` in your terminal when navigated to your root htdocs directory and follow on-screen instructions. Job done!
