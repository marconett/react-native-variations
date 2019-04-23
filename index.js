#!/usr/bin/env node

const commander = require('commander');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const xcode = require('xcode');
const plist = require('plist');
const cpr = require('cpr');
const replace = require('replace-in-file');

const { defaultConfig } = require('./defaultConfig');
// const { jsonFormater } = require('./utils');

const rootDir = 'variations/';
const confFile = 'apps.json';
const iosVariationTargetDir = 'main_target';

const handleError = (err) => {
  console.error();
  console.error(err.message || err);
  console.error();
  if (err.stack) {
    console.error(err.stack);
    console.error();
  }
  process.exit(1);
};

const readJsonFile = (file) => {
  // read apps from file
  try {
    var apps = fs.readFileSync(file).toString();
  } catch (err) {
    handleError('ERROR: Could not find apps.json');
  }

  // parse file content
  try {
    return JSON.parse(apps);
  } catch (err) {
    handleError('ERROR: Could not parse apps.json');
  }
};

const getDirs = p => fs.readdirSync(p).filter(f => fs.statSync(path.join(p, f)).isDirectory());
const getFiles = p => fs.readdirSync(p).filter(f => fs.statSync(path.join(p, f)).isFile());

const getPathToXcodeProject = () => {
  let base = 'ios/';
  let projectPath = getDirs(base).find(dir => dir.endsWith('.xcodeproj'))+'/';
  let file = getFiles(base+projectPath).find(file => file.endsWith('.pbxproj'));

  return base+projectPath+file;
};

const getPathToTarget = (targetName) => {
  let base = 'ios/';
  let targetPath = getDirs(base).find(dir => dir === targetName)+'/';

  return base+targetPath;
};


const switchTo = (variation) => {
  let apps = readJsonFile(rootDir+confFile);
  let app = apps.find(app => app.name == variation);

  if (!app) {
    handleError('Variation "'+variation+'" does not exist.');
  }

  console.log('Switching to "' + variation + '" with:');
  console.log(JSON.stringify(app, null, 2));

  let iosPath = rootDir+variation+'/ios/';
  let androidPath = rootDir+variation+'/android/';
  let srcPath = rootDir+variation+'/src/';

  runiOS(app, iosPath);

  syncAndroid(androidPath);
  runAndroid(app);
  androidSigning(app);

  syncSrc(srcPath);

  console.log('Done.');
};

const runiOS = (app, srcVariationPath) => {
  let projectPath = getPathToXcodeProject();
  let project = xcode.project(projectPath);

  project.parse(function (err) {
    if(err) {
      handleError('ERROR: Could not parse '+projectPath);
    }

    // Take the first targets name
    let projName = project.getFirstTarget().firstTarget.name;

    if (projName) {
      // alter Info.plist
      let targetPath = getPathToTarget(projName);
      let infoPlist = targetPath+'Info.plist';

      var obj = plist.parse(fs.readFileSync(infoPlist, 'utf8'));
      obj.CFBundleDisplayName = app.ios.displayName;

      fs.writeFileSync(infoPlist, plist.build(obj), function(err) {
        if(err) {
          handleError('ERROR: Could not write '+infoPlist);
        }
      });

      // sync files
      synciOS(srcVariationPath, targetPath);

    } else {
      handleError('Could not determin the iOS projects main target.');
    }

    // Alter Xcode project
    project.updateBuildProperty('PRODUCT_BUNDLE_IDENTIFIER', '"' + app.ios.id + '"');
    project.updateBuildProperty('DEVELOPMENT_TEAM', '"' + app.ios.xcodeTeam + '"');

    fs.writeFileSync(projectPath, project.writeSync(), function(err) {
      if(err) {
        handleError('ERROR: Could not write '+projectPath);
      }
    });
  });
};

