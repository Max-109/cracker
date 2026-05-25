const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * React Native Gesture Handler 2.31.x includes optional Reanimated integration
 * sources that still reference Java classes no longer compiled into Reanimated 4.x.
 * SDK 56 builds use Reanimated 4, so force RNGH to compile its no-op integration
 * sources until RNGH/Reanimated publish a compatible matrix update.
 */
function withGestureHandlerReanimatedBuildFix(config) {
    return withDangerousMod(config, [
        'android',
        async (config) => {
            const buildGradlePath = path.join(config.modRequest.projectRoot, 'android/build.gradle');
            const marker = "subprojects { subproject ->\n  if (subproject.name == 'react-native-gesture-handler')";
            const patch = `
subprojects { subproject ->
  if (subproject.name == 'react-native-gesture-handler') {
    subproject.afterEvaluate {
      def androidExt = subproject.extensions.findByName('android')
      if (androidExt != null) {
        def reanimatedSrc = subproject.file('reanimated/src/main/java')
        def noreanimatedSrc = subproject.file('noreanimated/src/main/java')
        androidExt.sourceSets.main.java.srcDirs = androidExt.sourceSets.main.java.srcDirs
          .findAll { it != reanimatedSrc }
          .plus(noreanimatedSrc)
      }
    }
  }
}
`;

            let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
            if (!buildGradle.includes(marker)) {
                buildGradle = buildGradle.replace('\napply plugin: "expo-root-project"', `${patch}\napply plugin: "expo-root-project"`);
                fs.writeFileSync(buildGradlePath, buildGradle);
                console.log('[withGestureHandlerReanimatedBuildFix] Patched Android build.gradle');
            }

            return config;
        },
    ]);
}

module.exports = withGestureHandlerReanimatedBuildFix;
