# Activity IDs

## English

Activity IDs are the numeric identifiers used by the SofaBaton hub protocol.

In the current alpha, the plugin can read these IDs automatically from the local X1S hub when `hubIp` and `discovery` are configured. Use `0.1.0-alpha.8` or newer so multi-frame catalog responses keep names matched to the correct IDs.

```json
"manualActivities": [
  { "id": 101, "name": "Watch TV" },
  { "id": 102, "name": "Movie" }
]
```

## Why IDs matter

The id is used for two things:

- sending the command to the X1S hub;
- generating stable HomeKit UUIDs.

Changing the id creates a different HomeKit accessory.

## Manual fallback

Use `manualActivities` only when discovery is disabled, discovery fails, or you want to override a discovered name.

Manual entries with the same id replace the discovered activity name.

## Alpha testing workflow

If you use manual entries, use a cautious workflow:

1. Add one activity.
2. Restart Homebridge.
3. Test it in Apple Home.
4. If it starts the wrong activity, correct the id.
5. Add the next activity only after the previous one is correct.

Keep notes of the working id/name pairs for your X1S.

## Identity rule

The plugin preserves the same identity rule for discovered and manual activities: id changes create new accessories, name changes do not.

## Francais

Les identifiants d'activites sont les identifiants numeriques utilises par le protocole du hub SofaBaton.

Dans l'alpha actuelle, le plugin peut lire ces identifiants automatiquement depuis le hub X1S local quand `hubIp` et `discovery` sont configures. Utilisez `0.1.0-alpha.8` ou plus recent pour que les reponses de catalogue multi-trames gardent les noms alignes avec les bons identifiants.

```json
"manualActivities": [
  { "id": 101, "name": "Regarder la TV" },
  { "id": 102, "name": "Film" }
]
```

## Pourquoi les identifiants sont importants

L'identifiant sert a deux choses :

- envoyer la commande au hub X1S ;
- generer des UUID HomeKit stables.

Changer l'identifiant cree un accessoire HomeKit different.

## Secours manuel

Utilisez `manualActivities` uniquement quand la decouverte est desactivee, quand elle echoue, ou quand vous voulez remplacer un nom detecte.

Les entrees manuelles avec le meme id remplacent le nom d'activite detecte.

## Methode conseillee pendant l'alpha

Si vous utilisez des entrees manuelles, utilisez une methode prudente :

1. Ajoutez une seule activite.
2. Redemarrez Homebridge.
3. Testez-la dans Apple Maison.
4. Si elle demarre la mauvaise activite, corrigez l'identifiant.
5. Ajoutez l'activite suivante seulement quand la precedente est correcte.

Gardez une note des couples id/nom qui fonctionnent pour votre X1S.

## Regle d'identite

Le plugin conserve la meme regle d'identite pour les activites detectees et manuelles : changer l'id cree de nouveaux accessoires, changer le nom ne les recree pas.