const synciOS = (srcVariationPath, targetPath) => {
  let options = {
    overwrite: true,
    filter: new RegExp(iosVariationTargetDir)
  };

  cpr(srcVariationPath, 'ios/', options, function(err) {
    if (err) {
      handleError('Error copying files from "'+srcVariationPath+'" to "ios/"');
    }
  });

  cpr(srcVariationPath+iosVariationTargetDir, targetPath, {overwrite: true}, function(err) {
    if (err) {
      handleError('Error copying files from "'+srcVariationPath+iosVariationTargetDir+'" to "'+targetPath+'"');
    }
  });
};

const syncAndroid = (srcVariationPath) => {
  let targetPath = 'android/';

  cpr(srcVariationPath, targetPath, {overwrite: true}, function(err) {
    if (err) {
      handleError('Error copying files from "'+srcVariationPath+'" to "'+targetPath+'"');
    }
  });
};


const androidSigning = (app) => {
  const options = {
    files: 'android/app/build.gradle',
    from: /signingConfig signingConfigs.*$/gm,
    to: 'signingConfig signingConfigs.'+app.name,
  };

  try {
    replace.sync(options);
  }
  catch (error) {
    console.warn('WARNING: Could not change android signing config');
  }
};

const runAndroid = (app) => {
  let android = spawnSync('node_modules/react-native-rename/lib/index.js', [app.android.displayName, '-b', app.android.id]);
  if (android.status || android.error) {
    console.error('ERROR: Could not clean android project.');
    handleError(android.error || android.stderr.toString('utf8'));
  }

  // Android Clean
  let clean = spawnSync('./gradlew', ['clean'], { cwd: 'android' });
  if (clean.status || clean.error) {
    console.error('ERROR: Could not clean android project.');
    handleError(clean.error || clean.stderr.toString('utf8'));
  }
};

const syncSrc = (srcVariationPath) => {
  let targetPath = 'src/';

  cpr(srcVariationPath, targetPath, {overwrite: true}, function(err) {
    if (err) {
      handleError('Error copying files from "'+srcVariationPath+'" to "'+targetPath+'"');
    }
  });
};

const createVariation = (variation) => {
  let config;

  // create folder
  if (!fs.existsSync(rootDir+variation)) {
    fs.mkdirSync(rootDir+variation+'/android/', { recursive: true });
    fs.mkdirSync(rootDir+variation+'/ios/'+iosVariationTargetDir, { recursive: true });
    fs.mkdirSync(rootDir+variation+'/src/', { recursive: true });

    if (fs.existsSync(rootDir+confFile)) {
      let apps = readJsonFile(rootDir+confFile);

      if (!apps.some(app => app.name == variation)) {
        config = defaultConfig;
        config.name = variation;
        apps.push(config);
        fs.writeFileSync(rootDir+confFile, JSON.stringify(apps, null, 2), function(err) {
          if(err) {
            handleError('ERROR: Could not write apps.json');
          }
        });
      } else {
        console.warn('WARNING: variation "%s" already exists in apps.json but it had no folder. folder was recreated with default contents.', variation);
      }
    } else {
      // create file
      config = defaultConfig;
      config.name = variation;
      fs.writeFileSync(rootDir+confFile, JSON.stringify([config], null, 2), function(err) {
        if(err) {
          handleError('ERROR: Could not write apps.json');
        }
      });
    }

    console.log('Created variation "%s"', variation);
  } else {
    console.log('variation "%s" exists, skipping..', variation);
  }
};




// Commands
commander
  .command('switch <variation>')
  .description('Switch the project to a given variation.')
  .action(function runAction(variation) {

    Promise.resolve()
      .then(() => {
        switchTo(variation);
      })
      .catch(handleError);
  });

commander
  .command('add <variation> [otherVariations...]')
  .description('Add given variations.')
  .action(function runAction(variation, otherVariations) {
    Promise.resolve()
      .then(() => {
        createVariation(variation);
        if (otherVariations) {
          otherVariations.forEach(function (variation) {
            createVariation(variation);
          });
        }
      })
      .catch(handleError);
  });

// error on unknown commands
commander.on('command:*', function () {
  console.error('Invalid command: %s\n', commander.args.join(' '));
  commander.help();
  process.exit(1);
});

commander.parse(process.argv);

if (!commander.args.length) {
  commander.help();
}