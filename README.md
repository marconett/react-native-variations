# react-native-variations

Create variations of (whitelabel) apps and switch between variation-specific files and metadata using the command line.

## Installation
```
# Using npm
npm i --save-dev react-native-variations

# Using yarn
yarn add --dev react-native-variations

# Add the following to your package.json
"scripts": {
  "variation": "node_modules/react-native-variations/index.js"
},
```

## Usage Example

### 1. Adding variations

Use the `add` command on the cli to add one or more variations, for example:
`yarn variation add MyFirstVariation MySecondVariation`

This will create a `variations/apps.json` with example values and the default folder structure for each variation:

```
  variations/
  ├── apps.json
  ├── MyFirstVariation/
  │   ├── android/
  │   ├── ios/
  │   │   └── main_target/
  │   └── src/
  ├── MySecondVariation/
  │   ├── android/
  │   ├── ios/
  │   │   └── main_target/
  │   └── src/
```

### 2. Application specific files

You can fill the android, ios and src folder with files that are specific to that variation. **If you do, beware that those files now live in those folders, as the original files now get overwritten on variation switch.**

The `ios/main_target/` folder is a bit special, as it resolves to the main Xcode buildtarget folder, i.e.:

```
ios/
├── ReactNativeExampleApp/ <--- this one
├── ReactNativeExampleApp-tvOS/
├── ReactNativeExampleApp-tvOSTests/
├── ReactNativeExampleApp.xcodeproj/
├── ReactNativeExampleAppTests/
```

Please note, that this library simply overwrites a folder recursively when switching to another variation, meaning that **it does not remove files belonging to other variations before applying the new variation**.
In other words: It does not support files that are supposed to exist in one variation, but not in the other.

### 3. Editing apps.json

After adding a variation, you need to edit `variations/apps.json` to enter the variation/platform specific BundleIdentifier/ApplicationID, Display Name and Xcode Team. All key/value pairs are mandatory with the exception of `ios.urlScheme`.

Defining `ios.urlScheme` sets *Identifier* and *URL Schemes* of your first URL Type (see [Apple Docs](https://developer.apple.com/documentation/uikit/core_app/allowing_apps_and_websites_to_link_to_your_content/defining_a_custom_url_scheme_for_your_app#3020456)).
To do the same with Android, for now please just create a variation of `AndroidManifest.xml` (i.e. `variations/MyFirstVariation/android/app/src/main/AndroidManifest.xml`)

### 4. Android App signing

To support switching between different signing key for Android, you need manually add *signingConfigs* to your `android/app/build.gradle` (see [React Native Docs](https://facebook.github.io/react-native/docs/signed-apk-android#adding-signing-config-to-your-app-s-gradle-config)) for each variation. The signingConfig must have the name of the variation.

For example:

```
signingConfigs {
    MyFirstVariation {
        keyAlias 'MyFirstVariation'
        keyPassword 'password123'
        storeFile file('./keystores/first.jks')
        storePassword 'password123'
    }
    MySecondVariation {
        keyAlias 'MySecondVariation'
        keyPassword 'password234'
        storeFile file('./keystores/second.jks')
        storePassword 'password234'
    }
}
```

### 5. Switching between variations

Everything should be setup now. From now on, you can use the `switch` command on the cli to switch between variations, for example:
`yarn variation switch MySecondVariation`


## Other libraries / motivation

There are other libraries with a similar goals out there:

* [White Label App](https://github.com/hazmi/white-label-app)
* [React Native White-label](https://github.com/welldsagl/create-white-label-app)
* [MajoraJS](https://github.com/SperaHealth/majora)
* [React Native continuous integration tools](https://github.com/najeeb-rifaat/react-native-ci-tools)

However, I wanted leave my js code untouched. I usually maintain a `config.js` file with constants, texts, colors and feature toggles, which is the only file that is variation specific. The other libraries also don't focus on the release side of things like being able to switch between app logos, Application IDs and names.


## Improvements, caveats, todos

* Simply copying files seems a bit crude. Using symlinks might be the way to go.
* This is currently not really optimized to keep a clean git repo.
* IDs and display names are not validate for platform specific format requirements.
* The react-native-rename dependency should be replaced.
* Manage AndroidManifest.xml.