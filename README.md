# Route2.0 — Cavite Commute Guide

A mobile-first Expo app for exploring modeled commute routes, stops, fares, and sample departures in General Trias, Cavite. Route and departure information is illustrative; the app does not provide live transit data.

## Getting access as a collaborator

1. Ask the repository owner to invite your GitHub username. Accept the invitation from GitHub before opening the project. Read access lets you view and clone the code; write access is needed to push branches.
2. Open the repository’s main page. Choose the **`<> Code`** dropdown, then **Codespaces**, and create a Codespace for the project’s default branch. On mobile, the direct link also works: `https://codespaces.new/OWNER/REPOSITORY` (replace the placeholders with the repository owner and name).
3. In the Codespaces terminal, install the locked dependencies and start Expo’s development server:

   ```sh
   npm ci
   npx expo start --tunnel
   ```

4. Open the development link on your phone in Expo Go. If you are using the same phone to access Codespaces, copy the Expo link from the terminal and open or paste it into Expo Go instead of scanning the QR code. The Codespace and tunnel are for development previews; this does not publish the app.

If **Codespaces** is missing from the `<> Code` menu, use the direct link above. If GitHub says you cannot create a Codespace, ask the repository owner or organization admin whether Codespaces is enabled and available for this repository/account.

### Expo Go compatibility

This project uses Expo SDK 58, so the Expo Go app must support SDK 58. Android users can select a matching build at [expo.dev/go](https://expo.dev/go). On a physical iPhone, the App Store Expo Go currently does not support SDK 58; use a project development build instead.

## Run locally

On a computer with Node.js installed, clone the repository, then run:

```sh
npm ci
npx expo start
```

Use the terminal’s QR code to open the project on a compatible device, or follow the Expo CLI prompts for an emulator/simulator.

## Collaborator workflow

- Create a branch for your change; avoid committing directly to the default branch.
- Commit and push your branch, then open a pull request for review.
- Do not commit `node_modules`, local `.expo` files, credentials, or API secrets.

## Useful commands

```sh
npx expo lint
npx tsc --noEmit
```

## Project structure

- `src/app/` — Expo Router screens and layouts.
- `src/components/` — reusable app UI and screen components.
- `src/data/` — illustrative General Trias route and transit data.
- `src/lib/` — saved journeys and local preferences.

See the [Expo documentation](https://docs.expo.dev/) for general development help.
