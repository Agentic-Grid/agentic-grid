# /setup - Initialize New Project

You are helping the user set up a new project using the multi-agent development framework.

## Your Task

Conduct an interactive interview to gather project information and initialize the project.

## Interview Questions

Ask the following questions one at a time (or in logical groups):

### 1. Project Basics
- **Project name:** What is your project called?
- **Project description:** In 2-3 sentences, what does this project do?

### 2. Localization
- **UI languages:** Which languages should the user interface support? (e.g., English, Portuguese, Spanish)
- **Default language:** Which language is the default?

### 3. Core Features
- **Main features:** What are the 3-5 core features you want to build? (List them)

### 4. Technical Preferences (optional - offer defaults)
- **Frontend:** React (default), Vue, or other?
- **Styling:** TailwindCSS (default), Styled Components, or CSS Modules?
- **State Management:** Context API (default), Redux, or Zustand?
- **Backend Framework:** Express (default) or Fastify?
- **Authentication:** JWT (default), Sessions, or OAuth?

## After Gathering Information

1. **Update PROJECT.md** with all the gathered information
   - Fill in project name, description
   - Set UI languages
   - List core features
   - Document technical stack choices

2. **Create Initial Feature Plan**
   - Create a file `/plans/features/001-initial-setup.md`
   - Break down the first core feature into phases
   - Identify which agents are needed
   - Create execution timeline

3. **Update CURRENT.md**
   - Set status to "IN_PROGRESS"
   - Point to the initial feature plan
   - Set first agent to start work

4. **Initialize Contract Files** (if needed)
   - Add any known requirements to contract files
   - Add placeholders for agents to fill

5. **Summary for User**
   Provide a summary showing:
   ```
   ✅ Project initialized: [Project Name]
   ✅ PROJECT.md created
   ✅ Initial feature plan created: [Feature Name]
   ✅ Ready to start development!

   Next steps:
   1. Review PROJECT.md and plans/features/001-initial-setup.md
   2. Add any requirements to /resources/requirements/
   3. Add design inspiration to /resources/references/
   4. Say "Start development" to begin!

   Current Focus: [First Feature]
   First Agent: [Which agent will start]
   ```

## Important

- Be conversational and friendly
- Offer sensible defaults for technical choices
- Don't overwhelm with too many questions at once
- Confirm understanding before proceeding
- Create realistic timelines in feature plans

## Example Interaction

```
User: /setup