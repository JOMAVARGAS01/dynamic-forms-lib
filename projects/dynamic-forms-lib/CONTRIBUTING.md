# Contributing to @dynamic-forms-lib/core

Thanks for your interest! This library is built for enterprise Angular teams, and every contribution counts.

## 🐛 Reporting Bugs

Open an issue with:
- Angular version, Material version, AG Grid version
- Minimal reproduction steps
- Expected vs actual behavior

## 💡 Feature Requests

Open an issue describing:
- The problem you're solving
- How the library should handle it
- Example config or usage (if applicable)

## 🔧 Pull Requests

1. Fork the repo
2. Create a branch: `feat/your-feature` or `fix/your-fix`
3. Make your changes
4. Run `npm run build:lib` to verify compilation
5. Open a PR with a clear description of what and why

### Guidelines

- Keep components **standalone** (no NgModules)
- Use Angular **signals** for state where possible (unless it's a form control)
- Follow the existing **JSON config** convention — keep it simple
- Add JSDoc for any new inputs/outputs/services
- Update this README if adding new features

## 🧪 Testing

Tests are coming. If you'd like to help set up the testing infrastructure, that's especially welcome!

## 📝 Commit Convention

Use [conventional commits](https://www.conventionalcommits.org/):

```
feat: add date-range field type
fix: file upload broken in CrudManagerComponent
docs: update README with new layout examples
chore: bump Angular version to 20.1
```

## Code of Conduct

Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Be excellent to each other.
