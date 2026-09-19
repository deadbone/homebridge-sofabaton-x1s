# Changelog

## 0.1.0

- First stable release.
- Refreshes HomeKit activity state from the X1S hub so physical remote or SofaBaton app changes update activity switches and the optional Television accessory.
- Parses the X1S active-activity flag from activity catalog rows.
- Serializes X1S local sessions to avoid callback-port conflicts between commands and polling.
- Aligns README and wiki documentation with the current activity switch behavior, stable installation path, and X1S discovery notes.
- Allows an incomplete Homebridge UI configuration to start without publishing accessories until `hubIp` or `manualActivities` are configured.

## 0.1.0-alpha.8

- Parses multiple X1S activity catalog frames from a single TCP packet so activity IDs stay matched to the correct names.

## 0.1.0-alpha.7

- Exposes activity switches by default and keeps the active activity switch on until it is turned off.
- Treats manual activity key code 0 as the X1S POWER_ON command to avoid inert manually entered activities.

## 0.1.0-alpha.6

- Uses the X1S POWER_ON command code when starting activities from HomeKit.

## 0.1.0-alpha.5

- Ignores blank manual activity rows emitted by Homebridge UI during discovery-only setup.

## 0.1.0-alpha.4

- Allows saving a discovery-only Homebridge UI configuration without manual activities.

## 0.1.0-alpha.3

- Completes required HomeKit Television and InputSource characteristics for pairing stability.

## 0.1.0-alpha.2

- Avoids publishing an empty Television accessory when no X1S activities are available.
- Initializes the Television active state and active input identifier from the first discovered or manual activity.

## 0.1.0-alpha.1

- Adds automatic local X1S activity catalog discovery.
- Keeps `manualActivities` as fallback and override entries when discovery is enabled.
- Adds protocol parsing tests based on real X1S activity catalog frames.

## 0.1.0-alpha.0

- Initial alpha implementation for SofaBaton X1S activity control.
- Adds Homebridge dynamic platform registration.
- Adds manual activity configuration, Television exposure, optional momentary switches, and local X1S command framing.
- Adds plugin icon packaging requirement and archive verification.
- Adds CI and npm Trusted Publishing workflow scaffolding for alpha pull-request builds and tagged releases.
- Adds bilingual README and GitHub Wiki setup, configuration, troubleshooting, and npm publishing documentation.
- Ensures prerelease tag publishes use the npm `alpha` dist-tag instead of `latest`.
