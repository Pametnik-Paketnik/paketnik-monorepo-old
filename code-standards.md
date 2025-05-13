# 🧠 Code Versioning Standards

To ensure clean, structured and collaborative development, all team members must strictly follow these Git conventions:

---

## ✅ Branch Naming Rules

### ✏️ Format:

Use **lowercase English words**, separated by `-`.

#### Examples:

```
feat/login-page
fix/user-auth-bug
refactor/api-routing
chore/update-dependencies
```

### ❌ Wrong:

```
popravi-login
sprememba123
backendver2
```

---

## ✅ Commit Message Rules

### ✏️ Format:

```
<type>: <short description in English>
```

### Allowed types:

* `feat` – a new feature
* `fix` – a bug fix
* `docs` – documentation only changes
* `refactor` – code refactoring without behavior change
* `style` – formatting, missing semi-colons, etc.
* `test` – adding or updating tests
* `chore` – maintenance tasks (e.g., updating dependencies)

### Examples:

```
feat: implement user registration API
fix: correct password reset logic
refactor: clean up user controller
chore: bump dependencies to latest
```

### ❌ Don't do this:

```
dela
sprememba
popravek
nekaj dodano
```

---

## ✅ What to Commit

### ✅ Include:

* Source code changes related to the current task
* Unit or integration tests if applicable
* Updated documentation when functionality changes

### ❌ Exclude:

* `.env` or any credentials
* `node_modules`, `.idea`, `.vscode`, build folders
* Temporary files (`temp.js`, `test123.txt`, etc.)

---

## ✅ Recommended Workflow

1. Pull the latest changes from `main` or `develop`
2. Create a new branch
3. Make your changes (and commit regularly)
4. Push to remote
5. Open a pull request with clear title and description
6. Wait for review before merging

---

## ✅ Pre-Commit Checklist

* [ ] Code works as expected
* [ ] No leftover `console.log()` or debug code
* [ ] Variables, functions and branch names are in English
* [ ] Commit messages follow standard format
* [ ] Documentation is updated if needed

---

## 📂 Docs

Store all internal documentation inside the `docs/` folder:

```
docs/code-standards.md
docs/setup-guide.md
docs/api-reference.md
```

---

**⚠️ Note:** Pull requests that don't follow these standards may be rejected or asked to redo.