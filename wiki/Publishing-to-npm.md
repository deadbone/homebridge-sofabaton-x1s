# Publishing to npm

## English

Do not publish without explicit maintainer confirmation.

The repository is prepared for npm Trusted Publishing through GitHub Actions.

Trusted Publishing settings on npm:

- owner/repository: `deadbone/homebridge-sofabaton-x1s`
- workflow file: `publish.yml`
- environment: `npm`

## Validation

Run locally before release:

```sh
npm run lint
npm run build
npm test
npm run verify:pack
npm pack --dry-run
```

## Alpha release

For manual fallback only:

```sh
npm login
npm run lint
npm run build
npm test
npm run verify:pack
npm pack --dry-run
npm publish --tag alpha
```

The GitHub workflow can also publish temporary alpha packages from repository pull requests using the `alpha` dist-tag.

## Tagged release

The publish workflow accepts tags matching `v*.*.*`.

The tag must match `package.json` exactly:

```text
package.json version: 0.1.0-alpha.1
git tag: v0.1.0-alpha.1
```

Prerelease tags create prerelease GitHub Releases. Stable tags create latest GitHub Releases.

## Français

Ne publiez pas sans confirmation explicite du mainteneur.

Le dépôt est préparé pour npm Trusted Publishing via GitHub Actions.

Configuration Trusted Publishing côté npm :

- owner/repository : `deadbone/homebridge-sofabaton-x1s`
- workflow file : `publish.yml`
- environment : `npm`

## Validation

À lancer localement avant publication :

```sh
npm run lint
npm run build
npm test
npm run verify:pack
npm pack --dry-run
```

## Publication alpha

Uniquement comme solution manuelle de secours :

```sh
npm login
npm run lint
npm run build
npm test
npm run verify:pack
npm pack --dry-run
npm publish --tag alpha
```

Le workflow GitHub peut aussi publier des paquets alpha temporaires depuis les pull requests du dépôt avec le dist-tag `alpha`.

## Publication taguée

Le workflow de publication accepte les tags correspondant à `v*.*.*`.

Le tag doit correspondre exactement à `package.json` :

```text
version package.json : 0.1.0-alpha.1
tag git : v0.1.0-alpha.1
```

Les tags de préversion créent des GitHub Releases en prerelease. Les tags stables créent des GitHub Releases latest.
