# Changelog

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
