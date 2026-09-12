# Configuration

## English

The plugin ships with `config.schema.json`, so Homebridge UI can render the configuration form.

The alpha setup is intentionally explicit:

- configure one X1S hub;
- give it a stable `hubId`;
- enter the X1S activities you want in Apple Home;
- keep activity IDs stable to preserve HomeKit accessories.

## Minimal configuration

```json
{
  "platform": "SofaBatonX1S",
  "name": "SofaBaton X1S",
  "hubIp": "192.168.1.50",
  "hubId": "living-room-x1s",
  "exposureMode": "tv",
  "manualActivities": [
    { "id": 101, "name": "Watch TV" },
    { "id": 102, "name": "Movie" }
  ]
}
```

## Tutorial

1. Add a new platform in Homebridge UI.
2. Select `SofaBatonX1S`.
3. Set `name` to the room or hub name, for example `SofaBaton X1S`.
4. Set `hubIp` to the reserved IP address of the X1S hub.
5. Set `hubId` to a stable lowercase identifier, for example `living-room-x1s`.
6. Keep `exposureMode` set to `tv` for the first test.
7. Add one activity in `manualActivities`.
8. Restart Homebridge.
9. Open Apple Home and find the Television accessory.
10. Select the activity input and confirm the X1S starts the activity.
11. Add the remaining activities once the first one works.

Start with one activity. It is much easier to diagnose one known activity than a full room setup.

## Choosing `exposureMode`

Use `tv` for the normal setup:

```json
"exposureMode": "tv"
```

This creates one Television accessory and exposes activities as inputs.

Use `switches` if your Home app workflow is easier with one switch per activity:

```json
"exposureMode": "switches"
```

Use `both` only if you want both models:

```json
"exposureMode": "both"
```

## Field reference

- `platform`: must be `SofaBatonX1S`.
- `name`: Homebridge and HomeKit display name.
- `hubIp`: X1S hub IP address.
- `hubId`: stable HomeKit identity seed. Do not change it after pairing.
- `discovery`: reserved for discovery behavior. Default: `true`.
- `localListenPort`: local TCP port used for the X1S callback. Default: `8200`.
- `exposureMode`: `tv`, `switches`, or `both`. Default: `tv`.
- `manualActivities`: activities exposed to Apple Home.
- `manualActivities[].id`: X1S activity id.
- `manualActivities[].name`: HomeKit display name.
- `manualActivities[].keyCode`: advanced activation key code. Leave `0` unless X1S testing proves another value is needed.
- `enableAllOff`: enables all-off behavior. Default: `false`.
- `allOffActivityId`: activity id used for all-off when enabled.
- `commandTimeoutSeconds`: command timeout. Default: `8`.
- `debugProtocol`: verbose protocol logs. Default: `false`.

## Francais

Le plugin fournit `config.schema.json`, donc Homebridge UI peut afficher le formulaire de configuration.

La configuration alpha est volontairement explicite :

- configurer un hub X1S ;
- lui donner un `hubId` stable ;
- renseigner les activites X1S a afficher dans Apple Maison ;
- garder les identifiants d'activites stables pour conserver les accessoires HomeKit.

## Configuration minimale

```json
{
  "platform": "SofaBatonX1S",
  "name": "SofaBaton X1S",
  "hubIp": "192.168.1.50",
  "hubId": "salon-x1s",
  "exposureMode": "tv",
  "manualActivities": [
    { "id": 101, "name": "Regarder la TV" },
    { "id": 102, "name": "Film" }
  ]
}
```

## Tutoriel

1. Ajoutez une nouvelle plateforme dans Homebridge UI.
2. Selectionnez `SofaBatonX1S`.
3. Renseignez `name` avec le nom de la piece ou du hub, par exemple `SofaBaton X1S`.
4. Renseignez `hubIp` avec l'adresse IP reservee du hub X1S.
5. Renseignez `hubId` avec un identifiant stable en minuscules, par exemple `salon-x1s`.
6. Gardez `exposureMode` sur `tv` pour le premier test.
7. Ajoutez une seule activite dans `manualActivities`.
8. Redemarrez Homebridge.
9. Ouvrez Apple Maison et trouvez l'accessoire Television.
10. Selectionnez l'entree de l'activite et verifiez que la X1S demarre l'activite.
11. Ajoutez les autres activites quand la premiere fonctionne.

Commencez avec une seule activite. Il est beaucoup plus simple de diagnostiquer une activite connue qu'une configuration complete de salon.

## Choisir `exposureMode`

Utilisez `tv` pour la configuration normale :

```json
"exposureMode": "tv"
```

Cela cree un accessoire Television et expose les activites comme entrees.

Utilisez `switches` si votre usage dans Maison est plus simple avec un interrupteur par activite :

```json
"exposureMode": "switches"
```

Utilisez `both` uniquement si vous voulez les deux modeles :

```json
"exposureMode": "both"
```

## Reference des champs

- `platform` : doit valoir `SofaBatonX1S`.
- `name` : nom affiche dans Homebridge et HomeKit.
- `hubIp` : adresse IP du hub X1S.
- `hubId` : base d'identite HomeKit stable. Ne le changez pas apres l'association.
- `discovery` : reserve au comportement de decouverte. Defaut : `true`.
- `localListenPort` : port TCP local utilise pour le callback X1S. Defaut : `8200`.
- `exposureMode` : `tv`, `switches` ou `both`. Defaut : `tv`.
- `manualActivities` : activites exposees dans Apple Maison.
- `manualActivities[].id` : identifiant d'activite X1S.
- `manualActivities[].name` : nom affiche dans HomeKit.
- `manualActivities[].keyCode` : code avance d'activation. Laissez `0` sauf si les tests X1S prouvent qu'une autre valeur est necessaire.
- `enableAllOff` : active le comportement all-off. Defaut : `false`.
- `allOffActivityId` : identifiant d'activite utilise pour all-off quand active.
- `commandTimeoutSeconds` : delai maximal d'une commande. Defaut : `8`.
- `debugProtocol` : logs de protocole detailles. Defaut : `false`.
