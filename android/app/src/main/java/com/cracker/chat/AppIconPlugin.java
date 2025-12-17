package com.cracker.chat;

import android.content.ComponentName;
import android.content.pm.PackageManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.HashMap;
import java.util.Map;

@CapacitorPlugin(name = "AppIcon")
public class AppIconPlugin extends Plugin {

    // Map color names to activity-alias class names
    private static final Map<String, String> ICON_ALIASES = new HashMap<String, String>() {{
        put("rose", ".MainActivityRose");
        put("sage", ".MainActivitySage");
        put("lavender", ".MainActivityLavender");
        put("wheat", ".MainActivityWheat");
        put("teal", ".MainActivityTeal");
        put("mauve", ".MainActivityMauve");
        put("coral", ".MainActivityCoral");
    }};

    // Preset colors for "closest color" matching
    private static final Map<String, int[]> PRESET_COLORS = new HashMap<String, int[]>() {{
        put("rose", new int[]{175, 135, 135});      // #af8787
        put("sage", new int[]{135, 175, 135});      // #87af87
        put("lavender", new int[]{135, 135, 175}); // #8787af
        put("wheat", new int[]{175, 175, 135});    // #afaf87
        put("teal", new int[]{135, 175, 175});     // #87afaf
        put("mauve", new int[]{175, 135, 175});    // #af87af
        put("coral", new int[]{255, 107, 107});    // #ff6b6b
    }};

    @PluginMethod
    public void setIcon(PluginCall call) {
        String colorHex = call.getString("color");
        if (colorHex == null) {
            call.reject("Color is required");
            return;
        }

        // Find closest preset color
        String closestColor = findClosestPreset(colorHex);
        String aliasName = ICON_ALIASES.get(closestColor);
        
        if (aliasName == null) {
            call.reject("Unknown color: " + closestColor);
            return;
        }

        try {
            PackageManager pm = getContext().getPackageManager();
            String packageName = getContext().getPackageName();

            // Disable all aliases first
            for (String alias : ICON_ALIASES.values()) {
                ComponentName cn = new ComponentName(packageName, packageName + alias);
                pm.setComponentEnabledSetting(cn,
                    PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                    PackageManager.DONT_KILL_APP);
            }

            // Enable the selected alias
            ComponentName selectedCn = new ComponentName(packageName, packageName + aliasName);
            pm.setComponentEnabledSetting(selectedCn,
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP);

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("icon", closestColor);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to change icon: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getCurrentIcon(PluginCall call) {
        try {
            PackageManager pm = getContext().getPackageManager();
            String packageName = getContext().getPackageName();
            
            for (Map.Entry<String, String> entry : ICON_ALIASES.entrySet()) {
                ComponentName cn = new ComponentName(packageName, packageName + entry.getValue());
                int state = pm.getComponentEnabledSetting(cn);
                if (state == PackageManager.COMPONENT_ENABLED_STATE_ENABLED ||
                    (state == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT && entry.getKey().equals("rose"))) {
                    JSObject result = new JSObject();
                    result.put("icon", entry.getKey());
                    call.resolve(result);
                    return;
                }
            }
            
            // Default to rose
            JSObject result = new JSObject();
            result.put("icon", "rose");
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to get current icon: " + e.getMessage());
        }
    }

    private String findClosestPreset(String hexColor) {
        // Parse hex color
        String hex = hexColor.replace("#", "");
        int r = Integer.parseInt(hex.substring(0, 2), 16);
        int g = Integer.parseInt(hex.substring(2, 4), 16);
        int b = Integer.parseInt(hex.substring(4, 6), 16);

        String closest = "rose";
        double minDistance = Double.MAX_VALUE;

        for (Map.Entry<String, int[]> entry : PRESET_COLORS.entrySet()) {
            int[] preset = entry.getValue();
            double distance = Math.sqrt(
                Math.pow(r - preset[0], 2) +
                Math.pow(g - preset[1], 2) +
                Math.pow(b - preset[2], 2)
            );
            if (distance < minDistance) {
                minDistance = distance;
                closest = entry.getKey();
            }
        }

        return closest;
    }
}
