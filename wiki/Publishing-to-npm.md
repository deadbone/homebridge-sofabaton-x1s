# Publishing to npm

## English

Do not publish without an explicit release decision.

Publishing is prepared for GitHub Actions Trusted Publishing. Do not create an npm token and do not configure `NODE_AUTH_TOKEN`.

Configure npmjs.com package settings > Trusted Publishing > GitHub Actions with:

- Organization or user: `deadbone`
- Repository: `homebridge-sofabaton-x1s`
- Workflow filename: `publish.yml`
- Environment name: `npm`

Both PR alpha builds and tagged releases use the `npm` GitHub environment, so a single Trusted Publisher configuration covers both paths.

## Local checks

```sh
npm run lint
npm run build
npm test
npm run verify:pack
npm pack --dry-run
```

## PR alpha builds

Internal pull requests can publish temporary alpha packages with the npm `alpha` tag:

```sh
npm install -g homebridge-sofabaton-x1s@alpha
```

Exact versions use:

```text
<next-patch>-alpha.pr.<PR_NUMBER>.<RUN_NUMBER>.<RUN_ATTEMPT>
```

## Tagged releases

The publish workflow accepts tags matching `v*.*.*`.

The tag must match `package.json` exactly:

```text
package.json: 0.1.0-alpha.1
git tag: v0.1.0-alpha.1
```

Prerelease tags publish with the npm `alpha` dist-tag and create prerelease GitHub Releases. Stable tags publish with the npm `latest` dist-tag and create latest GitHub Releases.

## Manual fallback

Use only if Trusted Publishing is not available and publication was explicitly approved:

```sh
npm login
npm run lint
npm run build
npm test
npm run verify:pack
npm pack --dry-run
npm publish --tag alpha
```

## Francais

Ne publiez pas sans decision explicite de release.

La publication est preparee pour GitHub Actions Trusted Publishing. Ne creez pas de token npm et ne configurez pas `NODE_AUTH_TOKEN`.

Configurez les parametres du package sur npmjs.com > Trusted Publishing > GitHub Actions avec :

- Organization or user : `deadbone`
- Repository : `homebridge-sofabaton-x1s`
- Workflow filename : `publish.yml`
- Environment name : `npm`

Les builds alpha de PR et les releases taguees utilisent tous l'environnement GitHub `npm`, donc une seule configuration Trusted Publisher couvre les deux chemins.

## Verifications locales

```sh
npm run lint
npm run build
npm test
npm run verify:pack
npm pack --dry-run
```

## Builds alpha de PR

Les pull requests internes peuvent publier des paquets alpha temporaires avec le tag npm `alpha` :

```sh
npm install -g homebridge-sofabaton-x1s@alpha
```

Les versions exactes utilisent :

```text
<next-patch>-alpha.pr.<PR_NUMBER>.<RUN_NUMBER>.<RUN_ATTEMPT>
```

## Releases taguees

Le workflow de publication accepte les tags correspondant a `v*.*.*`.

Le tag doit correspondre exactement a `package.json` :

```text
package.json : 0.1.0-alpha.1
tag git : v0.1.0-alpha.1
```

Les tags de prerelease publient avec le dist-tag npm `alpha` et creent des GitHub Releases en prerelease. Les tags stables publient avec le dist-tag npm `latest` et creent des GitHub Releases latest.

## Secours manuel

A utiliser uniquement si Trusted Publishing n'est pas disponible et que la publication a ete explicitement approuvee :

```sh
npm login
npm run lint
npm run build
npm test
npm run verify:pack
npm pack --dry-run
npm publish --tag alpha
```
