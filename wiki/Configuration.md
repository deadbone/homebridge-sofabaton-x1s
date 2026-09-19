# Configuration

## English

The plugin ships with `config.schema.json`, so Homebridge UI can render the configuration form.

The setup is intentionally explicit:

- configure one X1S hub;
- give it a stable `hubId`;
- let the plugin discover X1S activities automatically;
- keep activity IDs stable to preserve HomeKit accessories.

## Minimal configuration

```json
{
  "platform": "SofaBatonX1S",
  "name": "SofaBaton X1S",
  "hubIp": "192.168.1.50",
  "hubId": "living-room-x1s",
  "exposureMode": "switches",
  "discovery": true
}
```

## Tutorial

1. Add a new platform in Homebridge UI.
2. Select `SofaBatonX1S`.
3. Set `name` to the room or hub name, for example `SofaBaton X1S`.
4. Set `hubIp` to the reserved IP address of the X1S hub.
5. Set `hubId` to a stable lowercase identifier, for example `living-room-x1s`.
6. Keep `exposureMode` set to `switches` for the first test.
7. Keep `discovery` enabled.
8. Restart Homebridge.
9. Open Apple Home and find one switch per SofaBaton activity.
10. Turn on each discovered activity switch and confirm the X1S starts the expected activity.

If discovery fails, add one manual activity first. It is much easier to diagnose one known activity than a full room setup.

## Choosing `exposureMode`

Use `switches` for the normal setup:

```json
"exposureMode": "switches"
```

This creates one persistent switch per activity and is the recommended first setup.

Use `tv` if you also want a Television accessory with activities exposed as inputs:

```json
"exposureMode": "tv"
```

Use `both` only as the legacy alias of `tv`:

```json
"exposureMode": "both"
```

## Field reference

- `platform`: must be `SofaBatonX1S`.
- `name`: Homebridge and HomeKit display name.
- `hubIp`: X1S hub IP address.
- `hubId`: stable HomeKit identity seed. Do not change it after pairing.
- `discovery`: reads the local X1S activity catalog automatically. Default: `true`.
- `localListenPort`: local TCP port used for the X1S callback. Default: `8200`.
- `pollIntervalSeconds`: seconds between current-activity state refreshes. Default: `60`.
- `exposureMode`: `switches`, `tv`, or `both`. Default: `switches`. Activity switches are always exposed; `tv` and `both` also add a Television accessory.
- `manualActivities`: optional fallback or overrides for discovered activities.
- `manualActivities[].id`: X1S activity id.
- `manualActivities[].name`: HomeKit display name.
- `manualActivities[].keyCode`: advanced activation key code. `0` and empty values use the X1S `POWER_ON` command.
- `enableAllOff`: enables all-off behavior. Default: `false`.
- `allOffActivityId`: activity id used for all-off when enabled.
- `commandTimeoutSeconds`: command timeout. Default: `8`.
- `retryIntervalSeconds`: advanced retry interval accepted by the configuration. The current stable plugin does not run a dedicated automatic retry loop yet. Default: `30`.
- `debugProtocol`: verbose protocol logs. Default: `false`.
- `assumeX1S`: development fallback only. Do not enable it to claim support for other SofaBaton models.

## Francais

Le plugin fournit `config.schema.json`, donc Homebridge UI peut afficher le formulaire de configuration.

La configuration est volontairement explicite :

- configurer un hub X1S ;
- lui donner un `hubId` stable ;
- laisser le plugin detecter automatiquement les activites X1S ;
- garder les identifiants d'activites stables pour conserver les accessoires HomeKit.

## Configuration minimale

```json
{
  "platform": "SofaBatonX1S",
  "name": "SofaBaton X1S",
  "hubIp": "192.168.1.50",
  "hubId": "salon-x1s",
  "exposureMode": "switches",
  "discovery": true
}
```

## Tutoriel

1. Ajoutez une nouvelle plateforme dans Homebridge UI.
2. Selectionnez `SofaBatonX1S`.
3. Renseignez `name` avec le nom de la piece ou du hub, par exemple `SofaBaton X1S`.
4. Renseignez `hubIp` avec l'adresse IP reservee du hub X1S.
5. Renseignez `hubId` avec un identifiant stable en minuscules, par exemple `salon-x1s`.
6. Gardez `exposureMode` sur `switches` pour le premier test.
7. Gardez `discovery` active.
8. Redemarrez Homebridge.
9. Ouvrez Apple Maison et trouvez un interrupteur par activite SofaBaton.
10. Allumez chaque interrupteur d'activite detectee et verifiez que la X1S demarre l'activite attendue.

Si la decouverte echoue, ajoutez d'abord une seule activite manuelle. Il est beaucoup plus simple de diagnostiquer une activite connue qu'une configuration complete de salon.

## Choisir `exposureMode`

Utilisez `switches` pour la configuration normale :

```json
"exposureMode": "switches"
```

Cela cree un interrupteur persistant par activite et c'est la configuration recommandee pour le premier test.

Utilisez `tv` si vous voulez aussi un accessoire Television avec les activites exposees comme entrees :

```json
"exposureMode": "tv"
```

Utilisez `both` seulement comme alias historique de `tv` :

```json
"exposureMode": "both"
```

## Reference des champs

- `platform` : doit valoir `SofaBatonX1S`.
- `name` : nom affiche dans Homebridge et HomeKit.
- `hubIp` : adresse IP du hub X1S.
- `hubId` : base d'identite HomeKit stable. Ne le changez pas apres l'association.
- `discovery` : lit automatiquement le catalogue d'activites X1S local. Defaut : `true`.
- `localListenPort` : port TCP local utilise pour le callback X1S. Defaut : `8200`.
- `pollIntervalSeconds` : delai en secondes entre deux rafraichissements de l'activite active. Defaut : `60`.
- `exposureMode` : `switches`, `tv` ou `both`. Defaut : `switches`. Les interrupteurs d'activites sont toujours exposes ; `tv` et `both` ajoutent aussi un accessoire Television.
- `manualActivities` : secours optionnel ou surcharge des activites detectees.
- `manualActivities[].id` : identifiant d'activite X1S.
- `manualActivities[].name` : nom affiche dans HomeKit.
- `manualActivities[].keyCode` : code avance d'activation. `0` et les valeurs vides utilisent la commande X1S `POWER_ON`.
- `enableAllOff` : active le comportement all-off. Defaut : `false`.
- `allOffActivityId` : identifiant d'activite utilise pour all-off quand active.
- `commandTimeoutSeconds` : delai maximal d'une commande. Defaut : `8`.
- `retryIntervalSeconds` : intervalle de reessai avance accepte par la configuration. La version stable actuelle ne lance pas encore de boucle de reessai automatique dediee. Defaut : `30`.
- `debugProtocol` : logs de protocole detailles. Defaut : `false`.
- `assumeX1S` : option de developpement uniquement. Ne l'activez pas pour revendiquer la prise en charge d'autres modeles SofaBaton.
