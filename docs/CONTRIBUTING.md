# Contributing to Pluto Notebook Extension

Thank you for contributing to the Pluto Notebook VSCode extension!

## Commit Message Format

This project follows [Conventional Commits](https://www.conventionalcommits.org/) specification. All commit messages must follow this format:

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Type

Must be one of the following:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Scope (Optional)

The scope should specify the place of the commit change. Examples:

- `controller`
- `serializer`
- `commands`
- `renderer`
- `mcp`
- `server`
- `deps`

### Subject

The subject contains a succinct description of the change:

- Use the imperative, present tense: "change" not "changed" nor "changes"
- Don't capitalize the first letter
- No period (.) at the end
- Maximum 100 characters

### Examples

**Good commit messages:**

```
feat(controller): add support for cell execution cancellation
fix(serializer): handle empty markdown cells correctly
docs: update installation instructions
chore(deps): bump @plutojl/rainbow to 0.6.10
refactor(commands): extract view toggle logic into separate file
```

**Bad commit messages:**

```
Fixed bug                          # Missing type and not descriptive
feat: Added new feature.           # Has period at end
FEAT: new feature                  # Type should be lowercase
feat(Controller): add feature      # Scope should be lowercase
```

## Commit Message Validation

Commit messages are automatically validated in:

1. **Pull Requests**: All commits in a PR must follow the conventional format
2. **Direct Pushes**: Commits to main/develop branches are validated
3. **Releases**: The commit that creates a release tag is validated

If your commit message doesn't follow the format, the CI will fail. You can validate your commit message locally:

```bash
# Install dependencies
npm ci

# Validate your last commit
echo "$(git log -1 --pretty=%B)" | npx commitlint

# Validate a specific commit message
echo "feat: my new feature" | npx commitlint
```

## Breaking Changes

If your commit introduces a breaking change, add `BREAKING CHANGE:` in the commit body or footer:

```
feat(api)!: remove deprecated method

BREAKING CHANGE: The `oldMethod()` has been removed. Use `newMethod()` instead.
```

Or use `!` after the type/scope:

```
feat(api)!: remove deprecated method
```

## Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Write tests if applicable
5. Commit with conventional format: `git commit -m "feat: add my feature"`
6. Push to your fork: `git push origin feat/my-feature`
7. Create a Pull Request

## Running Tests

```bash
npm test              # Run all tests
npm run test:unit     # Run unit tests
npm run test:watch    # Run tests in watch mode
npm run check-types   # Type checking
npm run lint          # Linting
```

## Questions?

Feel free to open an issue if you have questions about contributing!
