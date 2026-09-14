import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const android = path.join(root, 'android');
if (!fs.existsSync(android)) throw new Error('android/ does not exist. Run npm run android:init first.');

const app = path.join(android, 'app');
const src = path.join(app, 'src', 'main');
const javaDir = path.join(src, 'java', 'com', 'alfarajia', 'platform');
fs.mkdirSync(javaDir, { recursive: true });

const buildGradle = path.join(app, 'build.gradle');
let gradle = fs.readFileSync(buildGradle, 'utf8');
const dep = "    implementation 'androidx.work:work-runtime:2.10.1'";
if (!gradle.includes("androidx.work:work-runtime")) {
  gradle = gradle.replace(/dependencies\\s*\\{/, m => m + `\n${dep}`);
  fs.writeFileSync(buildGradle, gradle);
}

const manifest = path.join(src, 'AndroidManifest.xml');
let xml = fs.readFileSync(manifest, 'utf8');
const permissions = [
  '<uses-permission android:name="android.permission.INTERNET" />',
  '<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />',
  '<uses-permission android:name="android.permission.CAMERA" />',
  '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
  '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
  '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />'
];
for (const p of permissions) if (!xml.includes(p)) xml = xml.replace('<manifest', `<manifest\n    ${p}`);
fs.writeFileSync(manifest, xml);

const plugin = `package com.alfarajia.platform;\n\nimport android.content.Context;\nimport androidx.annotation.NonNull;\nimport androidx.work.Constraints;\nimport androidx.work.ExistingWorkPolicy;\nimport androidx.work.NetworkType;\nimport androidx.work.OneTimeWorkRequest;\nimport androidx.work.WorkManager;\nimport com.getcapacitor.JSObject;\nimport com.getcapacitor.Plugin;\nimport com.getcapacitor.PluginCall;\nimport com.getcapacitor.annotation.CapacitorPlugin;\nimport com.getcapacitor.PluginMethod;\nimport org.json.JSONArray;\nimport org.json.JSONObject;\n\n@CapacitorPlugin(name = "AlfarajiaSync")\npublic class AlfarajiaSyncPlugin extends Plugin {\n  static final String PREFS = "alfarajia_offline_sync";\n  static final String QUEUE = "queue";\n\n  @Override public void load() {\n    super.load();\n    schedule(getContext());\n  }\n\n  @PluginMethod\n  public void queueWrite(PluginCall call) {\n    String key = call.getString("key", "");\n    if (key == null || key.trim().isEmpty()) { call.reject("Missing key"); return; }\n    String value = call.getString("value", null);\n    synchronized (AlfarajiaSyncPlugin.class) {\n      try {\n        android.content.SharedPreferences sp = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);\n        JSONArray old = new JSONArray(sp.getString(QUEUE, "[]"));\n        JSONArray next = new JSONArray();\n        for (int i=0;i<old.length();i++) {\n          JSONObject item = old.getJSONObject(i);\n          if (!key.equals(item.optString("key"))) next.put(item);\n        }\n        JSONObject item = new JSONObject(); item.put("key", key);\n        if (value == null) item.put("value", JSONObject.NULL); else item.put("value", value);\n        item.put("queuedAt", System.currentTimeMillis());\n        next.put(item);\n        sp.edit().putString(QUEUE, next.toString()).apply();\n        schedule(getContext());\n        call.resolve();\n      } catch (Exception e) { call.reject("Queue failed", e); }\n    }\n  }\n\n  @PluginMethod\n  public void flushNow(PluginCall call) {\n    schedule(getContext());\n    call.resolve();\n  }\n\n  static void schedule(Context context) {\n    Constraints c = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();\n    OneTimeWorkRequest req = new OneTimeWorkRequest.Builder(AlfarajiaSyncWorker.class).setConstraints(c).build();\n    WorkManager.getInstance(context).enqueueUniqueWork("alfarajia-offline-sync", ExistingWorkPolicy.REPLACE, req);\n  }\n}\n`;
fs.writeFileSync(path.join(javaDir, 'AlfarajiaSyncPlugin.java'), plugin);

const worker = `package com.alfarajia.platform;\n\nimport android.content.Context;\nimport androidx.annotation.NonNull;\nimport androidx.work.Worker;\nimport androidx.work.WorkerParameters;\nimport org.json.JSONArray;\nimport org.json.JSONObject;\nimport java.io.BufferedReader;\nimport java.io.InputStreamReader;\nimport java.io.OutputStream;\nimport java.net.HttpURLConnection;\nimport java.net.URL;\n\npublic class AlfarajiaSyncWorker extends Worker {\n  private static final String API_KEY = "AIzaSyBWPHnFrcC2NiRpHk8MB9ZEk_EghH-_Phc";\n  private static final String DB = "https://alfarajia2027-80fdd-default-rtdb.firebaseio.com";\n  private static final String PREFS = "alfarajia_offline_sync";\n  private static final String QUEUE = "queue";\n\n  public AlfarajiaSyncWorker(@NonNull Context appContext, @NonNull WorkerParameters params) { super(appContext, params); }\n\n  @NonNull @Override public Result doWork() {\n    try {\n      android.content.SharedPreferences sp = getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);\n      JSONArray queue = new JSONArray(sp.getString(QUEUE, "[]"));\n      if (queue.length() == 0) return Result.success();\n      String token = anonymousToken();\n      if (token == null || token.isEmpty()) return Result.retry();\n      for (int i=0;i<queue.length();i++) {\n        JSONObject item = queue.getJSONObject(i);\n        String key = item.optString("key", "");\n        if (key.isEmpty()) continue;\n        String encoded = key.replace("%", "%25").replace("/", "%2F").replace(" ", "%20");\n        Object val = item.opt("value");\n        String url = DB + "/schoolPlatformState/" + encoded + ".json?auth=" + token;\n        int code;\n        if (val == null || val == JSONObject.NULL) code = request(url, "DELETE", null);\n        else code = request(url, "PUT", String.valueOf(val));\n        if (code < 200 || code >= 300) return Result.retry();\n      }\n      sp.edit().putString(QUEUE, "[]").apply();\n      return Result.success();\n    } catch (Exception e) { return Result.retry(); }\n  }\n\n  private String anonymousToken() throws Exception {\n    URL u = new URL("https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" + API_KEY);\n    HttpURLConnection c=(HttpURLConnection)u.openConnection(); c.setRequestMethod("POST"); c.setDoOutput(true); c.setRequestProperty("Content-Type","application/json");\n    byte[] body = "{\\"returnSecureToken\\":true}".getBytes(java.nio.charset.StandardCharsets.UTF_8);\n    try(OutputStream os=c.getOutputStream()){os.write(body);}\n    if(c.getResponseCode()<200 || c.getResponseCode()>=300) return null;\n    return read(c).optString("idToken", "");\n  }\n\n  private int request(String url,String method,String body) throws Exception {\n    HttpURLConnection c=(HttpURLConnection)new URL(url).openConnection(); c.setRequestMethod(method); c.setConnectTimeout(15000); c.setReadTimeout(20000);\n    if(body!=null){c.setDoOutput(true);c.setRequestProperty("Content-Type","application/json");try(OutputStream os=c.getOutputStream()){os.write(body.getBytes(java.nio.charset.StandardCharsets.UTF_8));}}\n    return c.getResponseCode();\n  }\n  private JSONObject read(HttpURLConnection c) throws Exception {\n    BufferedReader r=new BufferedReader(new InputStreamReader(c.getInputStream(),java.nio.charset.StandardCharsets.UTF_8)); StringBuilder s=new StringBuilder(); String line; while((line=r.readLine())!=null)s.append(line); return new JSONObject(s.toString());\n  }\n}\n`;
fs.writeFileSync(path.join(javaDir, 'AlfarajiaSyncWorker.java'), worker);

const activity = path.join(javaDir, 'MainActivity.java');
const main = `package com.alfarajia.platform;\n\nimport android.os.Bundle;\nimport com.getcapacitor.BridgeActivity;\n\npublic class MainActivity extends BridgeActivity {\n  @Override public void onCreate(Bundle savedInstanceState) {\n    registerPlugin(AlfarajiaSyncPlugin.class);\n    super.onCreate(savedInstanceState);\n  }\n}\n`;
fs.writeFileSync(activity, main);
console.log('Android native offline sync layer prepared.');
