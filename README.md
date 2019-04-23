# react-native-variations

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

Use the `add` command on the cli to add one or more variations, for example: `yarn variation add MyFirstVariation MySecondVariation`.

This will create a `variations/apps.json` with example values and the the default folder structure for each variation:

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
├── my_first_variation/
├── ReactNativeExampleApp/ <--- this one
├── ReactNativeExampleApp-tvOS/
├── ReactNativeExampleApp-tvOSTests/
├── ReactNativeExampleApp.xcodeproj/
├── ReactNativeExampleAppTests/
```

Please note, that this library simply overwrites a folder recursively when switching to another variation, meaning that **it does not remove files belonging to other variations before applying the new variation**.
In other words: It does not support files that are supposed to exist in one variation, but not in the other.

### 3. Editing apps.json

After adding a variation, you need to edit `variations/apps.json` to enter the variation/platform specific BundleIdentifier/ApplicationID, Display Name and Xcode Team. All key/value pairs are mandatory.

### 4. Android App signing

To support switching between different signing key for Android, you need manually add signingConfigs to your `android/app/build.gradle` (see https://facebook.github.io/react-native/docs/signed-apk-android#adding-signing-config-to-your-app-s-gradle-config) for each variation. The signingConfig must have the name of the variation.

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

Everything should be setup now. From now on, you can usethe `switch` command on the cli to switch between variations, for example: `yarn variation switch MySecondVariation`.