const path = require("node:path");
const expoPackagePath = require.resolve("expo/package.json");
const configPluginsPath = require.resolve("@expo/config-plugins", {
  paths: [path.dirname(expoPackagePath)],
});
const { withAppBuildGradle } = require(configPluginsPath);

function withReleaseSigning(config) {
  return withAppBuildGradle(config, (modConfig) => {
    let contents = modConfig.modResults.contents;

    if (contents.includes("FUCHSIA_RELEASE_STORE_FILE")) {
      return modConfig;
    }

    const signingConfigBoundary = "        }\n    }\n    buildTypes {";
    if (!contents.includes(signingConfigBoundary)) {
      throw new Error("withReleaseSigning: could not locate Android signingConfigs block");
    }

    const releaseSigningConfig = [
      "        }",
      "        release {",
      "            def releaseStoreFile = System.getenv('FUCHSIA_RELEASE_STORE_FILE')",
      "            if (releaseStoreFile) {",
      "                storeFile file(releaseStoreFile)",
      "                storePassword System.getenv('FUCHSIA_RELEASE_STORE_PASSWORD')",
      "                keyAlias System.getenv('FUCHSIA_RELEASE_KEY_ALIAS')",
      "                keyPassword System.getenv('FUCHSIA_RELEASE_KEY_PASSWORD')",
      "            }",
      "        }",
      "    }",
      "    buildTypes {",
    ].join("\n");
    contents = contents.replace(signingConfigBoundary, releaseSigningConfig);

    const buildTypesStart = contents.indexOf("    buildTypes {");
    const releaseStart = contents.indexOf("        release {", buildTypesStart);
    const releaseEnd = contents.indexOf("\n        }", releaseStart);
    if (buildTypesStart < 0 || releaseStart < 0 || releaseEnd < 0) {
      throw new Error("withReleaseSigning: could not locate Android release build type");
    }

    const releaseBlock = contents.slice(releaseStart, releaseEnd);
    const defaultDebugSigner = "signingConfig signingConfigs.debug";
    if (!releaseBlock.includes(defaultDebugSigner)) {
      throw new Error("withReleaseSigning: expected Expo's default release signer was not found");
    }
    contents = contents.slice(0, releaseStart)
      + releaseBlock.replace(defaultDebugSigner, "signingConfig signingConfigs.release")
      + contents.slice(releaseEnd);

    modConfig.modResults.contents = contents;
    return modConfig;
  });
}

module.exports = withReleaseSigning;
