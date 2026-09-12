# Configuration

## English

The plugin ships with `config.schema.json` for Homebridge UI.

The first alpha versions use manual activity mapping. Configure the activities that already exist on your SofaBaton X1S.

## Step-by-step setup

1. Reserve a stable IP address for the X1S hub in your router or DHCP server.
2. Confirm your activities work from the SofaBaton app and remote before adding Homebridge.
3. Add the plugin in Homebridge UI.
4. Set `hubIp` to the X1S hub IP address.
5. Set a stable `hubId`, for example `living-room-x1s`.
6. Add each activity in `manualActivities`.
7. Keep `exposureMode` set to `tv` unless you specifically want switches.
8. Restart Homebridge.
9. In Apple Home, open the Television accessory and select an activity input.

## Minimal example

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

## Switch example

```json
{
  "platform": "SofaBatonX1S",
  "name": "SofaBaton X1S",
  "hubIp": "192.168.1.50",
  "hubId": "living-room-x1s",
  "exposureMode": "both",
  "manualActivities": [
    { "id": 101, "name": "Watch TV" },
    { "id": 102, "name": "Movie" }
  ]
}
```

## Field reference

- `platform`: must be `SofaBatonX1S`.
- `name`: display name for Homebridge and Apple Home.
- `hubIp`: static IP address of the X1S hub.
- `hubId`: stable identifier used for HomeKit UUIDs. Do not change it after pairing.
- `discovery`: reserved for discovery behavior. Defaults to `true`.
- `localListenPort`: local TCP port used while the X1S hub connects back to Homebridge.
- `exposureMode`: `tv`, `switches`, or `both`.
- `manualActivities[].id`: SofaBaton activity id.
- `manualActivities[].name`: HomeKit activity name.
- `manualActivities[].keyCode`: advanced activation key code. Leave `0` unless live testing proves another value is needed.
- `enableAllOff`: optional all-off path. Keep disabled until validated on your X1S.
- `allOffActivityId`: activity id used for all-off.
- `commandTimeoutSeconds`: command timeout.
- `debugProtocol`: enables verbose protocol logs.

## Activity ids

Activity ids are the SofaBaton hub identifiers used by the local protocol. The plugin keeps HomeKit UUIDs stable by deriving them from `hubId` and the activity id, not from the display name.

During alpha testing, activity ids may need to be confirmed with protocol logs or supporting X1S tooling. Once automatic activity catalog support is validated, this manual step should become easier.

## Français

Le plugin fournit un `config.schema.json` pour Homebridge UI.

Les premières versions alpha utilisent une correspondance manuelle des activités. Configurez les activités qui existent déjà sur votre SofaBaton X1S.

## Configuration pas à pas

1. Réservez une adresse IP stable pour le hub X1S dans votre routeur ou serveur DHCP.
2. Vérifiez que vos activités fonctionnent depuis l’app SofaBaton et la télécommande avant d’ajouter Homebridge.
3. Ajoutez le plugin dans Homebridge UI.
4. Renseignez `hubIp` avec l’adresse IP du hub X1S.
5. Renseignez un `hubId` stable, par exemple `salon-x1s`.
6. Ajoutez chaque activité dans `manualActivities`.
7. Gardez `exposureMode` sur `tv`, sauf si vous voulez explicitement des interrupteurs.
8. Redémarrez Homebridge.
9. Dans Apple Maison, ouvrez l’accessoire Television et sélectionnez une activité.

## Exemple minimal

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

## Exemple avec interrupteurs

```json
{
  "platform": "SofaBatonX1S",
  "name": "SofaBaton X1S",
  "hubIp": "192.168.1.50",
  "hubId": "salon-x1s",
  "exposureMode": "both",
  "manualActivities": [
    { "id": 101, "name": "Regarder la TV" },
    { "id": 102, "name": "Film" }
  ]
}
```

## Référence des champs

- `platform` : doit valoir `SofaBatonX1S`.
- `name` : nom affiché dans Homebridge et Apple Maison.
- `hubIp` : adresse IP statique du hub X1S.
- `hubId` : identifiant stable utilisé pour les UUID HomeKit. Ne le changez pas après l’association.
- `discovery` : réservé au comportement de découverte. Vaut `true` par défaut.
- `localListenPort` : port TCP local utilisé pendant que le hub X1S se reconnecte à Homebridge.
- `exposureMode` : `tv`, `switches` ou `both`.
- `manualActivities[].id` : identifiant de l’activité SofaBaton.
- `manualActivities[].name` : nom HomeKit de l’activité.
- `manualActivities[].keyCode` : code avancé d’activation. Laissez `0` sauf si les tests réels prouvent qu’une autre valeur est nécessaire.
- `enableAllOff` : chemin all-off optionnel. Gardez-le désactivé tant qu’il n’est pas validé sur votre X1S.
- `allOffActivityId` : identifiant d’activité utilisé pour all-off.
- `commandTimeoutSeconds` : délai maximal d’une commande.
- `debugProtocol` : active les logs de protocole détaillés.

## Identifiants d’activités

Les identifiants d’activités sont les identifiants du hub SofaBaton utilisés par le protocole local. Le plugin garde les UUID HomeKit stables en les dérivant de `hubId` et de l’identifiant d’activité, pas du nom affiché.

Pendant les tests alpha, les identifiants d’activités peuvent devoir être confirmés avec des logs de protocole ou des outils X1S complémentaires. Quand la lecture automatique du catalogue sera validée, cette étape manuelle devrait devenir plus simple.
