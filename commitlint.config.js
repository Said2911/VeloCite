# commitlint.config.js
# Enforces Conventional Commits on every commit message.
# Install: npm install --save-dev @commitlint/config-conventional @commitlint/cli husky
# Setup:   npx husky init && echo "npx commitlint --edit \$1" > .husky/commit-msg

module.exports = {
  extends: ['@commitlint/config-conventional'],

  rules: {
    // Allowed commit types for this project
    'type-enum': [2, 'always', [
      'feat',      // ✨ New feature
      'fix',       // 🐛 Bug fix
      'perf',      // ⚡ Performance improvement
      'refactor',  // ♻️ Code restructure, no behavior change
      'docs',      // 📚 Documentation only
      'test',      // 🧪 Tests only
      'chore',     // 🔧 Build process, tooling, deps
      'ci',        // 🤖 CI/CD changes
      'cpp',       // ⚙️ C++ engine changes
      'revert',    // ⏪ Revert a commit
    ]],

    'type-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-leading-blank': [1, 'always'],
    'footer-leading-blank': [1, 'always'],
  },
};
