# VDZ / NovaVolt Solutions Solar Service Triage PWA

This folder is a deployable mobile web app (PWA).

## What it does
- NovaVolt Solutions / VDZ work-provider tracking
- Smart branching phone triage
- Customer / city / system brand / kW / reported issue
- Likely fault family + confidence
- "What to bring" and "what to verify onsite"
- Save calls
- Record actual diagnosis, repair, RMA/case, and return visit
- Calibration dashboard
- Offline support
- Installable on iPhone/Android once hosted on HTTPS
- Optional cloud sync to a Google Sheet through Google Apps Script

## Fastest way to put it online

### Option A — GitHub Pages
1. Create a new GitHub repository, for example `solar-triage`.
2. Upload the contents of this folder to the repository root.
3. In GitHub: Settings -> Pages.
4. Source: Deploy from a branch.
5. Select `main` and `/ (root)`.
6. GitHub will give you a public HTTPS URL.
7. Open that URL on your phone.
8. iPhone: Safari -> Share -> Add to Home Screen.
9. Android: Chrome -> menu -> Install app / Add to Home screen.

### Option B — Netlify
Drag the folder into Netlify Drop. It will give you an HTTPS link.

## Google Sheet cloud sync
The app works without cloud sync, but phone and laptop histories will be separate.

To share the same history:
1. Create a blank Google Sheet.
2. Open Extensions -> Apps Script.
3. Paste the contents of `apps-script-backend.gs`.
4. Deploy -> New deployment -> Web app.
5. Execute as: Me.
6. Choose an access setting that allows the app to reach the web app.
7. Copy the deployed `/exec` URL.
8. Open Solar Triage -> Settings.
9. Paste the Web App URL and tap Save Settings.
10. Tap Push Local Records once, then Pull Cloud Records on your other device.

## Important
The triage result is not a final diagnosis. Verify onsite and follow manufacturer, employer, utility, and electrical-safety requirements.
