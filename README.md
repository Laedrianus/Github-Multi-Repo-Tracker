# GitHub Multi Repo Contributor Tracker

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
<!-- [Add a Vercel badge if you have a stable deployment URL](https://github-multi-repo-tracker.vercel.app/) -->
<!-- [![Vercel](https://therealsujitk-vercel-badge.vercel.app/?app=YOUR-VERCEL-APP-NAME)](https://YOUR-DEPLOYMENT-URL.vercel.app) -->

A powerful React application designed to analyze contributors and commit statistics across multiple GitHub repositories. Gain insights into contributions, code changes, and project structure.

## 🌐 Demo

Live Demo (hosted on Vercel): [https://github-multi-repo-tracker.vercel.app](https://github-multi-repo-tracker.vercel.app)


## 📦 Features

- **Multi-Repository Tracking:** Add repositories in `owner/repo` format, search and select from a list, and remove or switch between them.
- **Contributor Analysis:** Lists contributors for a selected repository, showing individual commit counts, with options to select and favorite contributors.
- **Commit Statistics:** Filters commits by date range and type (e.g., `feat`, `fix`, `docs`). Includes a weekly commit comparison chart.
- **File Structure Analysis:** Categorizes project files (e.g., frontend, backend, docs, config) and displays file counts per category.
- **Categorical Commit Analysis:** Analyzes which contributors commit to which file categories and visualizes the distribution.
- **Date Range Summary:** Summarizes changes (new, modified, deleted files) within the selected time window across the entire repository (not limited to selected contributors).
- **Latest Commits Modal:** Displays the most recent 25 commits across all added repositories. Includes optional spell-checking for commit messages.
- **Commit Message Spell Check:** Detects typos in commit messages using the LanguageTool API and suggests corrections.
- **Theme Support:** Supports both light and dark themes for user preference.
- **Modals and Info Panels:** Features modals for adding repositories, viewing spell-check results, and displaying application information.
- **Responsive Design:** Adapts seamlessly across different screen sizes.
- **Error Handling:** Informs users about API errors, rate limits, and loading states.
- **Local Storage:** Stores favorite contributors persistently in the browser's local storage.
- **GitHub API Authentication:** Supports GitHub API authentication via a Personal Access Token to increase the hourly rate limit from 60 to 5000 requests.

## 🛠️ Technologies Used

- **React:** Core library for building the user interface.
- **Recharts:** Used for data visualization and charts.
- **date-fns:** For parsing and manipulating dates.
- **GitHub REST API v3:** To fetch repository, contributor, and commit data.
- **LanguageTool API (Optional):** For spell-checking commit messages.
- **Vercel (Deployment):** Platform used for hosting and deploying the application.

## 🚀 Getting Started

These instructions will help you get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS version recommended)
- npm (comes with Node.js) or [yarn](https://classic.yarnpkg.com/lang/en/docs/install/)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/Laedrianus/Github-Multi-Repo-Tracker.git
    cd Github-Multi-Repo-Tracker
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up Environment Variables (Optional but Recommended):**

    To increase the GitHub API rate limit from 60 to 5000 requests per hour, you need a GitHub Personal Access Token.

    - Go to your GitHub account settings: `Settings` > `Developer settings` > `Personal access tokens` > `Tokens (classic)`.
    - Click `Generate new token`.
    - Select the necessary scopes (e.g., `public_repo` for public repositories, `repo` for private ones).
    - Copy the generated token.

    Create a file named `.env` in the project's root directory and add the following line:

    ```env
    REACT_APP_GITHUB_TOKEN=your_copied_personal_access_token_here
    ```

    > **Security Warning:** Never commit the `.env` file to version control (Git). It should already be listed in `.gitignore`.

4.  **Start the development server:**

    ```bash
    npm start
    # or
    yarn start
    ```

    The application will open in your default browser at [http://localhost:3000](http://localhost:3000).

## 🌍 Deployment

The application can be easily deployed to platforms like Vercel.

### Deploying with Vercel (Recommended)

1.  Sign in to [Vercel](https://vercel.com/) using your GitHub account.
2.  In the Vercel dashboard, click "New Project".
3.  Connect your GitHub repository and import the project.
4.  In the project settings, navigate to the "Environment Variables" section.
5.  Add a new environment variable:
    *   **Key:** `REACT_APP_GITHUB_TOKEN`
    *   **Value:** Your GitHub Personal Access Token.
6.  Click "Deploy".

Vercel will automatically build and deploy your application.

> **Note:** Deploying to GitHub Pages can be problematic because the build process embeds the token into the client-side code, which GitHub's "Push Protection" might block when pushing to the `gh-pages` branch. Using Vercel avoids this issue by managing environment variables securely on the server side during the build.

## 🤝 Contributing

Contributions are welcome! Please read `CONTRIBUTING.md` (if available) for details on our code of conduct and the process for submitting pull requests. General steps:

1.  Fork the repository.
2.  Create a new feature branch (`git checkout -b feature/NewFeature`).
3.  Commit your changes (`git commit -am 'Add new feature'`).
4.  Push the branch (`git push origin feature/NewFeature`).
5.  Open a Pull Request.

## 📃 License

This project is licensed under the MIT License - see the `LICENSE` file for details.

## 🙏 Acknowledgments

- Thanks to [Create React App](https://github.com/facebook/create-react-app) for the project boilerplate.
- Thanks to [Recharts](https://recharts.org/) for the charting library.
- Thanks to [date-fns](https://date-fns.org/) for date utilities.
- Thanks to [LanguageTool](https://languagetool.org/) for the spell-checking API.
- Thanks to [GitHub](https://github.com/) for the API and platform.
- Thanks to [Vercel](https://vercel.com/) for hosting and deployment.

X: @bilenls - Laedrianus
